import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password });
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      res.status(200).json({
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await authService.getAllUsers();
      res.status(200).json({
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
