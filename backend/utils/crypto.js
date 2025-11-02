import crypto from 'node:crypto';

// AES-256-GCM encryption helpers. Returns/accepts strings.
// If no SECRET_KEY is provided, functions act as pass-through to avoid breaking dev.
const ALG = 'aes-256-gcm';
const PREFIX = 'enc:gcm:';

function getKey() {
  const secret = process.env.SECRET_KEY || process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!secret) return null;
  // Derive 32-byte key. If secret provided is hex/32 bytes, use directly; else scrypt.
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.scryptSync(secret, 'signaltrue_salt', 32);
}

export function encryptString(plain) {
  if (!plain) return '';
  const key = getKey();
  if (!key) return String(plain); // pass-through in dev if no key
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString('base64');
  return PREFIX + payload;
}

export function decryptString(value) {
  if (!value) return '';
  const key = getKey();
  if (!key) return String(value);
  const str = String(value);
  if (!str.startsWith(PREFIX)) return str; // already plaintext
  const b = Buffer.from(str.slice(PREFIX.length), 'base64');
  const iv = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const enc = b.subarray(28);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

export default { encryptString, decryptString };
