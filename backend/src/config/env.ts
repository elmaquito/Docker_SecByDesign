import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_me';
export const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const DB_CONFIG = {
  host: process.env.DB_HOST || 'database',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'dev_secret_password',
  database: process.env.DB_NAME || 'notimatic_dev',
};
