import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

export type UserRole = "user" | "admin" | "moderator";
export type AuthProvider = "local" | "google" | "apple";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string; // Real name (optional)
  displayName: string;
  password?: string; // Optional - set if user has email/password login
  role: UserRole;
  authProvider: AuthProvider; // Original signup method (kept for backwards compat)
  providerId?: string; // Deprecated - use googleId/appleId instead
  // Linked OAuth accounts (user can have multiple)
  googleId?: string; // Google OAuth ID (if linked)
  appleId?: string; // Apple OAuth ID (if linked)
  profilePicture?: string; // Profile picture URL from OAuth
  // Location preferences
  preferredCity?: string;
  preferredState?: string;
  latitude?: number;
  longitude?: number;
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Trusted contributor status - their contributions bypass moderation
  trustedContributor: boolean;
  trustedAt?: Date; // When they were marked as trusted
  trustedBy?: mongoose.Types.ObjectId; // Admin who marked them trusted
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  // Helper to check linked accounts
  hasPassword(): boolean;
  hasGoogle(): boolean;
  hasApple(): boolean;
}

const SALT_ROUNDS = 10;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        // Password is required only for local auth
        return this.authProvider === "local";
      },
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
    },
    providerId: {
      type: String,
      sparse: true, // Deprecated - use googleId/appleId instead
    },
    // Linked OAuth accounts
    googleId: {
      type: String,
      sparse: true,
    },
    appleId: {
      type: String,
      sparse: true,
    },
    profilePicture: {
      type: String,
    },
    // Location preferences
    preferredCity: {
      type: String,
      trim: true,
    },
    preferredState: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    // Password reset
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    // Trusted contributor status - their contributions bypass moderation
    trustedContributor: {
      type: Boolean,
      default: false,
    },
    trustedAt: {
      type: Date,
    },
    trustedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  try {
    const hashedPassword = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) {
    return false; // No password set
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Helper methods to check linked accounts
userSchema.methods.hasPassword = function (): boolean {
  return !!this.password;
};

userSchema.methods.hasGoogle = function (): boolean {
  return !!this.googleId;
};

userSchema.methods.hasApple = function (): boolean {
  return !!this.appleId;
};

// Note: email index is already created by `unique: true` in the schema
userSchema.index({ role: 1 });
userSchema.index({ authProvider: 1, providerId: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ appleId: 1 }, { sparse: true });

export const User = mongoose.model<IUser>("User", userSchema);
