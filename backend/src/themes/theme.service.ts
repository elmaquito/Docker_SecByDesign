import { Pool } from 'pg';

export interface Theme {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  created_by?: number;
}

export class ThemeService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getAllThemes() {
    const result = await this.pool.query('SELECT * FROM themes ORDER BY name ASC');
    return result.rows;
  }

  async getThemeById(id: number) {
    const result = await this.pool.query('SELECT * FROM themes WHERE id = $1', [id]);
    return result.rows[0];
  }

  async createTheme(theme: Theme) {
    const query = `
      INSERT INTO themes (name, description, color, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [theme.name, theme.description, theme.color, theme.created_by];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTheme(id: number, theme: Partial<Theme>) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (theme.name) {
      fields.push(`name = $${idx++}`);
      values.push(theme.name);
    }
    if (theme.description) {
      fields.push(`description = $${idx++}`);
      values.push(theme.description);
    }
    if (theme.color) {
      fields.push(`color = $${idx++}`);
      values.push(theme.color);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE themes SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx}
      RETURNING *;
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteTheme(id: number) {
    await this.pool.query('DELETE FROM themes WHERE id = $1', [id]);
  }
}
