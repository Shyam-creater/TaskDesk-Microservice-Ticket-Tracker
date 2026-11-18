import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService = authService) {
    this.service = service;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        });
        return;
      }
      const user = await this.service.getMe(userId);
      res.status(200).json({
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
