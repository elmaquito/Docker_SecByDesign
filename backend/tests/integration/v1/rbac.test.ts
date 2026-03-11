import request from 'supertest';
import app from '../../../src/main';
import { pool } from '../../../src/config/database';
import { seedUsers, clearUsers } from '../setup';

describe('RBAC Integration Tests', () => {
    let adminCookie: string[];
    let teacherCookie: string[];
    let studentCookie: string[];

    let teacherUser: any;
    let studentUser: any;

    beforeAll(async () => {
        await seedUsers();
        
        // Fetch user IDs
        const usersRes = await pool.query('SELECT * FROM users');
        usersRes.rows.forEach(u => {
            if (u.role === 'teacher') teacherUser = u;
            if (u.role === 'student') studentUser = u;
        });

        // Login Admin
        const adminRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'admin_test', password: 'admin_secure_password_123' });
        adminCookie = adminRes.headers['set-cookie'] as unknown as string[];

        // Login Teacher
        const teacherRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'teacher_test', password: 'teacher_secure_password_123' });
        teacherCookie = teacherRes.headers['set-cookie'] as unknown as string[];

        // Login Student
        const studentRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'student_test', password: 'student_secure_password_123' });
        studentCookie = studentRes.headers['set-cookie'] as unknown as string[];
    });

    afterAll(async () => {
        await clearUsers();
        await pool.end();
    });

    // --- USER MANAGEMENT ---

    test('Admin can list users', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('Teacher can list users', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Cookie', teacherCookie);
        expect(res.status).toBe(200);
    });

    test('Student CANNOT list users', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Cookie', studentCookie);
        expect(res.status).toBe(403);
    });

    test('Admin can create users', async () => {
        // Create user logic is mocked/tested elsewhere, just check permission
        // But createUser implementation actually creates DB entry. 
        // We'll trust the 403 vs 2xx/400 distinction.
        const res = await request(app)
            .post('/api/v1/users')
            .set('Cookie', adminCookie)
            .send({ username: 'new_user', password: 'password123', role: 'student' });
        
        // 201 Created or 400 Bad Request (if schema fails) - but distinct from 403
        expect([201, 400]).toContain(res.status);
    });

    test('Teacher CANNOT create users', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .set('Cookie', teacherCookie)
            .send({ username: 'fail_user', password: 'password123', role: 'student' });
        expect(res.status).toBe(403);
    });

    // --- NOTE MANAGEMENT & OWNERSHIP ---

    let studentNoteId: number;
    let teacherNoteId: number;

    test('Student can create a note', async () => {
        const res = await request(app)
            .post('/api/v1/notes')
            .set('Cookie', studentCookie)
            .send({ title: 'Student Note', content: 'My content' });
        expect(res.status).toBe(201);
        studentNoteId = res.body.id;
    });

    test('Teacher can create a note', async () => {
        const res = await request(app)
            .post('/api/v1/notes')
            .set('Cookie', teacherCookie)
            .send({ title: 'Teacher Note', content: 'My content' });
        expect(res.status).toBe(201);
        teacherNoteId = res.body.id;
    });

    test('Student can update OWN note', async () => {
        const res = await request(app)
            .patch(`/api/v1/notes/${studentNoteId}`)
            .set('Cookie', studentCookie)
            .send({ title: 'Student Note Updated' });
        expect(res.status).toBe(200);
    });

    test('Student CANNOT update Teacher note', async () => {
        const res = await request(app)
            .patch(`/api/v1/notes/${teacherNoteId}`)
            .set('Cookie', studentCookie)
            .send({ title: 'Hacked' });
        expect(res.status).toBe(403);
    });

    test('Teacher can update Student note (Role: Teacher override)', async () => {
        const res = await request(app)
            .patch(`/api/v1/notes/${studentNoteId}`)
            .set('Cookie', teacherCookie)
            .send({ title: 'Teacher Moderated' });
        expect(res.status).toBe(200);
    });

    test('Teacher CANNOT delete Student note (Role limitation)', async () => {
        // Teacher can EDIT but NOT DELETE student notes based on controller logic
        const res = await request(app)
            .delete(`/api/v1/notes/${studentNoteId}`)
            .set('Cookie', teacherCookie);
        expect(res.status).toBe(403);
    });

    test('Admin can delete ANY note', async () => {
        const res = await request(app)
            .delete(`/api/v1/notes/${studentNoteId}`) // Deleting the student note
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
    });

    // --- GDPR ---

    test('Student can export own data', async () => {
        const res = await request(app)
            .get(`/api/v1/users/${studentUser.id}/export`)
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe('student_test');
    });

    test('Student CANNOT export Teacher data', async () => {
        const res = await request(app)
            .get(`/api/v1/users/${teacherUser.id}/export`)
            .set('Cookie', studentCookie);
        expect(res.status).toBe(403);
    });

    test('Admin can export any data', async () => {
        const res = await request(app)
            .get(`/api/v1/users/${teacherUser.id}/export`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
    });

    // --- TAGS MANAGEMENT ---

    let tagId: number;

    test('Teacher can create a tag', async () => {
        const res = await request(app)
            .post('/api/v1/tags')
            .set('Cookie', teacherCookie)
            .send({ name: 'Important', type: 'categorie', meta: { color: '#ff0000' }, is_default_for_student_view: true });
        expect(res.status).toBe(201);
        tagId = res.body.id;
    });

    test('Student CANNOT create a tag', async () => {
        const res = await request(app)
            .post('/api/v1/tags')
            .set('Cookie', studentCookie)
            .send({ name: 'HackedTag', type: 'groupe' });
        expect(res.status).toBe(403);
    });

    test('Teacher CANNOT delete a tag (Admin only)', async () => {
        const res = await request(app)
            .delete(`/api/v1/tags/${tagId}`)
            .set('Cookie', teacherCookie);
        expect(res.status).toBe(403);
    });

    test('Admin can delete a tag', async () => {
        const res = await request(app)
            .delete(`/api/v1/tags/${tagId}`)
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
    });
});

