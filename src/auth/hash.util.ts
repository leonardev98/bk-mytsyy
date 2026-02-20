import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const SALT_LEN = 16;
const KEY_LEN = 64;
const SEP = '.';

/**
 * Hash de contraseña con scrypt (solo Node.js, sin dependencias).
 * Formato almacenado: saltHex.hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = (await scryptAsync(
    Buffer.from(password, 'utf8'),
    salt,
    KEY_LEN,
  )) as Buffer;
  return `${salt.toString('hex')}${SEP}${hash.toString('hex')}`;
}

/**
 * Verifica una contraseña contra el hash almacenado.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const i = stored.indexOf(SEP);
  if (i === -1) return false;
  const saltHex = stored.slice(0, i);
  const hashHex = stored.slice(i + 1);
  const salt = Buffer.from(saltHex, 'hex');
  if (salt.length !== SALT_LEN) return false;
  const hash = (await scryptAsync(
    Buffer.from(password, 'utf8'),
    salt,
    KEY_LEN,
  )) as Buffer;
  return hash.toString('hex') === hashHex;
}
