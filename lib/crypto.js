// 暗号化ユーティリティ（Web Crypto API + AES-GCM）

const CryptoUtils = (() => {
  const SALT = new TextEncoder().encode('reading-list-extension-salt');
  const IV_LENGTH = 12; // AES-GCM推奨

  // 拡張機能IDを素材にPBKDF2でCryptoKeyを導出
  async function deriveKey() {
    const raw = new TextEncoder().encode(chrome.runtime.id);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', raw, 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // 平文をAES-GCMで暗号化してBase64文字列を返す
  async function encrypt(plaintext) {
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array([...iv, ...new Uint8Array(ciphertext)]);
    return btoa(String.fromCharCode(...combined));
  }

  // Base64文字列を復号して平文を返す
  async function decrypt(base64) {
    const key = await deriveKey();
    const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  }

  return { encrypt, decrypt };
})();
