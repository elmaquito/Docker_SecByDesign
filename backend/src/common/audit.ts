import { pool } from '../config/database';

export interface AuditLogParams {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(params: AuditLogParams): Promise<void> {
    const { userId, action, entityType, entityId, details, ipAddress, userAgent } = params;

    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, entityType, entityId, details, ipAddress, userAgent]
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // We don't want to crash the request if logging fails, but we should know about it.
    }
  }
}
