/// <reference types="jest" />
import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import { hashPassword, verifyPassword } from '../src/services/password.service.js';

describe('password.service', () => {
  it('hashes and verifies a valid password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toContain(':');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('returns false for invalid password or malformed hash', async () => {
    const hash = await hashPassword('my-password');

    await expect(verifyPassword('another-password', hash)).resolves.toBe(false);
    await expect(verifyPassword('my-password', 'invalid-hash')).resolves.toBe(false);
    await expect(verifyPassword('my-password', 'salt:abcd')).resolves.toBe(false);
  });

  it('propagates scrypt runtime errors', async () => {
    const spy = jest.spyOn(crypto, 'scrypt').mockImplementation(((_password, _salt, _keylen, _opts, callback) => {
      callback(new Error('scrypt failed'), Buffer.alloc(0));
      return undefined as never;
    }) as typeof crypto.scrypt);

    await expect(hashPassword('will-fail')).rejects.toThrow('scrypt failed');
    spy.mockRestore();
  });
});
