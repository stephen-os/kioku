import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_API_URL } from "@/types";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      await login({ email: email.trim(), password, apiUrl });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2d2a2e] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#ffd866] flex items-center justify-center">
              <span className="text-[#2d2a2e] font-bold text-xl font-mono">K</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#fcfcfa] font-mono">kioku</h1>
          <p className="text-[#939293] mt-2">
            Your personal flashcard study app
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#fcfcfa]">
              Welcome back
            </h2>
            <p className="text-[#939293] text-sm mt-1">
              Sign in to access your decks
            </p>
          </div>

          {error && (
            <div className="bg-[#ff6188]/10 border border-[#ff6188]/30 text-[#ff6188] px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors"
              placeholder="your@email.com"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors"
              placeholder="Enter your password"
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-[#939293] hover:text-[#fcfcfa] transition-colors"
            >
              {showAdvanced ? "Hide" : "Show"} advanced settings
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <label
                  htmlFor="apiUrl"
                  className="block text-xs font-medium text-[#939293] uppercase tracking-wider mb-1.5"
                >
                  Server URL
                </label>
                <input
                  id="apiUrl"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors text-sm"
                  placeholder={DEFAULT_API_URL}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 disabled:opacity-50 font-medium text-lg transition-colors"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-xs text-[#939293]">
            Don't have an account?{" "}
            <a
              href="https://kioku.vercel.app/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#78dce8] hover:underline"
            >
              Create one on the web
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
