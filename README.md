# client-driven-encryption

This is a demo of using client-driven encryption to request that an API server encrypt data before returning it to the client. This is useful when the client needs to ensure data cannot be intercepted in any way in transit.

## Running the demo

This is an ASP.NET MVC application. To run the demo, open the solution in Visual Studio and run the project. The application will start up and you can navigate to the home page.

You can run it from a terminal as well:

```bash
dotnet run --project .\WebApplication1\WebApplication1.csproj
```

The solution requires `.NET8` to be installed.

## How it works

### Mode client side

There's a JavaScript file in the `wwwroot/js` folder called `site.js`. This file contains a function called `callApi` that shows an example of generating a Public/PrivateKey pair at runtime, and then including the public key in the request made to the server.

The server has a Middleware registered called `ClientDrivenEncryptionMiddleware`.

This middleware detects any requests with a header of `Client-Encryption-Key` and encrypts the response body using the public key provided in the header.

The encrypted response is wrapped in a JSON object with a `value` property containing the encrypted data, and a `publicKey` property containing the key used to encrypt the data.

The code in `site.js` subsequently uses the private key portion of the key pair to decrypt the response from the value property.

The middlware adjusts the response content type to `application/encrypted+json` to indicate that the response is encrypted.

This process can be used on single endpoints, in action filters, or across entire web applications.

#### The Encryption

The encryption is done using the `System.Security.Cryptography.RSA` class in .NET, and using the SubtleCrypto API in JavaScript.

A 2048bit `RSA-OAEP` key is generated for the exchange and can live for either the duration of a client session, a request, or a longer period of time as desired. The design deliberately does not require key rotation or storage as these are temporary keys to lock down single API interactions.

### Mode using Diffie-Hellman

There's a JavaScript file in the `wwwroot/js` folder called `site.js`. This file contains a function called `callApiDH` that shows an example of generating a key to be used in a Diffie-Hellman key pair exchange.

The server has a endpoint `/api/dh`.

This endpoint receive a client public key, and, using a fixed server key (currently generated on startup) derive a shared key and store it, alongside the lclient key for later retrieval and the server used public key (to stay valid after a server key rotation).
The server also returns the public key for confirmation.

The `/api` endpoint receive a base64 encrypted payload form the JS side, using the same derived shared key.
It then include the public key in the `Client-Public-Key` header and the iv in the `IV` header.
The client should first confirm the publicKey of the server is valid via other method; in this example the server public key is also shown on the web page for confirmation.

The server retrieve the shared key based on the client public key and decript using the iv. Similarly, it encrypt the response, generating a new IV.
The encrypted response is wrapped in a JSON object with a `data` property containing the encrypted data, and a `iv` property containing the IV to initialize the encryption, generated every time.

The code in `site.js` subsequently uses the private key portion of the key pair to derive the shared secret and decrypt the response from the value property.

The middleware adjusts the response content type to `application/encrypted+json` to indicate that the response is encrypted.

This process can be used on single endpoints, in action filters, or across entire web applications.

#### The Encryption

An elliptic curve Diffie-Hellman (ECDH) key pair is generated for the exchange and can live for either the duration of a client session, a request, or a longer period of time as desired. The design for the client keys deliberately does not require key rotation or storage as these are temporary keys to lock down single API interactions.

The server key however could be pre-shared to allow the client to detect MITM attacks.

The encryption is then done with AES-256-CBC.

#### To do

  - Consider replacing AES-256-CBC with AES-256-GCM or doing Encrypt-then-MAC
  - Transfer binary data avoiding Base64 where not necessary
  - Consider removing the initial `/api/dh` initial call and generate shared secret on first request. However this assume the server public key is pre-shared via certificate or other means.
  - Move to Middleware similar to other approach and clean up API payloads to have request/response more similar
