export type Role = 'admin' | 'technician' | 'teacher' | 'student';

export interface User {
  id: number;
  username: string;
  role: Role;
  email?: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
