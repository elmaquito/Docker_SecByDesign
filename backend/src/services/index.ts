// src/services/index.ts
import pool from '../db/pool';
import { config } from '../config/env';
import { TokenService } from '../auth/token.service';

export const tokenService = new TokenService(config.jwtSecret, config.refreshTokenSecret, pool);
