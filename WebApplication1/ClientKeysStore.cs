namespace WebApplication1;

public class ClientKeysStore
{
	private Dictionary<string, DiffieHellmanDerivedKey> _store { get; set; } = new();

	public string GetSharedSecret(string clientPublicKey)
	{
		if (_store.TryGetValue(clientPublicKey, out var key))
		{
			return key.SharedSecretB64;
		}
		throw new Exception("No key found");
	}

	public void Add(DiffieHellmanDerivedKey key)
	{
		_store.Add(key.ClientPublicKeyB64, key);
	}
}
