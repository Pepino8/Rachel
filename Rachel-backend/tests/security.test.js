import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '../services/gameflip.js';

describe('Pruebas de Seguridad y Criptografía', () => {
    
    describe('Hasheo de Contraseñas (Bcrypt)', () => {
        it('debe hashear una contraseña y verificarla correctamente', () => {
            const password = 'miContrasenaSuperSecreta';
            const hash = bcrypt.hashSync(password, 10);
            
            expect(hash).not.toBe(password);
            expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
            
            const matches = bcrypt.compareSync(password, hash);
            expect(matches).toBe(true);
            
            const wrongMatches = bcrypt.compareSync('contrasenaIncorrecta', hash);
            expect(wrongMatches).toBe(false);
        });
    });

    describe('Manejo de Sesiones (JWT)', () => {
        it('debe firmar y verificar tokens JWT correctamente', () => {
            const secret = 'secreto-de-prueba-jwt-123456';
            const payload = { id: 'admin-id', role: 'admin' };
            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            
            expect(token).toBeDefined();
            expect(token.split('.').length).toBe(3); // formato cabecera.payload.firma
            
            const decoded = jwt.verify(token, secret);
            expect(decoded.id).toBe(payload.id);
            expect(decoded.role).toBe(payload.role);
        });
    });

    describe('Cifrado Simétrico AES-256-GCM (Gameflip Keys)', () => {
        it('debe cifrar texto y descifrarlo de vuelta a su valor original', () => {
            const apiKey = 'gf-api-key-test-abcde-12345';
            const encrypted = encrypt(apiKey);
            
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(apiKey);
            expect(encrypted.split(':').length).toBe(3); // iv:ciphertext:tag
            
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(apiKey);
        });

        it('debe retornar el texto plano si el formato no es cifrado (soporte legacy)', () => {
            const legacyUnencryptedKey = 'clave-antigua-sin-cifrar-en-db';
            const decrypted = decrypt(legacyUnencryptedKey);
            expect(decrypted).toBe(legacyUnencryptedKey);
        });
    });
});
