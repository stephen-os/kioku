import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  User,
  CreateLocalUserRequest,
  RemoteLoginRequest,
} from "@/types";
import {
  createLocalUser,
  loginRemote,
  logout as logoutService,
  getCurrentUser,
  storeUser,
  getStoredUser,
  clearStoredUser,
  isTauri,
} from "@/lib";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  createAccount: (request: CreateLocalUserRequest) => Promise<void>;
  loginWithRemote: (request: RemoteLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      try {
        // First check localStorage for quick load
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }

        // Then verify with Tauri backend
        if (isTauri()) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            storeUser(currentUser);
          } else if (storedUser) {
            // Backend doesn't have user but localStorage does - clear it
            clearStoredUser();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const createAccount = useCallback(
    async (request: CreateLocalUserRequest) => {
      const response = await createLocalUser(request);
      setUser(response.user);
      storeUser(response.user);
    },
    []
  );

  const loginWithRemote = useCallback(async (request: RemoteLoginRequest) => {
    const response = await loginRemote(request);
    setUser(response.user);
    storeUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isTauri()) {
        await logoutService();
      }
    } finally {
      clearStoredUser();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        createAccount,
        loginWithRemote,
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
