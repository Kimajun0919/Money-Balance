const DEFAULT_MOCK_SECRET = "yield-balance-local-mock-secret";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveAesKey(secret: string) {
  const encodedSecret = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", encodedSecret);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt"
  ]);
}

export async function encryptToken(
  token: string,
  secret = DEFAULT_MOCK_SECRET
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );

  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptToken(
  encryptedToken: string,
  secret = DEFAULT_MOCK_SECRET
) {
  const [ivBase64, payloadBase64] = encryptedToken.split(".");
  if (!ivBase64 || !payloadBase64) {
    throw new Error("토큰 암호문 형식이 올바르지 않습니다.");
  }
  const key = await deriveAesKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivBase64) },
    key,
    base64ToBytes(payloadBase64)
  );
  return new TextDecoder().decode(decrypted);
}

export function maskToken(token: string) {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}
