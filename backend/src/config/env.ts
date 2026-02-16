import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('dev_jwt_secret_change_me'),
  REFRESH_TOKEN_SECRET: z.string().default('dev_refresh_secret_change_me'),
  CORS_ORIGINS: z.string().optional(),
  
  // Database Configuration
  DB_HOST: z.string().default('database'),
  DB_USER: z.string().default('user'),
  DB_PASSWORD: z.string().default('dev_secret_password'),
  DB_NAME: z.string().default('notimatic_dev'),
  
  // Optional for tests
  TEST_API_URL: z.string().url().optional(),
});

const _env = envSchema.parse(process.env);

export const config = {
  port: parseInt(_env.PORT, 10),
  nodeEnv: _env.NODE_ENV,
  jwtSecret: _env.JWT_SECRET,
  refreshTokenSecret: _env.REFRESH_TOKEN_SECRET,
  corsOrigins: _env.CORS_ORIGINS 
    ? _env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  db: {
    host: _env.DB_HOST,
    user: _env.DB_USER,
    password: _env.DB_PASSWORD,
    database: _env.DB_NAME,
  }
};
