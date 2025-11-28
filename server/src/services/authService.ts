import { User, IUser, UserRole } from '../models/User';
import { generateToken } from '../utils/jwt';

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
  };
  token: string;
}

export interface AuthError {
  message: string;
  field?: string;
}

class AuthServiceError extends Error {
  field?: string;
  statusCode: number;

  constructor(message: string, statusCode: number = 400, field?: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const authService = {
  /**
   * Register a new user
   */
  async signup(input: SignupInput): Promise<AuthResult> {
    const { email, password, displayName } = input;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthServiceError('Invalid email format', 400, 'email');
    }

    // Validate password length
    if (password.length < 8) {
      throw new AuthServiceError('Password must be at least 8 characters', 400, 'password');
    }

    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      throw new AuthServiceError('Display name must be at least 2 characters', 400, 'displayName');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AuthServiceError('Email already registered', 409, 'email');
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      displayName: displayName.trim(),
      role: 'user',
    });

    // Generate token
    const token = generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    };
  },

  /**
   * Login an existing user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthServiceError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthServiceError('Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      token,
    };
  },

  /**
   * Get user by ID (for /me endpoint)
   */
  async getUserById(userId: string): Promise<AuthResult['user'] | null> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: { displayName?: string; email?: string }
  ): Promise<AuthResult['user'] | null> {
    const updateData: Record<string, string> = {};
    
    if (updates.displayName && updates.displayName.trim().length >= 2) {
      updateData.displayName = updates.displayName.trim();
    }
    
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new AuthServiceError('Invalid email format', 400, 'email');
      }
      
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: updates.email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingUser) {
        throw new AuthServiceError('Email already in use', 409, 'email');
      }
      
      updateData.email = updates.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  },

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthServiceError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AuthServiceError('Current password is incorrect', 401, 'currentPassword');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new AuthServiceError('New password must be at least 8 characters', 400, 'newPassword');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return true;
  },
};

export { AuthServiceError };

