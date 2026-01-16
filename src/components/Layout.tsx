import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { useAuth } from "@/context/AuthContext";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header / Navigation */}
      <header className="bg-background-light border-b border-background-lighter px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-yellow">Kioku</span>
              <span className="text-xs text-foreground-dim bg-background-lighter px-2 py-0.5 rounded">
                Desktop
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive("/") && location.pathname === "/"
                    ? "bg-yellow text-background"
                    : "text-foreground-dim hover:text-foreground hover:bg-background-lighter"
                }`}
              >
                Decks
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive("/settings")
                    ? "bg-yellow text-background"
                    : "text-foreground-dim hover:text-foreground hover:bg-background-lighter"
                }`}
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <ConnectionIndicator />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-lighter hover:bg-background-lighter/80 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-purple flex items-center justify-center text-xs font-medium text-background">
                  {(session?.email || "U")[0].toUpperCase()}
                </div>
                <span className="text-sm text-foreground max-w-[120px] truncate">
                  {session?.email || "User"}
                </span>
                <svg
                  className={`w-4 h-4 text-foreground-dim transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-background-light border border-background-lighter rounded-lg shadow-lg z-20 py-1">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-background-lighter">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session?.email || "User"}
                      </p>
                      <span className="text-xs text-green">Synced</span>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-background-lighter"
                    >
                      Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-pink hover:bg-background-lighter"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
