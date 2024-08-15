using System.Security.Cryptography;

namespace WebApplication1;

public class ServerKeyStore
{
	private readonly string _privateKey;
	private readonly string _publicKey;

	public ServerKeyStore()
	{
		using ECDiffieHellman serverKey = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
		_privateKey = Convert.ToBase64String(serverKey.ExportPkcs8PrivateKey());
		_publicKey = Convert.ToBase64String(serverKey.ExportSubjectPublicKeyInfo());
	}

	public string GetPrivatetKey()
	{
		return _privateKey;
	}
	public string GetPublicKey()
	{
		return _publicKey;
	}
}