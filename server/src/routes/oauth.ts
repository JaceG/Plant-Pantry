import { Router, Request, Response, NextFunction } from "express";
import { oauthService, OAuthServiceError } from "../services/oauthService";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/**
 * POST /api/oauth/google
 * Authenticate with Google
 */
router.post(
  "/google",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        throw new HttpError("Google credential is required", 400);
      }

      // Verify the Google token and extract user data
      const userData = await oauthService.verifyGoogleToken(credential);

      // Authenticate or create the user
      const result = await oauthService.authenticateOAuth("google", userData);

      res.json({
        message: result.isNewUser
          ? "Account created successfully"
          : "Login successful",
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      if (error instanceof OAuthServiceError) {
        next(new HttpError(error.message, error.statusCode));
      } else {
        console.error("Google OAuth error:", error);
        next(new HttpError("Google authentication failed", 500));
      }
    }
  },
);

/**
 * POST /api/oauth/apple
 * Authenticate with Apple
 */
router.post(
  "/apple",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identityToken, user } = req.body;

      if (!identityToken) {
        throw new HttpError("Apple identity token is required", 400);
      }

      // Verify the Apple token and extract user data
      // Note: Apple only provides user info (name, email) on the first sign-in
      const userData = await oauthService.verifyAppleToken(identityToken, user);

      // Authenticate or create the user
      const result = await oauthService.authenticateOAuth("apple", userData);

      res.json({
        message: result.isNewUser
          ? "Account created successfully"
          : "Login successful",
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error) {
      if (error instanceof OAuthServiceError) {
        next(new HttpError(error.message, error.statusCode));
      } else {
        console.error("Apple OAuth error:", error);
        next(new HttpError("Apple authentication failed", 500));
      }
    }
  },
);

export default router;
