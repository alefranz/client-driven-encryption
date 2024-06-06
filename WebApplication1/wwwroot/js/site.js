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