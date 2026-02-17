import { NextFunction, Response } from 'express';
import { Pool } from 'pg';
import { NODE_ENV } from '../config/env';
import { pool } from '../config/database';
import { TokenService } from '../auth/token.service';
import { Role } from './types';

const tokenService = new TokenService();

// 1. Authenticate (Verify JWT with auto-refresh)
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
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
    } catch (err) {
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
  return (req: any, res: Response, next: NextFunction) => {
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
