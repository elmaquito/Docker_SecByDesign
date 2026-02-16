import { Pool } from 'pg';

export interface Category {
  id?: number;
  name: string;
  description?: string;
  target_type: 'classe' | 'promotion' | 'niveau' | 'all';
  target_value?: string;
}

export class CategoryService {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getAllCategories() {
    const query = 'SELECT * FROM categories ORDER BY name ASC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async createCategory(category: Category) {
    const query = `
      INSERT INTO categories (name, description, target_type, target_value)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [category.name, category.description, category.target_type, category.target_value];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}
