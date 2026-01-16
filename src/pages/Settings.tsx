import { useState } from "react";

interface Settings {
  apiUrl: string;
  autoSync: boolean;
  syncInterval: number;
}

export function Settings() {
  const [settings, setSettings] = useState<Settings>({
    apiUrl: "http://localhost:8080/api",
    autoSync: true,
    syncInterval: 5,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: Save settings to local storage / Tauri store
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-xl mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="card space-y-6">
        {/* API URL */}
        <div>
          <label
            htmlFor="apiUrl"
            className="block text-sm font-medium text-foreground-dim mb-1"
          >
            API Server URL
          </label>
          <input
            id="apiUrl"
            type="url"
            value={settings.apiUrl}
            onChange={(e) =>
              setSettings((s) => ({ ...s, apiUrl: e.target.value }))
            }
            className="input"
            placeholder="https://api.kioku.app"
          />
          <p className="text-xs text-foreground-dim mt-1">
            URL of the Kioku API server for syncing
          </p>
        </div>

        {/* Auto Sync */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground">
              Auto Sync
            </label>
            <p className="text-xs text-foreground-dim">
              Automatically sync changes when online
            </p>
          </div>
          <button
            onClick={() =>
              setSettings((s) => ({ ...s, autoSync: !s.autoSync }))
            }
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.autoSync ? "bg-green" : "bg-background-lighter"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-foreground rounded-full transition-transform ${
                settings.autoSync ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Sync Interval */}
        <div>
          <label
            htmlFor="syncInterval"
            className="block text-sm font-medium text-foreground-dim mb-1"
          >
            Sync Interval (minutes)
          </label>
          <select
            id="syncInterval"
            value={settings.syncInterval}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                syncInterval: parseInt(e.target.value),
              }))
            }
            className="input"
            disabled={!settings.autoSync}
          >
            <option value={1}>1 minute</option>
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>

        {/* Data Management */}
        <div className="border-t border-background-lighter pt-6">
          <h2 className="text-lg font-semibold mb-4">Data Management</h2>

          <div className="space-y-3">
            <button className="btn btn-secondary w-full">
              Export All Data
            </button>
            <button className="btn btn-secondary w-full">
              Import Data
            </button>
            <button className="btn btn-danger w-full">
              Clear Local Data
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-4">
          {saved && (
            <span className="text-green text-sm">Settings saved!</span>
          )}
          <button onClick={handleSave} className="btn btn-primary ml-auto">
            Save Settings
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-2">About Kioku Desktop</h2>
        <p className="text-foreground-dim text-sm">
          Version 0.1.0
        </p>
        <p className="text-foreground-dim text-sm mt-2">
          A flashcard study app with offline support. Your decks sync
          automatically when you're online, and work offline when you're not.
        </p>
      </div>
    </div>
  );
}
