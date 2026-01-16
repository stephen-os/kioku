import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type RegisterMode = "local" | "remote";

export function Register() {
  const navigate = useNavigate();
  const { createAccount, loginWithRemote } = useAuth();

  const [mode, setMode] = useState<RegisterMode>("local");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [apiUrl, setApiUrl] = useState("http://localhost:8080/api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "local" && !displayName.trim()) {
      setError("Display name is required");
      return;
    }

    if (mode === "remote") {
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required for remote registration");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "local") {
        // Create local-only account
        await createAccount({
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
        });
      } else {
        // Register with remote server then login
        // Note: This would call the remote /auth/register endpoint first
        // For now, we just try to login (assuming user registered on web)
        await loginWithRemote({ email, password, apiUrl });
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
          <p className="text-foreground-dim mt-2">Create your account</p>
        </div>

        {/* Register Mode Tabs */}
        <div className="flex mb-6 bg-background-light rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === "local"
                ? "bg-yellow text-background"
                : "text-foreground-dim hover:text-foreground"
            }`}
          >
            Local Account
          </button>
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
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-pink/10 border border-pink text-pink px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {mode === "local" && (
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-foreground-dim mb-1"
              >
                Display Name *
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Your name"
                autoFocus
              />
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
              Email {mode === "remote" && "*"}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoFocus={mode === "remote"}
            />
            {mode === "local" && (
              <p className="text-xs text-foreground-dim mt-1">
                Optional - used for linking to remote account later
              </p>
            )}
          </div>

          {(mode === "remote" || email) && (
            <>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground-dim mb-1"
                >
                  Password {mode === "remote" && "*"}
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

              {mode === "remote" && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-foreground-dim mb-1"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="text-center text-sm text-foreground-dim">
            Already have an account?{" "}
            <Link to="/login" className="text-cyan hover:underline">
              Sign in
            </Link>
          </div>
        </form>

        {/* Info about modes */}
        <div className="mt-6 text-center text-xs text-foreground-dim">
          {mode === "local" ? (
            <p>
              Create a local account to use Kioku offline. You can link to a
              remote server later to sync your decks.
            </p>
          ) : (
            <p>
              Create an account on your Kioku server to sync your decks across
              all your devices.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
