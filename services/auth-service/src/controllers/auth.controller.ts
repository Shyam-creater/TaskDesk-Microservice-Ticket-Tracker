import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/error.middleware.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured in environment');
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
        role: 'user',
      });

      await user.save();

      const token = this.generateToken(user);
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
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = this.generateToken(user);
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
      const currentUser = req.user!;
      const user = await User.findById(currentUser.id);
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

  // GET /api/auth/users (Admin only)
  async getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
      res.status(200).json({
        data: {
          users: users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /internal/users?ids=id1,id2,... (Internal inter-service call)
  async getInternalUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idsParam = req.query.ids as string;
      const query = idsParam ? { _id: { $in: idsParam.split(',').filter(Boolean) } } : {};
      const users = await User.find(query, 'name email role');

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
