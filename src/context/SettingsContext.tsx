import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { AppSettings, EditorSettings, SidebarSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import {
  loadSettings,
  saveSettings,
  updateEditorSettings,
  updateSidebarSettings,
  resetSettings,
} from "@/lib/settings";

interface SettingsContextType {
  settings: AppSettings;
  updateEditor: (updates: Partial<EditorSettings>) => void;
  updateSidebar: (updates: Partial<SidebarSettings>) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  const updateEditor = useCallback((updates: Partial<EditorSettings>) => {
    setSettings((current) => {
      const updated = updateEditorSettings(current, updates);
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateSidebar = useCallback((updates: Partial<SidebarSettings>) => {
    setSettings((current) => {
      const updated = updateSidebarSettings(current, updates);
      saveSettings(updated);
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = resetSettings();
    setSettings(defaults);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateEditor,
        updateSidebar,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
