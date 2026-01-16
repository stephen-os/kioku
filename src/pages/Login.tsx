import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type LoginMode = "remote" | "local";

export function Login() {
  const navigate = useNavigate();
  const { loginWithRemote } = useAuth();

  const [mode, setMode] = useState<LoginMode>("remote");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState("http://localhost:8080/api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      if (mode === "remote") {
        await loginWithRemote({ email, password, apiUrl });
      } else {
        // Local login would be handled here
        setError("Local login not yet implemented");
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow">Kioku</h1>
          <p className="text-foreground-dim mt-2">Sign in to your account</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex mb-6 bg-background-light rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("remote")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "remote"
                ? "bg-yellow text-background"
                : "text-foreground-dim hover:text-foreground"
            }`}
          >
            Remote Account
          </button>
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "local"
                ? "bg-yellow text-background"
                : "text-foreground-dim hover:text-foreground"
            }`}
          >
            Local Only
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-pink/10 border border-pink text-pink px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {mode === "remote" && (
            <div>
              <label
                htmlFor="apiUrl"
                className="block text-sm font-medium text-foreground-dim mb-1"
              >
                Server URL
              </label>
              <input
                id="apiUrl"
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="input"
                placeholder="https://api.kioku.app"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground-dim mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground-dim mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="text-center text-sm text-foreground-dim">
            Don't have an account?{" "}
            <Link to="/register" className="text-cyan hover:underline">
              Create one
            </Link>
          </div>
        </form>

        {/* Info about modes */}
        <div className="mt-6 text-center text-xs text-foreground-dim">
          {mode === "remote" ? (
            <p>
              Sign in with your Kioku server account to sync your decks across
              devices.
            </p>
          ) : (
            <p>
              Sign in locally to use your decks offline without syncing to a
              server.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
