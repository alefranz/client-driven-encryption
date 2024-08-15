async function callApi() {
    const { publicJwk, privateKey } = await generateKeyPair();

    console.log("Sending request with public key:", publicJwk);

    const result = await fetch('/api', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Client-Encryption-Key': btoa(JSON.stringify(publicJwk))
        }
    });

    const envelope = await result.json();
    const asJson = JSON.parse(await decrypt(envelope.value, privateKey));
    
    console.log("Decrypted", asJson);
    alert(JSON.stringify(asJson));
}

async function generateKeyPair() {
    const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-256"}
        },
        true,
        ["encrypt", "decrypt"]
    );

    const publicJwk = await window.crypto.subtle.exportKey("jwk", publicKey);
    return { publicJwk, privateKey };
}

async function decrypt(encrypted, privateKey) {    
    const encryptedSourceBytes = new Uint8Array(atob(encrypted).split("").map(c => c.charCodeAt(0)));
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" }, privateKey, encryptedSourceBytes
    );

    return new TextDecoder().decode(decrypted);
}

async function callApiDH() {

    // this can be done once per session

    const { privateKey, publicKey } = await generateDHKeyPair();

    console.log("Sending request with public key:", publicKey);

    const request = new Request("/api/dh", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(publicKey),
    });

    const response = await fetch(request);

    const serverPublicKey = await response.json();
    alert("Server Public Key " + serverPublicKey);

    var sharedSecretHash = await getSharedSecretHash(serverPublicKey, privateKey);

    alert("Shared secret hash: " + sharedSecretHash);

    const sharedKey = await window.crypto.subtle.importKey(
        "raw",
        new Uint8Array(_base64ToArrayBuffer(sharedSecretHash)),
        {
            name: "AES-CBC",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    );

    console.log(sharedKey);

    // ----

    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const data = await window.crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            length: 256,
            iv: iv
        },
        sharedKey,
        new TextEncoder().encode(JSON.stringify({ message: "Hello, World!" }))
    );

    const dataB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
    const ivB64 = btoa(String.fromCharCode.apply(null, iv));

    console.log(dataB64);

    const dataRequest = new Request("/api", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Client-Public-Key': publicKey,
            'IV': ivB64
        },
        body: JSON.stringify(dataB64),
    });

    const result = await fetch(dataRequest);

    const envelope = await result.json();
    console.log(envelope);

    const serverData = await window.crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            length: 256,
            iv: _base64ToArrayBuffer(envelope.iv)
        },
        sharedKey,
        _base64ToArrayBuffer(envelope.data)
    );

    var serverDataString = String.fromCharCode.apply(null, new Uint8Array(serverData))

    console.log("Decrypted", serverDataString);
    alert(serverDataString);
}

async function generateDHKeyPair() {
    var clientKey = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ["deriveKey"]
    );
    var publicKeyData = await window.crypto.subtle.exportKey("spki", clientKey.publicKey);
    var publicKeyBytes = new Uint8Array(publicKeyData);
    var publicKey = btoa(String.fromCharCode.apply(null, publicKeyBytes));
    console.log("public: \n" + publicKey);
    var privateKeyData = await window.crypto.subtle.exportKey("pkcs8", clientKey.privateKey);
    var privateKeyBytes = new Uint8Array(privateKeyData);
    var privateKey = btoa(String.fromCharCode.apply(null, privateKeyBytes));
    console.log("private:\n" + privateKey);
    return { privateKey, publicKey };
};

async function getSharedSecretHash(serverPublicKey, clientPrivateKey) {
    var clientKey = await window.crypto.subtle.importKey(
        "pkcs8",
        new Uint8Array(_base64ToArrayBuffer(clientPrivateKey)),
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );
    var serverKey = await window.crypto.subtle.importKey(
        "spki",
        new Uint8Array(_base64ToArrayBuffer(serverPublicKey)),
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
    var sharedSecret = await window.crypto.subtle.deriveBits(
        { name: "ECDH", namedCurve: "P-256", public: serverKey },
        clientKey,
        256
    );
    console.log(sharedSecret);
    // Hash the derived key to replicate behaviour of .NET DeriveKeyMaterial()
    var sharedSecretHash = await crypto.subtle.digest('SHA-256', sharedSecret);
    var sharedSecretHashB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(sharedSecretHash)));
    
    return sharedSecretHashB64
};

// from https://stackoverflow.com/a/21797381/9014097
function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
