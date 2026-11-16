import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '../services/gameflip.js';

describe('Security and Cryptography Tests', () => {
    
    describe('Password Hashing (Bcrypt)', () => {
        it('should hash a password and verify it correctly', () => {
            const password = 'mySuperSecretPassword123';
            const hash = bcrypt.hashSync(password, 10);
            
            expect(hash).not.toBe(password);
            expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
            
            const matches = bcrypt.compareSync(password, hash);
            expect(matches).toBe(true);
            
            const wrongMatches = bcrypt.compareSync('wrongPassword', hash);
            expect(wrongMatches).toBe(false);
        });
    });

    describe('Session Management (JWT)', () => {
        it('should sign and verify JWT tokens correctly', () => {
            const secret = 'jwt-test-secret-key-123456';
            const payload = { id: 'admin-id', role: 'admin' };
            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            
            expect(token).toBeDefined();
            expect(token.split('.').length).toBe(3); // header.payload.signature format
            
            const decoded = jwt.verify(token, secret);
            expect(decoded.id).toBe(payload.id);
            expect(decoded.role).toBe(payload.role);
        });
    });

    describe('Symmetric AES-256-GCM Encryption (Gameflip Keys)', () => {
        it('should encrypt text and decrypt it back to its original value', () => {
            const apiKey = 'gf-api-key-test-abcde-12345';
            const encrypted = encrypt(apiKey);
            
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(apiKey);
            expect(encrypted.split(':').length).toBe(3); // iv:ciphertext:tag
            
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(apiKey);
        });

        it('should return plain text if the format is unencrypted (legacy support)', () => {
            const legacyUnencryptedKey = 'old-unencrypted-key-in-db';
            const decrypted = decrypt(legacyUnencryptedKey);
            expect(decrypted).toBe(legacyUnencryptedKey);
        });
    });
});
