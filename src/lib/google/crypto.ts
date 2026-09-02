// ============================================================
// Djola TikTak — Chiffrement des tokens Google (AES-256-GCM)
// ------------------------------------------------------------
// Les refresh/access tokens OAuth Google ne doivent JAMAIS
// être stockés en clair en base. On les chiffre avec une clé
// dérivée du SUPABASE_SERVICE_ROLE_KEY (toujours présent côté
// serveur, jamais exposé au client) via AES-256-GCM.
// Format : v1.<iv base64url>.<ciphertext+tag base64url>
// ============================================================

import crypto from 'crypto';

function getKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  // Clé 32 octets dérivée de manière déterministe
  return crypto.createHash('sha256').update(secret).digest();
}

/** Chiffre une chaîne — retourne null si la clé n'est pas disponible. */
export function encryptToken(plaintext: string): string | null {
  const key = getKey();
  if (!key || !plaintext) return null;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      Buffer.concat([enc, tag]).toString('base64url'),
    ].join('.');
  } catch {
    return null;
  }
}

/** Déchiffre un token chiffré — retourne null si invalide. */
export function decryptToken(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const key = getKey();
  if (!key) return null;
  try {
    const [version, ivB64, dataB64] = payload.split('.');
    if (version !== 'v1' || !ivB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const ciphertext = data.subarray(0, data.length - 16);
    const tag = data.subarray(data.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * État OAuth signé (anti-CSRF) : `userId.expiryMs.signature`.
 * Expiration automatique après 10 minutes.
 */
export function signOAuthState(userId: string): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const expiry = Date.now() + 10 * 60 * 1000;
  const base = `${userId}.${expiry}`;
  const sig = crypto.createHmac('sha256', secret).update(base).digest('base64url');
  return `${base}.${sig}`;
}

/** Vérifie l'état OAuth signé — retourne le userId ou null. */
export function verifyOAuthState(state: string | null): string | null {
  if (!state) return null;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  const parts = state.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiry, sig] = parts;
  const base = `${userId}.${expiry}`;
  const expected = crypto.createHmac('sha256', secret).update(base).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(expiry) < Date.now()) return null;
  return userId;
}
