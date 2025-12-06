import { User, IUser, AuthProvider } from '../models/User';
import { generateToken } from '../utils/jwt';
import fs from 'fs';
import path from 'path';

/**
 * Get Apple private key from environment variable or file
 * Supports both local development (file) and production (env var)
 */
function getApplePrivateKey(): string | null {
  // First try environment variable (for Render/production)
  if (process.env.APPLE_PRIVATE_KEY) {
    // Replace literal \n with actual newlines
    return process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  
  // Fall back to file path (for local development)
  if (process.env.APPLE_PRIVATE_KEY_PATH) {
    try {
      const keyPath = path.resolve(process.cwd(), process.env.APPLE_PRIVATE_KEY_PATH);
      return fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error('Failed to read Apple private key file:', error);
      return null;
    }
  }
  
  return null;
}

export interface OAuthUserData {
  email: string;
  name?: string;
  displayName: string;
  providerId: string;
  profilePicture?: string;
}

export interface OAuthResult {
  user: {
    id: string;
    email: string;
    name?: string;
    displayName: string;
    role: string;
    profilePicture?: string;
    authProvider: AuthProvider;
  };
  token: string;
  isNewUser: boolean;
}

class OAuthServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'OAuthServiceError';
    this.statusCode = statusCode;
  }
}

export const oauthService = {
  /**
   * Authenticate or register a user via OAuth
   */
  async authenticateOAuth(
    provider: AuthProvider,
    userData: OAuthUserData
  ): Promise<OAuthResult> {
    const { email, name, displayName, providerId, profilePicture } = userData;

    if (!email) {
      throw new OAuthServiceError('Email is required from OAuth provider', 400);
    }

    // First, try to find user by provider and providerId
    let user = await User.findOne({
      authProvider: provider,
      providerId: providerId,
    });

    let isNewUser = false;

    if (user) {
      // Existing OAuth user - update their info and login
      user.lastLogin = new Date();
      if (profilePicture) {
        user.profilePicture = profilePicture;
      }
      if (name) {
        user.name = name;
      }
      await user.save();
    } else {
      // Check if a user with this email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        // User exists with this email but different auth method
        if (existingUser.authProvider === 'local') {
          // Allow linking if they originally signed up with email/password
          // Update their account to include OAuth provider info
          existingUser.authProvider = provider;
          existingUser.providerId = providerId;
          if (profilePicture) {
            existingUser.profilePicture = profilePicture;
          }
          existingUser.lastLogin = new Date();
          await existingUser.save();
          user = existingUser;
        } else {
          // They used a different OAuth provider
          throw new OAuthServiceError(
            `This email is already registered with ${existingUser.authProvider}. Please sign in using that method.`,
            409
          );
        }
      } else {
        // Create new user
        user = await User.create({
          email: email.toLowerCase(),
          name: name || undefined,
          displayName: displayName || name || email.split('@')[0],
          authProvider: provider,
          providerId: providerId,
          profilePicture: profilePicture || undefined,
          role: 'user',
          lastLogin: new Date(),
        });
        isNewUser = true;
      }
    }

    // Generate JWT token
    const token = generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        profilePicture: user.profilePicture,
        authProvider: user.authProvider,
      },
      token,
      isNewUser,
    };
  },

  /**
   * Verify Google token and extract user info
   * Supports both ID tokens (JWT) and access tokens
   */
  async verifyGoogleToken(token: string): Promise<OAuthUserData> {
    try {
      // Check if it's a JWT (ID token) or an access token
      const isJWT = token.split('.').length === 3;
      
      if (isJWT) {
        // Handle ID token (from Google One Tap or credential response)
        const parts = token.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        if (!payload.email) {
          throw new OAuthServiceError('No email in Google token', 400);
        }

        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          throw new OAuthServiceError('Google token has expired', 401);
        }

        return {
          email: payload.email,
          name: payload.name,
          displayName: payload.name || payload.email.split('@')[0],
          providerId: payload.sub,
          profilePicture: payload.picture,
        };
      } else {
        // Handle access token (from useGoogleLogin)
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
        );

        if (!response.ok) {
          throw new OAuthServiceError('Invalid Google access token', 401);
        }

        const userInfo = await response.json() as {
          email?: string;
          name?: string;
          sub?: string;
          picture?: string;
        };

        if (!userInfo.email) {
          throw new OAuthServiceError('No email in Google response', 400);
        }

        return {
          email: userInfo.email,
          name: userInfo.name,
          displayName: userInfo.name || userInfo.email.split('@')[0],
          providerId: userInfo.sub || '',
          profilePicture: userInfo.picture,
        };
      }
    } catch (error) {
      if (error instanceof OAuthServiceError) {
        throw error;
      }
      console.error('Google token verification error:', error);
      throw new OAuthServiceError('Failed to verify Google token', 400);
    }
  },

  /**
   * Verify Apple identity token and extract user info
   * In production, you should verify the token with Apple's servers
   */
  async verifyAppleToken(
    identityToken: string,
    userData?: { name?: string; email?: string }
  ): Promise<OAuthUserData> {
    try {
      // Decode the JWT token (in production, verify signature with Apple's public keys)
      const parts = identityToken.split('.');
      if (parts.length !== 3) {
        throw new OAuthServiceError('Invalid Apple token format', 400);
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Apple only provides email on first login, so we might need to use provided userData
      const email = payload.email || userData?.email;
      if (!email) {
        throw new OAuthServiceError('No email available from Apple sign-in', 400);
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new OAuthServiceError('Apple token has expired', 401);
      }

      return {
        email: email,
        name: userData?.name,
        displayName: userData?.name || email.split('@')[0],
        providerId: payload.sub,
      };
    } catch (error) {
      if (error instanceof OAuthServiceError) {
        throw error;
      }
      throw new OAuthServiceError('Failed to verify Apple token', 400);
    }
  },
};

export { OAuthServiceError };

