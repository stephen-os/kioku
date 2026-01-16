import { invoke } from "@tauri-apps/api/core";
import type {
  User,
  LocalAuthResponse,
  CreateLocalUserRequest,
  LocalLoginRequest,
  RemoteLoginRequest,
  LinkAccountRequest,
} from "@/types";

// ============================================
// Auth Service
// ============================================

/**
 * Create a new local user account (works offline)
 */
export async function createLocalUser(
  request: CreateLocalUserRequest
): Promise<LocalAuthResponse> {
  return invoke<LocalAuthResponse>("create_local_user", { request });
}

/**
 * Login with local credentials (works offline)
 */
export async function loginLocal(
  request: LocalLoginRequest
): Promise<LocalAuthResponse> {
  return invoke<LocalAuthResponse>("login_local", { request });
}

/**
 * Login with remote server credentials
 * Creates or updates local user with remote account link
 */
export async function loginRemote(
  request: RemoteLoginRequest
): Promise<LocalAuthResponse> {
  return invoke<LocalAuthResponse>("login_remote", { request });
}

/**
 * Get the currently logged in user
 */
export async function getCurrentUser(): Promise<User | null> {
  return invoke<User | null>("get_current_user");
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  return invoke("logout");
}

/**
 * Link an existing local user to a remote account
 */
export async function linkRemoteAccount(
  userId: string,
  request: LinkAccountRequest
): Promise<User> {
  return invoke<User>("link_remote_account", { userId, request });
}

/**
 * Unlink a local user from their remote account
 * Keeps local data but removes sync capability
 */
export async function unlinkRemoteAccount(userId: string): Promise<User> {
  return invoke<User>("unlink_remote_account", { userId });
}

// ============================================
// Auth State Helpers
// ============================================

const USER_STORAGE_KEY = "kioku_current_user";

/**
 * Store user in localStorage (for quick access on app load)
 */
export function storeUser(user: User): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Get stored user from localStorage
 */
export function getStoredUser(): User | null {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

/**
 * Clear stored user from localStorage
 */
export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Check if a user is currently logged in
 */
export function isAuthenticated(): boolean {
  return getStoredUser() !== null;
}
