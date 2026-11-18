import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../middleware/error.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured in .env');
  }
  return secret;
}

export class AuthController {
  private generateToken(user: IUser): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      getJwtSecret(),
      { expiresIn }
    );
  }

  // POST /api/auth/register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || name.trim().length < 2) {
        throw new BadRequestError('Name must be at least 2 characters long');
      }
      if (!email || !email.includes('@')) {
        throw new BadRequestError('A valid email address is required');
      }
      if (!password || password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters long');
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw new ConflictError('A user with this email address already exists');
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'user', // Default role for self-registration
      });

      await user.save();

      const token = authController.generateToken(user);
      res.status(201).json({
        data: {
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Please provide both email and password');
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = authController.generateToken(user);
      res.status(200).json({
        data: {
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      res.status(200).json({
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/users
  async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.find({}).sort({ createdAt: -1 });
      res.status(200).json({
        data: {
          users: users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
