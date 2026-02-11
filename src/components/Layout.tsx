import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Generate a consistent color based on the first letter
function getAvatarColor(letter: string): string {
  const colors = [
    "#ff6188", // pink
    "#fc9867", // orange
    "#ffd866", // yellow
    "#a9dc76", // green
    "#78dce8", // cyan
    "#ab9df2", // purple
  ];
  const index = letter.toLowerCase().charCodeAt(0) % colors.length;
  return colors[index];
}

export function Layout() {
  const _location = useLocation();
  void _location; // Reserved for future active link highlighting
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const firstLetter = user?.name?.charAt(0).toUpperCase() || "U";
  const avatarColor = getAvatarColor(firstLetter);

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
              <Link
                to="/"
                className="text-[#939293] hover:text-[#fcfcfa] transition-colors"
              >
                Decks
              </Link>
              <Link
                to="/quizzes"
                className="text-[#939293] hover:text-[#fcfcfa] transition-colors"
              >
                Quizzes
              </Link>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[#2d2a2e] transition-opacity hover:opacity-80"
                  style={{ backgroundColor: avatarColor }}
                  title={user?.name || "User"}
                >
                  {firstLetter}
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-[#403e41] border border-[#5b595c] rounded-lg shadow-lg z-20 py-1">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[#5b595c]">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[#2d2a2e] flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {firstLetter}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#fcfcfa] truncate">
                              {user?.name || "User"}
                            </p>
                            <p className="text-xs text-[#939293] mt-0.5">Local Account</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <Link
                        to="/stats"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
                      >
                        Statistics
                      </Link>
                      <Link
                        to="/export"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
                      >
                        Export
                      </Link>
                      <div className="border-t border-[#5b595c] my-1"></div>
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
                      >
                        Settings
                      </Link>
                      <Link
                        to="/help"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
                      >
                        Help
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
