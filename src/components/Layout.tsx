import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { useAuth } from "@/context/AuthContext";

export function Layout() {
  const _location = useLocation();
  void _location; // Reserved for future active link highlighting
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="h-full flex flex-col bg-[#2d2a2e]">
      {/* Header / Navigation */}
      <nav className="bg-[#403e41] border-b border-[#5b595c] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ffd866] flex items-center justify-center">
                <span className="text-[#2d2a2e] font-bold text-sm font-mono">K</span>
              </div>
              <Link to="/" className="text-xl font-bold text-[#fcfcfa] font-mono">
                kioku
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionIndicator />
              <Link
                to="/"
                className="text-[#939293] hover:text-[#fcfcfa] transition-colors"
              >
                My Decks
              </Link>
              <Link
                to="/settings"
                className="text-[#939293] hover:text-[#fcfcfa] transition-colors"
              >
                Settings
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-[#939293] hover:text-[#fcfcfa] transition-colors"
                >
                  <span className="text-sm max-w-[120px] truncate">
                    {session?.email || "User"}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
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
                    <div className="absolute right-0 mt-2 w-56 bg-[#403e41] border border-[#5b595c] rounded-lg shadow-lg z-20 py-1">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[#5b595c]">
                        <p className="text-sm font-medium text-[#fcfcfa] truncate">
                          {session?.email || "User"}
                        </p>
                        <span className="text-xs text-[#a9dc76]">Synced</span>
                      </div>

                      {/* Menu Items */}
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
                      >
                        Settings
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-[#ff6188] hover:bg-[#5b595c]/30"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
