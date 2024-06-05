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

    const privateExport = await window.crypto.subtle.exportKey("jwk", privateKey);
    const publicExport = await window.crypto.subtle.exportKey("jwk", publicKey);
    return { publicKeyExported: publicExport, privateKeyExported: privateExport, publicKey, privateKey };
}

async function encrypt(plainText, key, exportedKey) {
    const data = new TextEncoder().encode(plainText);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" }, key, data
    );
    
    return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
}

async function decrypt(encrypted, key) {    
    const encryptedSourceBytes = new Uint8Array(atob(encrypted).split("").map(c => c.charCodeAt(0)));
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" }, key, encryptedSourceBytes
    );

    return new TextDecoder().decode(decrypted);
}

(async () => {
    const pair = await generateKeyPair();

    console.log("Sending request with public key:", pair.publicKeyExported);

    const result = await fetch('/api', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Client-Encryption-Key': btoa(JSON.stringify(pair.publicKeyExported))
        }
    });

    const body = await result.text();
    
    const asText = await decrypt(body, pair.privateKey);
    console.log("Decrypted", asText);
})();