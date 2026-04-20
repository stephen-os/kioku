import type { AppSettings, EditorSettings, SidebarSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { loadFromStorage, saveToStorage } from "./storage";

const STORAGE_KEY = "kioku-settings";

/**
 * Load settings from localStorage, merging with defaults
 */
export function loadSettings(): AppSettings {
  const stored = loadFromStorage<Partial<AppSettings> | null>(STORAGE_KEY, null);

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  // Deep merge with defaults to handle new settings added in updates
  return {
    editor: {
      ...DEFAULT_SETTINGS.editor,
      ...stored.editor,
    },
    sidebar: {
      ...DEFAULT_SETTINGS.sidebar,
      ...stored.sidebar,
    },
  };
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  saveToStorage(STORAGE_KEY, settings);
}

/**
 * Update a specific section of settings
 */
export function updateEditorSettings(
  current: AppSettings,
  updates: Partial<EditorSettings>
): AppSettings {
  return {
    ...current,
    editor: {
      ...current.editor,
      ...updates,
    },
  };
}

export function updateSidebarSettings(
  current: AppSettings,
  updates: Partial<SidebarSettings>
): AppSettings {
  return {
    ...current,
    sidebar: {
      ...current.sidebar,
      ...updates,
    },
  };
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): AppSettings {
  saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
