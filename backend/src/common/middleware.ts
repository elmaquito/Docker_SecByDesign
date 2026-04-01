import { NextFunction, Request, Response } from 'express';
// import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { NODE_ENV } from '../config/env';
import { pool } from '../config/database';
import { TokenService } from '../auth/token.service';
import { Role } from './types';

import { User } from './types';

const tokenService = new TokenService();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// 1. Authenticate (Verify JWT with auto-refresh)
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies['auth_token'];
  const refreshToken = req.cookies['refresh_token'];
  
  // Enhanced logging for debugging
  console.log(`[Auth] ${req.method} ${req.path}`);
  console.log(`[Auth] Origin: ${req.headers.origin}`);
  console.log(`[Auth] Cookie header: ${req.headers.cookie ? 'present' : 'missing'}`);
  console.log(`[Auth] Access token found: ${accessToken ? 'yes' : 'no'}`);
  console.log(`[Auth] Refresh token found: ${refreshToken ? 'yes' : 'no'}`);
  
  // Try to verify access token first
  if (accessToken) {
    const verified = tokenService.verifyAccessToken(accessToken);
    if (verified) {
      req.user = verified;
      console.log(`[Auth] SUCCESS: User ${verified.username} (${verified.role})`);
      return next();
    }
    console.log('[Auth] Access token invalid or expired');
  }
  
  // If no access token or it's invalid, try to refresh using refresh token
  if (refreshToken) {
    console.log('[Auth] Attempting to refresh access token');
    try {
      // Validate refresh token
      const validation = await tokenService.validateRefreshToken(refreshToken);
      if (!validation) {
        console.log('[Auth] FAILED: Invalid refresh token');
        return res.status(401).json({ error: 'Unauthorized: Session expired, please login again' });
      }

      // Get user data
      const userResult = await pool.query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [validation.userId]
      );

      if (userResult.rows.length === 0) {
        console.log('[Auth] FAILED: User not found');
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      const user = userResult.rows[0];

      // Generate new access token (don't rotate refresh token on every request - only on explicit refresh)
      const newAccessToken = tokenService.generateAccessToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      const isProduction = NODE_ENV === 'production';

      // Set new access token cookie
      res.cookie('auth_token', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      req.user = { id: user.id, username: user.username, role: user.role };
      console.log(`[Auth] SUCCESS: Token auto-refreshed for user ${user.username} (${user.role})`);
      return next();
    } catch (err: any) {
      console.error('[Auth] Refresh error:', err);
      return res.status(401).json({ error: 'Unauthorized: Session error' });
    }
  }
  
  // No valid tokens found
  console.log('[Auth] FAILED: No valid tokens');
  return res.status(401).json({ error: 'Unauthorized: No authentication token' });
};

// 2. Authorize (Check Roles)
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log('[Authorize] FAILED: No user in request');
      return res.status(401).json({ error: 'Unauthorized: No user context' });
    }
    console.log(`[Authorize] User role: ${req.user.role}, Allowed roles: ${allowedRoles.join(', ')}`);
    if (allowedRoles.includes(req.user.role)) {
      console.log('[Authorize] SUCCESS: Role authorized');
      next();
    } else {
      console.log('[Authorize] FAILED: Role not in allowed list');
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
  };
};

// 3. Check Owner (Dynamic)
// Returns true if user is owner, false otherwise.
// This is a helper, not a middleware, to be used inside routes for granular control.
export const isOwner = (resourceUserId: number, currentUserId: number) => {
  return resourceUserId === currentUserId;
};

// Rate Limiters
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 login requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Slow down! Minimum 10 comments per minute rule.' }
});

// Sanitization Middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key]);
      }
      // Recursively sanitize objects? keeping it simple for now as requested
    }
  }
  next();
};

// 4. Global Error Handler
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error] Uncaught Exception:', err);
  
  // Handle Zod errors (if any leak here, usually they are caught in controller)
  if (err.name === 'ZodError' || err.issues) {
     return res.status(400).json({ error: 'Validation Error', details: err.issues || err.errors });
  }

  // Handle Postgres errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({ error: 'Conflict: Value already exists' });
  }

  // Default error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};
