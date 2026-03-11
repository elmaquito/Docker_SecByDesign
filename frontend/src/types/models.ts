// User model
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  email?: string;
  phone?: string;
  created_at?: string; // ISO Date string
  updated_at?: string; // ISO Date string
  profile?: UserProfile;
}

export interface UserProfile {
  id: number;
  user_id: number;
  classe?: string;
  promo?: string;
  niveau?: string;
}

// Note model
export interface Note {
  id: number;
  title: string;
  content: string;
  author_id: number;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  reactions?: Reaction[];
}

// Tag model (Unified Tags)
export type TagType = 'classe' | 'specialite' | 'groupe' | 'categorie';

export interface Tag {
  id: number;
  type: TagType;
  name: string;
  meta?: TagMeta;
  is_default_for_student_view: boolean;
  created_by?: number;
  created_at?: string;
}

export interface TagMeta {
  color?: string;
  icon?: string;
  description?: string;
  [key: string]: any;
}

// Reactions
export interface Reaction {
  id: number;
  note_id: number;
  user_id: number;
  type: 'like' | 'dislike' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

// Audit & GDPR
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any; // JSON
  ip_address?: string;
  created_at: string;
}

export interface GdprExportRequest {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  completed_at?: string;
  file_url?: string;
}
