import { User, IUser, UserRole } from '../models/user.model';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export class UserRepository {
  async create(data: CreateUserData): Promise<IUser> {
    const user = new User({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role || 'user',
    });
    return await user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  async findAll(): Promise<IUser[]> {
    return await User.find({}).sort({ createdAt: -1 });
  }
}

export const userRepository = new UserRepository();
