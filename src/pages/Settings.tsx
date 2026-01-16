import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function Settings() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green/10 border border-green/30 rounded-lg">
            <div>
              <p className="font-medium text-green">Signed In</p>
              <p className="text-sm text-foreground-dim">{session?.email}</p>
            </div>
            <div className="w-3 h-3 bg-green rounded-full" />
          </div>

          <div className="pt-4 border-t border-background-lighter">
            <button
              onClick={handleLogout}
              className="btn btn-danger"
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
            <p className="text-xs text-foreground-dim mt-2">
              This will clear your local session. Your data remains on the
              server.
            </p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>

        <div className="space-y-3">
          <button className="btn btn-secondary w-full">Export All Data</button>
          <button className="btn btn-secondary w-full">Import Data</button>
        </div>

        <p className="text-xs text-foreground-dim mt-4">
          Your decks are synced with the server and cached locally for offline
          access.
        </p>
      </div>

      {/* About */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-2">About Kioku Desktop</h2>
        <p className="text-foreground-dim text-sm">Version 0.1.0</p>
        <p className="text-foreground-dim text-sm mt-2">
          A flashcard study app with offline support. Your decks sync with your
          Kioku account and are cached locally for offline studying.
        </p>
      </div>
    </div>
  );
}
