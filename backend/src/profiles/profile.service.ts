import { Pool } from 'pg';

export interface CreateProfileDto {
  userId: number;
  classe?: string;
  promotion?: string;
  niveau?: string;
}

export interface UpdateProfileDto {
  classe?: string;
  promotion?: string;
  niveau?: string;
}

export class ProfileService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createProfile(data: CreateProfileDto) {
    const query = `
      INSERT INTO profiles (user_id, classe, promotion, niveau)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [data.userId, data.classe, data.promotion, data.niveau];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getProfileByUserId(userId: number) {
    const query = `SELECT * FROM profiles WHERE user_id = $1`;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async updateProfile(userId: number, data: UpdateProfileDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.classe !== undefined) {
      fields.push(`classe = $${idx++}`);
      values.push(data.classe);
    }
    if (data.promotion !== undefined) {
      fields.push(`promotion = $${idx++}`);
      values.push(data.promotion);
    }
    if (data.niveau !== undefined) {
      fields.push(`niveau = $${idx++}`);
      values.push(data.niveau);
    }

    if (fields.length === 0) return null;

    values.push(userId);
    const query = `
      UPDATE profiles
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${idx}
      RETURNING *;
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}
