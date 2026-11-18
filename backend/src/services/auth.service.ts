import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/user.model.js';
import { config } from '../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/error.middleware.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export class AuthService {
  private generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  async register(data: RegisterDTO): Promise<AuthResponse> {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = new User({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: 'user', // Default role for self-registration
    });

    await user.save();

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async getAllUsers() {
    const users = await User.find({}).sort({ createdAt: -1 });
    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }
}

export const authService = new AuthService();
