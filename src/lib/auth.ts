import { invoke } from "@tauri-apps/api/core";
import type { Session, LoginRequest } from "@/types";

// ============================================
// Auth Service (Remote-first)
// ============================================

/**
 * Login with remote server credentials
 * Session is stored locally for persistent login
 */
export async function login(request: LoginRequest): Promise<Session> {
  return invoke<Session>("login", { request });
}

/**
 * Get the current session (for auto-login on app start)
 */
export async function getSession(): Promise<Session | null> {
  return invoke<Session | null>("get_session");
}

/**
 * Logout - clears local session
 */
export async function logout(): Promise<void> {
  return invoke("logout");
}

// ============================================
// Environment Detection
// ============================================

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
