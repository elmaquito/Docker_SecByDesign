import { pool } from '../../src/config/database';
import argon2 from 'argon2';

export const seedUsers = async () => {
    // Clear existing data
    await clearUsers();

    const adminPass = await argon2.hash('admin_secure_password_123');
    const teacherPass = await argon2.hash('teacher_secure_password_123');
    const studentPass = await argon2.hash('student_secure_password_123');

    // Insert Admin
    await pool.query('INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4)', 
        ['admin_test', adminPass, 'admin', 'admin@example.com']);
    
    // Insert Teacher
    await pool.query('INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4)', 
        ['teacher_test', teacherPass, 'teacher', 'teacher@example.com']);

    // Insert Student
    await pool.query('INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4)', 
        ['student_test', studentPass, 'student', 'student@example.com']);

    console.log('Test users seeded');
};

export const clearUsers = async () => {
    // Order matters for constraints
    await pool.query('DELETE FROM note_themes'); // If exists
    await pool.query('DELETE FROM note_categories'); // If exists
    await pool.query('DELETE FROM notes');
    await pool.query('DELETE FROM tags'); // Clear tags
    await pool.query('DELETE FROM users');
    console.log('Test users cleared');
};
