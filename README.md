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

There's a JavaScript file in the `wwwroot/js` folder called `site.js`. This file contains a function called `callApi` that shows an example of generating a Public/PrivateKey pair at runtime, and then including the public key in the request made to the server.

The server has a Middleware registered called `ClientDrivenEncryptionMiddleware`.

This middleware detects any requests with a header of `Client-Encryption-Key` and encrypts the response body using the public key provided in the header.

The encrypted response is wrapped in a JSON object with a `value` property containing the encrypted data, and a `publicKey` property containing the key used to encrypt the data.

The code in `site.js` subsequently uses the private key portion of the key pair to decrypt the response from the value property.

The middlware adjusts the response content type to `application/encrypted+json` to indicate that the response is encrypted.

This process can be used on single endpoints, in action filters, or across entire web applications.

## The Encryption

The encryption is done using the `System.Security.Cryptography.RSA` class in .NET, and using the SubtleCrypto API in JavaScript.

A 2048bit `RSA-OAEP` key is generated for the exchange and can live for either the duration of a client session, a request, or a longer period of time as desired. The design deliberately does not require key rotation or storage as these are temporary keys to lock down single API interactions.
