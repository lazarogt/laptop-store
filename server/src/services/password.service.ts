import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLEL = 1;

const scryptAsync = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLEL },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });

/** Hashes password using scrypt with random salt. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt);
  return `${salt}:${derived.toString('hex')}`;
};

/** Verifies a plain password against a stored scrypt hash. */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== SCRYPT_KEYLEN) {
    return false;
  }

  const actual = await scryptAsync(password, salt);
  return crypto.timingSafeEqual(actual, expected);
};
