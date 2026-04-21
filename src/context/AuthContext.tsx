import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { LocalUser, CreateUserRequest } from "@/types";
import {
  getAllUsers,
  getActiveUser,
  createUser as createUserService,
  loginUser as loginUserService,
  logoutUser as logoutUserService,
} from "@/lib/db";

interface AuthContextType {
  user: LocalUser | null;
  users: LocalUser[];
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Error from initial load, null if successful */
  loadError: string | null;
  login: (userId: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (request: CreateUserRequest) => Promise<LocalUser>;
  refreshUsers: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load users and check for active session on mount
  const loadInitialState = useCallback(async () => {
    try {
      setLoadError(null);
      const [allUsers, activeUser] = await Promise.all([
        getAllUsers(),
        getActiveUser(),
      ]);
      setUsers(allUsers);
      setUser(activeUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load user data";
      console.error("Failed to load initial state:", error);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  const refreshUsers = useCallback(async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to refresh users:", error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const activeUser = await getActiveUser();
      setUser(activeUser);
      await refreshUsers();
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [refreshUsers]);

  const login = useCallback(async (userId: string, password?: string) => {
    const loggedInUser = await loginUserService(userId, password);
    setUser(loggedInUser);
    await refreshUsers(); // Refresh to update lastLoginAt
  }, [refreshUsers]);

  const logout = useCallback(async () => {
    try {
      await logoutUserService();
    } finally {
      setUser(null);
    }
  }, []);

  const createUser = useCallback(async (request: CreateUserRequest) => {
    const newUser = await createUserService(request);
    await refreshUsers();
    return newUser;
  }, [refreshUsers]);

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isLoading,
        isAuthenticated: user !== null,
        loadError,
        login,
        logout,
        createUser,
        refreshUsers,
        refreshUser,
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
