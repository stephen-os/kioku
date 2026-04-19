import { invoke } from "@tauri-apps/api/core";

export interface PiperVoice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  sizeMb: number;
  isInstalled: boolean;
  downloadUrl: string;
  configUrl: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  message: string;
}

/**
 * Check if Piper TTS engine is installed
 */
export async function isPiperInstalled(): Promise<boolean> {
  return invoke<boolean>("is_piper_installed");
}

/**
 * Get list of available Piper voices with installation status
 */
export async function getPiperVoices(): Promise<PiperVoice[]> {
  return invoke<PiperVoice[]>("get_piper_voices");
}

/**
 * Install the Piper TTS engine
 * Listen to 'piper-download-progress' event for progress updates
 */
export async function installPiper(): Promise<void> {
  return invoke("install_piper");
}

/**
 * Uninstall the Piper TTS engine (keeps voice models)
 */
export async function uninstallPiper(): Promise<void> {
  return invoke("uninstall_piper");
}

/**
 * Download a voice model
 * Listen to 'piper-download-progress' event for progress updates
 */
export async function downloadVoice(voiceId: string): Promise<void> {
  return invoke("download_voice", { voiceId });
}

/**
 * Delete a voice model
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  return invoke("delete_voice", { voiceId });
}

/**
 * Get total storage size used by Piper in bytes
 */
export async function getPiperStorageSize(): Promise<number> {
  return invoke<number>("get_piper_storage_size");
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
