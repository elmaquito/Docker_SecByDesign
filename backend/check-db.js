#!/usr/bin/env node
/**
 * Database connectivity and schema validation script
 * Checks if database is accessible and all required tables exist
 */

const { Pool } = require('pg');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'dev_secret_password',
  database: process.env.DB_NAME || 'notimatic_dev',
  port: process.env.DB_PORT || 5432,
};

const REQUIRED_TABLES = [
  'users',
  'notes',
  'comments',
  'profiles',
  'themes',
  'categories',
  'note_themes',
  'note_categories',
  'note_targets',
  'audit_logs',
  'gdpr_export_requests',
  'password_reset_tokens',
  'unified_tags',
  'reactions',
  'sessions', // Critical for auth
];

async function checkDatabase() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('🔍 Checking database connectivity...');
    console.log(`   Host: ${DB_CONFIG.host}`);
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   User: ${DB_CONFIG.user}`);
    console.log('');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Check for required tables
    console.log('🔍 Checking required tables...');
    const missingTables = [];
    
    for (const tableName of REQUIRED_TABLES) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (MISSING)`);
        missingTables.push(tableName);
      }
    }
    
    console.log('');
    
    if (missingTables.length > 0) {
      console.error('❌ CRITICAL: Missing tables detected!');
      console.error('   Missing:', missingTables.join(', '));
      console.error('');
      console.error('🔧 Fix: Run database migrations:');
      console.error('   bash backend/migrate.sh');
      process.exit(1);
    }
    
    // Check users table for test data
    console.log('🔍 Checking for users...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   Found ${userCount.rows[0].count} users`);
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('   ⚠️  No users found. You may need to seed the database.');
    }
    
    console.log('');
    console.log('✅ All database checks passed!');
    
  } catch (err) {
    console.error('❌ Database check failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('');
      console.error('🔧 Fix: Make sure PostgreSQL is running');
      console.error('   Docker: docker-compose up database');
    } else if (err.code === '3D000') {
      console.error('');
      console.error('🔧 Fix: Database does not exist. Create it first:');
      console.error(`   createdb ${DB_CONFIG.database}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();
