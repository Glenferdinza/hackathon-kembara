const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'ypti-erp-session-hmac-secret-v1'
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(base64Url: string): Uint8Array | null {
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getHmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

export async function signSessionToken<T extends object>(payload: T): Promise<string> {
  const payloadBytes = TEXT_ENCODER.encode(JSON.stringify(payload));
  const payloadB64 = bytesToBase64Url(payloadBytes);
  const key = await getHmacKey('sign');
  const sigBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    TEXT_ENCODER.encode(payloadB64)
  );
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuffer));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken<T>(token: string): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (sigB64.includes('.')) return null;

  const sigBytes = base64UrlToBytes(sigB64);
  const payloadBytes = base64UrlToBytes(payloadB64);
  if (!sigBytes || !payloadBytes) return null;

  try {
    const key = await getHmacKey('verify');
    const sigCopy = new Uint8Array(sigBytes.length);
    sigCopy.set(sigBytes);
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigCopy.buffer,
      TEXT_ENCODER.encode(payloadB64)
    );
    if (!valid) return null;

    const jsonStr = TEXT_DECODER.decode(payloadBytes);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
