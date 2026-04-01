import { Request, Response } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { pool } from '../config/database';
import { TokenService } from './token.service';
import { loginSchema, passwordResetRequestSchema, passwordResetCompleteSchema } from './auth.schema';
import { generateToken, hashToken, sendEmail } from '../common/utils';
import { NODE_ENV } from '../config/env';
import { User } from '../common/types';

interface UserRequest extends Request {
  user: User;
}

const tokenService = new TokenService();

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate access token (short-lived JWT)
    const accessToken = tokenService.generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    // Generate refresh token (long-lived opaque token)
    const refreshTokenData = tokenService.generateRefreshToken();
    
    // Store refresh token in database
    await tokenService.storeRefreshToken(
      user.id,
      refreshTokenData.tokenHash,
      refreshTokenData.expiresAt,
      req.headers['user-agent'],
      req.ip
    );

    console.log(`[Login] User authenticated: ${user.username} (${user.role})`);

    // Cookie settings based on environment
    const isProduction = NODE_ENV === 'production';
    
    // Set access token cookie (short-lived)
    res.cookie('auth_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Set refresh token cookie (long-lived)
    res.cookie('refresh_token', refreshTokenData.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ 
      message: 'Logged in', 
      user: { id: user.id, username: user.username, role: user.role },
      accessToken // Return in response for client-side use if needed
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const logout = async (req: UserRequest, res: Response) => {
  try {
    const refreshToken = req.cookies['refresh_token'];
    
    // Revoke refresh token if present
    if (refreshToken) {
      await tokenService.revokeSession(refreshToken);
    }
    
    // Clear cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    
    console.log(`[Logout] User logged out: ${req.user.username}`);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const oldRefreshToken = req.cookies['refresh_token'];
    
    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Rotate refresh token (validates, revokes old, creates new)
    const newRefreshTokenData = await tokenService.rotateRefreshToken(
      oldRefreshToken,
      req.headers['user-agent'],
      req.ip || ''
    );

    if (!newRefreshTokenData) {
      console.log('[Refresh] Failed: Invalid or expired refresh token');
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user data for new access token
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

    // Generate new access token
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

    // Set new refresh token cookie
    res.cookie('refresh_token', newRefreshTokenData.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    console.log(`[Refresh] Token rotated for user: ${user.username}`);
    res.json({ 
      message: 'Token refreshed',
      accessToken: newAccessToken,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const revoke = async (req: UserRequest, res: Response) => {
  try {
    await tokenService.revokeAllUserSessions(req.user.id);
    
    // Clear cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    
    console.log(`[Revoke] All sessions revoked for user: ${req.user.username}`);
    res.json({ message: 'All sessions revoked' });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { username } = passwordResetRequestSchema.parse(req.body);
    
    // Find user by username
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE username = $1',
      [username]
    );
    
    // Always return success (don't reveal if user exists)
    if (result.rows.length === 0) {
      return res.json({ 
        message: 'If an account exists with this username, a password reset link has been sent.' 
      });
    }
    
    const user = result.rows[0];
    
    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, tokenHash, expiresAt, req.ip]
    );
    
    // Create reset link
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    
    // Send email (console log for MVP)
    await sendEmail(
      user.email || user.username,
      'Password Reset Request',
      `Click here to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
    );
    
    res.json({ 
      message: 'If an account exists with this username, a password reset link has been sent.',
      resetLink // Only for MVP/dev - remove in production
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Password reset request error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const completePasswordReset = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = passwordResetCompleteSchema.parse(req.body);
    
    const tokenHash = hashToken(token);
    
    // Find valid token
    const result = await pool.query(
      `SELECT prt.*, u.id as user_id, u.username 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token_hash = $1 
         AND prt.expires_at > NOW() 
         AND prt.used_at IS NULL`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const resetToken = result.rows[0];
    
    // Hash new password
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );
    
    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error('Password reset complete error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
