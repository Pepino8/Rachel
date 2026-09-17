import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import db from '../config/db.js';
import { register, login } from '../controllers/auth.js';

describe('Auth Controller - Registration & Login', () => {
    const testUsername = 'test_reg_user_' + Date.now();
    const testPassword = 'Password123!';

    afterEach(() => {
        db.prepare('DELETE FROM users WHERE username LIKE ?').run('test_reg_user_%');
    });

    it('should register successfully even when process.env.ADMIN_USERNAME is undefined', async () => {
        const originalAdminUsername = process.env.ADMIN_USERNAME;
        delete process.env.ADMIN_USERNAME;

        let responseStatus = null;
        let responseJson = null;

        const req = {
            body: {
                username: testUsername,
                password: testPassword
            }
        };

        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    }
                };
            },
            json: (data) => {
                responseJson = data;
            }
        };

        try {
            await register(req, res);

            expect(responseStatus).toBeNull();
            expect(responseJson).toBeDefined();
            expect(responseJson.success).toBe(true);
            expect(responseJson.token).toBeDefined();
            expect(responseJson.user.username).toBe(testUsername);
            expect(responseJson.user.role).toBe('user');
        } finally {
            if (originalAdminUsername !== undefined) {
                process.env.ADMIN_USERNAME = originalAdminUsername;
            }
        }
    });

    it('should reject registration if username matches admin', async () => {
        let responseStatus = null;
        let responseJson = null;

        const req = {
            body: {
                username: 'admin',
                password: 'password123'
            }
        };

        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    }
                };
            },
            json: (data) => {
                responseJson = data;
            }
        };

        await register(req, res);

        expect(responseStatus).toBe(400);
        expect(responseJson.error).toBe('Username is not available.');
    });

    it('should reject duplicate username registration', async () => {
        const duplicateUsername = 'test_reg_user_dup';
        const req = {
            body: {
                username: duplicateUsername,
                password: testPassword
            }
        };

        let responseStatus = null;
        let responseJson = null;
        const res = {
            status: (code) => {
                responseStatus = code;
                return { json: (data) => { responseJson = data; } };
            },
            json: (data) => { responseJson = data; }
        };

        // First registration
        await register(req, res);
        expect(responseJson.success).toBe(true);

        // Second registration with same username
        responseStatus = null;
        responseJson = null;
        await register(req, res);
        expect(responseStatus).toBe(400);
        expect(responseJson.error).toBe('Username is already registered.');
    });

    it('should log in a newly registered user successfully', async () => {
        const username = 'test_reg_user_login';
        const password = 'SecretPassword123';

        let resJson = null;
        let resStatus = null;
        const mockRes = {
            status: (code) => { resStatus = code; return { json: (d) => { resJson = d; } }; },
            json: (d) => { resJson = d; }
        };

        // Register
        await register({ body: { username, password } }, mockRes);
        expect(resJson.success).toBe(true);

        // Login with right password
        resJson = null;
        resStatus = null;
        await login({ body: { username, password } }, mockRes);
        expect(resStatus).toBeNull();
        expect(resJson.success).toBe(true);
        expect(resJson.user.username).toBe(username);
        expect(resJson.token).toBeDefined();

        // Login with wrong password
        resJson = null;
        resStatus = null;
        await login({ body: { username, password: 'WrongPassword' } }, mockRes);
        expect(resStatus).toBe(401);
        expect(resJson.error).toBe('Incorrect username or password');
    });
});

