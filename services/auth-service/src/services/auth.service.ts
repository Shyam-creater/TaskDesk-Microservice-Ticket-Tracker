import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/error.middleware';
import { userLoginsTotal, userRegistrationsTotal } from '../observability/metrics';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  token: string;
}

export class AuthService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      userRegistrationsTotal.labels('failure').inc();
      throw new ConflictError('A user with this email address already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await this.userRepo.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    const token = this.generateToken(user._id.toString(), user.email, user.role);
    userRegistrationsTotal.labels('success').inc();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepo.findByEmailWithPassword(input.email);
    if (!user) {
      userLoginsTotal.labels('failure').inc();
      // Generic error message for security - prevents email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      userLoginsTotal.labels('failure').inc();
      // Generic error message
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user._id.toString(), user.email, user.role);
    userLoginsTotal.labels('success').inc();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.findById(userId);
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

  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      {
        id: userId,
        email,
        role,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.JWT_EXPIRES_IN,
      } as jwt.SignOptions
    );
  }
}

export const authService = new AuthService();
