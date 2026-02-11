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
  login: (userId: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (request: CreateUserRequest) => Promise<LocalUser>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load users and check for active session on mount
  const loadInitialState = useCallback(async () => {
    try {
      const [allUsers, activeUser] = await Promise.all([
        getAllUsers(),
        getActiveUser(),
      ]);
      setUsers(allUsers);
      setUser(activeUser);
    } catch (error) {
      console.error("Failed to load initial state:", error);
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
        login,
        logout,
        createUser,
        refreshUsers,
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
