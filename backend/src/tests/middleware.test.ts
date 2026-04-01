import { authenticate, authorize } from '../common/middleware';
import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../auth/token.service';

// Mock dependencies
jest.mock('../auth/token.service');
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      cookies: {},
      headers: {},
      method: 'GET',
      path: '/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 if no tokens provided', async () => {
      await authenticate(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: No authentication token' });
    });

    it('should call next if valid access token provided', async () => {
        req.cookies = { auth_token: 'valid_token' };
        
        // Mock verifyAccessToken
        (TokenService.prototype.verifyAccessToken as jest.Mock).mockReturnValue({
            id: 1,
            username: 'test',
            role: 'student'
        });

        await authenticate(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({ id: 1, username: 'test', role: 'student' });
    });
  });

  describe('authorize', () => {
    it('should call next if user has allowed role', () => {
      req.user = { id: 1, username: 'test', role: 'admin' };
      const middleware = authorize(['admin', 'technician']);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user does not have allowed role', () => {
      req.user = { id: 1, username: 'test', role: 'student' };
      const middleware = authorize(['admin', 'technician']);
      middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
    });
  });
});
