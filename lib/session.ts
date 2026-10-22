export const COOKIE = 'aibrain_session';

export type SessionPayload = {
  userId: number;
  companyId: number;
  role: string;
  employeeId: number | null;
  exp: number;
};

const SECRET = process.env.SESSION_SECRET || 'aibrain-hr-dev-session-secret';

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToHex(signature);
}

export async function encodeSession(payload: Omit<SessionPayload, 'exp'>, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const body: SessionPayload = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const encoded = encodeBase64Url(JSON.stringify(body));
  return `${encoded}.${await sign(encoded)}`;
}

export async function decodeSession(token: string): Promise<SessionPayload | null> {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = await sign(encoded);
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  if (mismatch !== 0) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as SessionPayload;
    if (!payload.userId || !payload.companyId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
