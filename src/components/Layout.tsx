import { Outlet, Link, useLocation } from "react-router-dom";
import { ConnectionIndicator } from "./ConnectionIndicator";

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
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

          {/* Connection Status */}
          <ConnectionIndicator />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
