import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { httpClient } from '../api/httpClient';
import { User, AuthState, SignupInput, LoginInput } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (input: LoginInput) => Promise<{ success: boolean; error?: string }>;
  signup: (input: SignupInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = httpClient.getToken();
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        
        const response = await Promise.race([
          authApi.getMe(),
          timeoutPromise
        ]) as { user: User };
        
        setUser(response.user);
        setToken(storedToken);
      } catch (error) {
        // Token is invalid or expired, or request timed out
        console.error('Failed to load user:', error);
        httpClient.removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.login(input);
      
      // Store token
      httpClient.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: message };
    }
  }, []);

  const signup = useCallback(async (input: SignupInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.signup(input);
      
      // Store token
      httpClient.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    httpClient.removeToken();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    isAdmin,
    login,
    signup,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export { AuthContext };

