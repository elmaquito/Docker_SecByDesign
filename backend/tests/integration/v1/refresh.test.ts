import request from 'supertest';
import app from '../../../src/main';
import { clearUsers, seedUsers } from '../setup';
import { pool } from '../../../src/config/database';

describe('Token Lifecycle Integration Tests', () => {
    let studentCookie: string[];
    let oldRefreshToken: string;
    let newRefreshToken: string;

    beforeAll(async () => {
        await seedUsers();
    });

    afterAll(async () => {
        await clearUsers();
        await pool.end();
    });

    // 1. Login
    test('Login -> Returns auth_token and refresh_token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'student_test', password: 'student_secure_password_123' });
        
        expect(res.status).toBe(200);
        
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();

        studentCookie = cookies;
        const refreshCookie = cookies.find(c => c.startsWith('refresh_token='));
        expect(refreshCookie).toBeDefined();
        oldRefreshToken = refreshCookie!.split(';')[0];
    });

    // 2. Auto-Refresh (Middleware)
    test('Auto-Refresh: Access protected route with only refresh_token -> New auth_token, Same refresh_token', async () => {
        // Step 1: Request with ONLY refresh_token (simulating expired auth_token)
        const res = await request(app)
            .get('/api/v1/users/me')
            .set('Cookie', [oldRefreshToken]);

        expect(res.status).toBe(200);
        
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();

        // Expect ONLY auth_token to be set (renewed)
        const newAuthToken = cookies.find(c => c.startsWith('auth_token='));
        const newRefCookie = cookies.find(c => c.startsWith('refresh_token='));

        expect(newAuthToken).toBeDefined();
        // Middleware does NOT rotate refresh token on every request
        expect(newRefCookie).toBeUndefined(); 
    });

    // 3. Explicit Refresh (Rotation)
    test('Revoke: Explicit Refresh (/api/v1/auth/refresh) rotates BOTH tokens', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', [oldRefreshToken]);

        expect(res.status).toBe(200);
        
        const cookies = res.headers['set-cookie'] as unknown as string[];
        const newAuthToken = cookies.find(c => c.startsWith('auth_token='));
        const newRefCookie = cookies.find(c => c.startsWith('refresh_token='));

        expect(newAuthToken).toBeDefined();
        expect(newRefCookie).toBeDefined();

        newRefreshToken = newRefCookie!.split(';')[0];
        // Verify rotation
        expect(newRefreshToken).not.toBe(oldRefreshToken);
    });

    // 4. Reuse Detection (Old Refresh Token)
    test('Revocation Check: Old Refresh Token behaves as INVALID', async () => {
        // Try to use the OLD refresh token (which was rotated in previous test)
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', [oldRefreshToken]);

        // Expect 403 or 401
        expect([401, 403]).toContain(res.status);
    });

    // 5. Logout
    test('Logout clears cookies', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', [newRefreshToken]); // Use valid token to access logout (it's protected)

        expect(res.status).toBe(200);
        
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        
        const authTokenClear = cookies.find(c => c.startsWith('auth_token=;'));
        const refreshTokenClear = cookies.find(c => c.startsWith('refresh_token=;'));
        
        expect(authTokenClear).toBeDefined();
        expect(refreshTokenClear).toBeDefined();
    });
});
