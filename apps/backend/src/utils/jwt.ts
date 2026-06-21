function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padding);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export type JWTPayload = {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
};

export async function signAccessToken(
  payload: { sub: string; email: string; name: string },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + 900,
  };

  const header = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  );
  const body = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(fullPayload))
  );
  const data = `${header}.${body}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));

  return `${data}.${base64urlEncode(new Uint8Array(signature))}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;

  let valid: boolean;
  try {
    const key = await getSigningKey(secret);
    valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );
  } catch {
    return null;
  }

  if (!valid) return null;

  try {
    const decoded: JWTPayload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payload))
    );
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}
