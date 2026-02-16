import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services'; // Import pre-initialized service
import pool from '../db/pool';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies['auth_token'];
  const refreshToken = req.cookies['refresh_token'];
  const isProduction = config.nodeEnv === 'production';

  // Debug (remove later or use proper logger)
  if (!isProduction) {
    console.log(`[Auth] ${req.method} ${req.path}`);
  }

  // 1. Try Access Token
  if (accessToken) {
    const verified = await tokenService.verifyAccessToken(accessToken);
    if (verified) {
      req.user = verified;
      return next();
    }
    // Token invalid/expired, fall through to refresh logic
  }

  // 2. Try Refresh Token
  if (refreshToken) {
    try {
      const validation = await tokenService.validateRefreshToken(refreshToken);
      if (!validation) {
        return res.status(401).json({ error: 'Unauthorized: Session expired' });
      }

      // Get user from DB
      const userResult = await pool.query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [validation.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }

      const user = userResult.rows[0];

      // Issue new access token
      const newAccessToken = tokenService.generateAccessToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      // Set cookie
      res.cookie('auth_token', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax', // Use stricter policy if possible
        maxAge: 15 * 60 * 1000 // 15m
      });

      req.user = { id: user.id, username: user.username, role: user.role };
      return next();

    } catch (err) {
      console.error('[Auth] Refresh error:', err);
      return res.status(401).json({ error: 'Unauthorized: Session error' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized: No valid credentials' });
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
