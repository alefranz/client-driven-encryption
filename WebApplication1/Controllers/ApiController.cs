using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace WebApplication1.Controllers;

[ApiController]
public class ApiController(ServerKeyStore serverKeyStore, ClientKeysStore clientKeysStore)
{
    [HttpGet("/api")]
    public MyResponseDto Get()
    {
        return new MyResponseDto
        {
            SomeNormalProperty = "foo",
            SomeSensitiveProperty = "bar"
        };
    }

	[HttpPost("/api/dh")]
	public string PostDH([FromBody] string clientPublicKey)
	{
		var derivedKey = DeriveKey(clientPublicKey);
		clientKeysStore.Add(derivedKey);
		return derivedKey.ServerPublicKeyB64;
	}

	[HttpPost("/api")]
	public object Post([FromHeader(Name = "Client-Public-Key")] string clientPublicKey, [FromHeader(Name = "IV")] string iv, [FromBody] string data)
	{
		var sharedSecret = clientKeysStore.GetSharedSecret(clientPublicKey);

		var decryptedData = DecryptData(data, sharedSecret, iv);

		var json = JsonSerializer.Serialize(new MyResponseDto
		{
			SomeNormalProperty = "foo",
			SomeSensitiveProperty = "bar"
		});

		var (newIv, encryptedData) = EncryptData(json, sharedSecret);

		return new { IV = newIv, Data = encryptedData };
	}

	private object DecryptData(string dataB64, string sharedSecretB64, string ivB64)
	{
		var sharedSecret = Convert.FromBase64String(sharedSecretB64);
		var iv = Convert.FromBase64String(ivB64);

		using Aes aes = Aes.Create();
		aes.Key = sharedSecret;
		aes.Mode = CipherMode.CBC;

		var data = Convert.FromBase64String(dataB64);

		var decryptedData = aes.DecryptCbc(data, iv);

		return Encoding.UTF8.GetString(decryptedData);
	}

	private (string, string) EncryptData(string data, string sharedSecretB64)
	{
		var sharedSecret = Convert.FromBase64String(sharedSecretB64);

		var iv = new byte[16];
		using var rng = RandomNumberGenerator.Create();
		rng.GetBytes(iv);

		using Aes aes = Aes.Create();
		aes.Key = sharedSecret;
		aes.Mode = CipherMode.CBC;

		var encryptedData = aes.EncryptCbc(Encoding.UTF8.GetBytes(data), iv);

		return (Convert.ToBase64String(iv), Convert.ToBase64String(encryptedData));
	}

	private DiffieHellmanDerivedKey DeriveKey(string clientPublicKeyB64)
	{
		using ECDiffieHellman serverKey = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
		serverKey.ImportPkcs8PrivateKey(Convert.FromBase64String(serverKeyStore.GetPrivatetKey()), out _);

		using ECDiffieHellman clientKey = ECDiffieHellman.Create();
		clientKey.ImportSubjectPublicKeyInfo(Convert.FromBase64String(clientPublicKeyB64), out _);

		byte[] sharedSecret = serverKey.DeriveKeyMaterial(clientKey.PublicKey);

		var serverPublicKeyB64 = Convert.ToBase64String(serverKey.ExportSubjectPublicKeyInfo());
		var serverPrivateKeyB64 = Convert.ToBase64String(serverKey.ExportPkcs8PrivateKey());
		var sharedSecretB64 = Convert.ToBase64String(sharedSecret);

		return new DiffieHellmanDerivedKey
		{
			ClientPublicKeyB64 = clientPublicKeyB64,
			ServerPublicKeyB64 = serverPublicKeyB64,
			SharedSecretB64 = sharedSecretB64
		};
	}
}
