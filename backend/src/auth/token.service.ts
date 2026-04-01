import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../config/env';
import { pool } from '../config/database';

import { Role } from '../common/types';

export interface TokenPayload {
    id: number;
    username: string;
    role: Role;
}

export interface RefreshTokenData {
    token: string;
    tokenHash: string;
    expiresAt: Date;
}

export class TokenService {
    private jwtSecret: string;
    private refreshTokenSecret: string;
    private pool: Pool;

    // Token TTLs
    private readonly ACCESS_TOKEN_TTL = '15m'; // 15 minutes
    private readonly REFRESH_TOKEN_TTL_DAYS = 30; // 30 days

    constructor(jwtSecret?: string, refreshTokenSecret?: string, poolInstance?: Pool) {
        this.jwtSecret = jwtSecret || JWT_SECRET;
        this.refreshTokenSecret = refreshTokenSecret || REFRESH_TOKEN_SECRET;
        this.pool = poolInstance || pool;
    }

  /**
   * Generate JWT access token (short-lived)
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.ACCESS_TOKEN_TTL });
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (_err) {
      return null;
    }
  }

  /**
   * Generate opaque refresh token (cryptographically secure random)
   */
  generateRefreshToken(): RefreshTokenData {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    
    return { token, tokenHash, expiresAt };
  }

  /**
   * Hash token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token + this.refreshTokenSecret).digest('hex');
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [userId, tokenHash, expiresAt, userAgent, ipAddress]
    );
    return result.rows[0].id;
  }

  /**
   * Validate refresh token and return user data
   * Returns null if token is invalid, expired, or revoked
   */
  async validateRefreshToken(token: string): Promise<{ userId: number; sessionId: number } | null> {
    const tokenHash = this.hashToken(token);
    
    const result = await this.pool.query(
      `SELECT id, user_id 
       FROM sessions 
       WHERE refresh_token_hash = $1 
         AND expires_at > NOW() 
         AND revoked = FALSE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      userId: result.rows[0].user_id,
      sessionId: result.rows[0].id
    };
  }

  /**
   * Rotate refresh token (atomic operation)
   * 1. Validate incoming token
   * 2. Revoke old token
   * 3. Generate and store new token
   * Returns new refresh token or null if validation fails
   */
  async rotateRefreshToken(
    oldToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<RefreshTokenData | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate old token
      const validation = await this.validateRefreshToken(oldToken);
      if (!validation) {
        await client.query('ROLLBACK');
        return null;
      }

      const { userId, sessionId } = validation;

      // Revoke old token
      await client.query(
        'UPDATE sessions SET revoked = TRUE WHERE id = $1',
        [sessionId]
      );

      // Generate new token
      const newRefreshToken = this.generateRefreshToken();

      // Store new token
      await client.query(
        `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, newRefreshToken.tokenHash, newRefreshToken.expiresAt, userAgent, ipAddress]
      );

      await client.query('COMMIT');
      
      return newRefreshToken;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Token rotation error:', err);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all sessions for a user (logout all devices)
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
      [userId]
    );
  }

  /**
   * Revoke specific session by token
   */
  async revokeSession(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    
    const result = await this.pool.query(
      'UPDATE sessions SET revoked = TRUE WHERE refresh_token_hash = $1 AND revoked = FALSE',
      [tokenHash]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Clean up expired and old revoked sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Delete sessions that expired more than 7 days ago or were revoked more than 7 days ago
    const result = await this.pool.query(
      `DELETE FROM sessions 
       WHERE (expires_at < NOW() - INTERVAL '7 days') 
          OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days')`
    );

    return result.rowCount || 0;
  }
}
