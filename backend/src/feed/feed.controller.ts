
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { z } from 'zod';

const FeedQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  tag: z.string().optional(), // Single tag (legacy support)
  tags: z.string().optional(), // Comma-separated list of tags
  search: z.string().optional(), // Text search
});

export const getFeed = async (req: Request, res: Response) => {
  try {
    const { page, limit, tag, tags, search } = FeedQuerySchema.parse(req.query);
    const userId = req.user.id;
    const userRole = req.user.role;

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 1. Determine Access Conditions based on Role/Profile
    if (userRole === 'student') {
      // Get student profile AND tags
      const userRes = await pool.query(`
         SELECT p.classe, p.promotion, p.niveau,
                (SELECT array_agg(ut.tag_id) FROM user_tags ut WHERE ut.user_id = $1) as tag_ids
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = $1
      `, [userId]);
      
      const userData = userRes.rows[0] || {};
      const { classe, promotion, niveau, tag_ids } = userData;
      const validTagIds = tag_ids || [];

      // Target Conditions (note_targets)
      // Notes targeted to ALL, or user's class, promotion, niveau, or user directly
      const targetConditions: string[] = ["nt.target_type = 'all'"];

      if (classe) {
        targetConditions.push(`(nt.target_type = 'classe' AND nt.target_value = $${paramIndex++})`);
        queryParams.push(classe);
      }
      if (promotion) {
        targetConditions.push(`(nt.target_type = 'promotion' AND nt.target_value = $${paramIndex++})`);
        queryParams.push(promotion);
      }
      if (niveau) {
        targetConditions.push(`(nt.target_type = 'niveau' AND nt.target_value = $${paramIndex++})`);
        queryParams.push(niveau);
      }

      // Direct user target
      targetConditions.push(`(nt.target_type = 'user' AND nt.target_value = $${paramIndex++}::text)`);
      queryParams.push(userId.toString());

      // Clause: Is Targeted?
      const isTargetedClause = `
        EXISTS (
          SELECT 1 FROM note_targets nt
          WHERE nt.note_id = n.id AND (${targetConditions.join(' OR ')})
        )
      `;
      
      // Clause: Has Matching Tag? (Smart Feed for Groups/Specialties)
      let isTaggedClause = "FALSE";
      if (validTagIds.length > 0) {
         isTaggedClause = `
           EXISTS (
             SELECT 1 FROM note_tags ntg
             WHERE ntg.note_id = n.id AND ntg.tag_id = ANY($${paramIndex++}::int[])
           )
         `;
         queryParams.push(validTagIds);
      }
      
      // Clause: Is Owner?
      const isOwnerClause = `n.user_id = $${paramIndex++}`;
      queryParams.push(userId);

      // Combine Access Conditions
      whereConditions.push(`(${isTargetedClause} OR ${isTaggedClause} OR ${isOwnerClause})`);
      
    } else {
      // Admin/Teacher/Technician see all notes
      // No base filter needed
    }

    // 2. Add Tag Filter
    const tagList: string[] = [];
    if (tag) tagList.push(tag);
    if (tags) tagList.push(...tags.split(',').map(t => t.trim()).filter(Boolean));

    if (tagList.length > 0) {
       // Using ANY($X) for array matching
       const uniqueTags = Array.from(new Set(tagList));
       whereConditions.push(`
         EXISTS (
           SELECT 1 FROM note_tags ntg 
           JOIN tags tg ON ntg.tag_id = tg.id 
           WHERE ntg.note_id = n.id AND tg.name = ANY($${paramIndex++}::text[])
         )
       `);
       queryParams.push(uniqueTags);
    }

    // 3. Add Search
    if (search) {
       whereConditions.push(`(n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex})`);
       queryParams.push(`%${search}%`);
       paramIndex++; // Reuse or increment? PG usually needs separate instances if not named params, but here queryParams content is same so fine.
       // Actually let's just reuse the param index if we push same value twice, or push twice.
       // Easiest is to just use distinct param placeholders.
       // Wait, above line is `... ILIKE $X OR ... ILIKE $X`. Yes reusing $X is valid in PG.
    }

    // Construct WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : "";

    // 4. Pagination Params
    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    queryParams.push(limit);
    const offset = (page - 1) * limit;
    queryParams.push(offset); // Wait, offset needs to be calculated
    
    // 5. Main Query
    const query = `
      SELECT n.*, u.username as owner_username, u.role as owner_role,
             COALESCE(
               (
                 SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name, 'type', tg.type, 'meta', tg.meta))
                 FROM note_tags nt_join
                 JOIN tags tg ON nt_join.tag_id = tg.id
                 WHERE nt_join.note_id = n.id
               ),
               '[]'::json
             ) as tags,
             COALESCE(
               (
                 SELECT json_agg(json_build_object('type', nt.target_type, 'value', nt.target_value))
                 FROM note_targets nt
                 WHERE nt.note_id = n.id
               ),
               '[]'::json
             ) as targets
      FROM notes n
      JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.pinned DESC, n.urgent DESC, n.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(query, queryParams);

    // 6. Total Count Query (re-use where clause but remove limit/offset params)
    const countQuery = `SELECT COUNT(*) FROM notes n ${whereClause}`; 
    // The queryParams array currently has [..., limit, offset] at the end.
    // We need all params EXCEPT the last two (limit, offset).
    const countParams = queryParams.slice(0, -2);
    
    // Special handling for search reuse of index
    // If search used $X twice, that's fine as long as countParams has the value at match index.
    
    const countRes = await pool.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].count);

    const notes = result.rows.map((r: any) => ({
      ...r,
      tags: r.tags || [],
      targets: r.targets || [],
    }));

    res.json({
      data: notes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error('Error fetching feed:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};
