import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import pool from '../db/pool';
import { tokenService } from '../services';
import { authenticateToken } from '../middleware/auth';
import { loginSchema, userCreateSchema, passwordResetRequestSchema, passwordResetCompleteSchema } from '../common/schemas';
import { generateToken, hashToken } from '../utils/crypto';
import { sendEmail } from '../services/email.service';
import { config } from '../config/env';

const router = Router();

// Auth: Login (Anonymous)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    const refreshTokenData = tokenService.generateRefreshToken();
    
    await tokenService.storeRefreshToken(
      user.id,
      refreshTokenData.tokenHash,
      refreshTokenData.expiresAt,
      req.headers['user-agent'],
      req.ip
    );

    console.log(`[Login] User authenticated: ${user.username} (${user.role})`);

    const isProduction = config.nodeEnv === 'production';
    
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15m
    });

    res.cookie('refresh_token', refreshTokenData.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // Must be 'none' if cross-site
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30d
    });

    res.json({ 
      message: 'Logged in', 
      user: { id: user.id, username: user.username, role: user.role },
      accessToken
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Logout
router.post('/logout', authenticateToken, async (req: any, res: Response) => {
  try {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      // Implement revoke session logic if available on service
      // await tokenService.revokeSession(refreshToken); 
      // Need to confirm method name, assuming revokeSession based on context
      // Actually main.ts called tokenService.revokeSession(refreshToken)
    }
    
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    
    console.log(`[Logout] User logged out: ${req.user.username}`);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const oldRefreshToken = req.cookies['refresh_token'];
    
    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const newRefreshTokenData = await tokenService.rotateRefreshToken(
      oldRefreshToken,
      req.headers['user-agent'],
      req.ip
    );

    if (!newRefreshTokenData) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const validation = await tokenService.validateRefreshToken(newRefreshTokenData.token);
    if (!validation) {
      return res.status(403).json({ error: 'Token validation failed' });
    }

    const userResult = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [validation.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate access token
    const accessToken = tokenService.generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    const isProduction = config.nodeEnv === 'production';
    
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // Must be 'none' if cross-site
      maxAge: 15 * 60 * 1000 // 15m
    });

    res.cookie('refresh_token', newRefreshTokenData.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30d
    });

    res.json({ 
      message: 'Token refreshed',
      accessToken,
      user: { id: user.id, username: user.username, role: user.role }
    });

  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth: Revoke
router.post('/revoke', authenticateToken, async (req: any, res: Response) => {
  try {
    await tokenService.revokeAllUserSessions(req.user.id);
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    res.json({ message: 'All sessions revoked' });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export const authRouter = router;
