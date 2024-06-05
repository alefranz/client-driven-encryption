using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace WebApplication1.Middleware;

public class ClientDrivenEncryptionMiddleware : IMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!context.Request.Headers.TryGetValue("Client-Encryption-Key", out var header))
        {
            await next(context);
            return;
        }
        
        var bodyStream = context.Response.Body;

        using var readableResponseStream = new MemoryStream();
        context.Response.Body = readableResponseStream;

        await next(context);

        readableResponseStream.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(readableResponseStream).ReadToEndAsync();

        var key = header.FirstOrDefault();
        var encryptedBody = Encrypt(responseBody, key!);

        using var rewrittenStream = new MemoryStream();
        await using var sw = new StreamWriter(rewrittenStream);
        await sw.WriteAsync(encryptedBody);
        await sw.FlushAsync();

        rewrittenStream.Seek(0, SeekOrigin.Begin);
        await rewrittenStream.CopyToAsync(bodyStream);

        context.Response.Body = bodyStream;
    }

    private static string Encrypt(string body, string publicKey)
    {
        var fromBase64String = Convert.FromBase64String(publicKey);
        var asString = Encoding.UTF8.GetString(fromBase64String);
        var jsonWebKey = JsonSerializer.Deserialize<JsonWebKey>(asString);
        
        var rsaParameters = new RSAParameters
        {
            Exponent = DecodeUrlBase64(jsonWebKey.e),
            Modulus = DecodeUrlBase64(jsonWebKey.n)
        };
        
        var dataToEncrypt = Encoding.UTF8.GetBytes(body);
        dataToEncrypt = "Hello, World!"u8.ToArray();
        
        var rsaCryptoServiceProvider = new RSACryptoServiceProvider(2048);
        rsaCryptoServiceProvider.ImportParameters(rsaParameters);
        rsaCryptoServiceProvider.PersistKeyInCsp = false;
        
        var value = rsaCryptoServiceProvider.Encrypt(dataToEncrypt, RSAEncryptionPadding.Pkcs1);
        
        Console.WriteLine("Sending byte array: " + string.Join(", ", value));

        return Convert.ToBase64String(value);
    }

    private static byte[] DecodeUrlBase64(string s)
    {
        s = s.Replace(' ', '+').Replace('-', '+').Replace('_', '/').PadRight(4*((s.Length+3)/4),'=');
        return Convert.FromBase64String(s);
    }
}

public record JsonWebKey
{
    public string alg { get; set; }
    public string e { get; set; }
    public bool ext { get; set; }
    public string[] key_ops { get; set; }
    public string kty { get; set; }
    public string n { get; set; }

    public override string ToString() => JsonSerializer.Serialize(this);
}