import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, LoginRequest } from "@/types";
import {
  login as loginService,
  logout as logoutService,
  getSession,
  isTauri,
} from "@/lib/auth";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount (for auto-login)
  useEffect(() => {
    async function loadSession() {
      try {
        if (isTauri()) {
          const existingSession = await getSession();
          if (existingSession) {
            setSession(existingSession);
          }
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    const newSession = await loginService(request);
    setSession(newSession);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isTauri()) {
        await logoutService();
      }
    } finally {
      setSession(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isAuthenticated: session !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
