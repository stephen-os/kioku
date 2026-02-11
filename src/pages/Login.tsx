import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AvatarPicker, AvatarDisplay } from "@/components/AvatarPicker";
import type { AvatarId } from "@/types";

export function Login() {
  const { users, login, createUser } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"select" | "create">(users.length > 0 ? "select" : "create");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Create user form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>("avatar-smile");

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleLogin = async () => {
    if (!selectedUserId) {
      setValidationError("Please select a user");
      return;
    }

    setIsLoading(true);
    setValidationError("");

    try {
      await login(selectedUserId, selectedUser?.hasPassword ? password : undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      setValidationError("Please enter a name");
      return;
    }

    if (usePassword) {
      if (!newUserPassword) {
        setValidationError("Please enter a password");
        return;
      }
      if (newUserPassword !== confirmPassword) {
        setValidationError("Passwords do not match");
        return;
      }
    }

    setIsLoading(true);
    setValidationError("");

    try {
      const newUser = await createUser({
        name: newUserName.trim(),
        password: usePassword ? newUserPassword : undefined,
        avatar: selectedAvatar,
      });
      // Auto-login as the new user
      await login(newUser.id, usePassword ? newUserPassword : undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2d2a2e] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#ffd866] flex items-center justify-center mx-auto mb-4">
            <span className="text-[#2d2a2e] font-bold text-2xl font-mono">K</span>
          </div>
          <h1 className="text-3xl font-bold text-[#fcfcfa] font-mono">kioku</h1>
          <p className="text-[#939293] mt-2">Local flashcard & quiz app</p>
        </div>

        {/* Card */}
        <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6">
          {mode === "select" && users.length > 0 ? (
            <>
              <h2 className="text-xl font-semibold text-[#fcfcfa] mb-6">Select User</h2>

              {/* User List */}
              <div className="space-y-2 mb-6">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setPassword("");
                      setValidationError("");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedUserId === user.id
                        ? "bg-[#ffd866]/20 border-[#ffd866]"
                        : "bg-[#2d2a2e] border-[#5b595c] hover:border-[#939293]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarDisplay avatar={user.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[#fcfcfa] font-medium truncate">{user.name}</div>
                        <div className="text-xs text-[#939293]">
                          {user.hasPassword ? "Password protected" : "No password"}
                          {user.lastLoginAt && ` • Last login: ${new Date(user.lastLoginAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      {user.hasPassword && (
                        <svg className="w-4 h-4 text-[#939293]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Password input if user has password */}
              {selectedUser?.hasPassword && (
                <div className="mb-6">
                  <label className="block text-sm text-[#939293] uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50"
                  />
                </div>
              )}

              {validationError && (
                <div className="mb-4 p-3 bg-[#ff6188]/20 border border-[#ff6188] rounded-lg text-[#ff6188] text-sm">
                  {validationError}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={!selectedUserId || isLoading}
                className="w-full py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg font-medium hover:bg-[#ffd866]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Logging in..." : "Continue"}
              </button>

              <div className="mt-6 pt-6 border-t border-[#5b595c] text-center">
                <button
                  onClick={() => {
                    setMode("create");
                    setValidationError("");
                  }}
                  className="text-[#78dce8] hover:text-[#ffd866] transition-colors"
                >
                  + Create New User
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-[#fcfcfa] mb-6">
                {users.length === 0 ? "Create Your Profile" : "Create New User"}
              </h2>

              {/* Avatar picker */}
              <div className="mb-6">
                <label className="block text-sm text-[#939293] uppercase tracking-wider mb-3 text-center">
                  Choose Your Avatar
                </label>
                <AvatarPicker
                  selected={selectedAvatar}
                  onSelect={setSelectedAvatar}
                  size="md"
                />
              </div>

              {/* Name input */}
              <div className="mb-4">
                <label className="block text-sm text-[#939293] uppercase tracking-wider mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50"
                  autoFocus
                />
              </div>

              {/* Password toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => {
                      setUsePassword(e.target.checked);
                      if (!e.target.checked) {
                        setNewUserPassword("");
                        setConfirmPassword("");
                      }
                    }}
                    className="w-5 h-5 rounded border-[#5b595c] bg-[#2d2a2e] text-[#ffd866] focus:ring-[#ffd866]/50"
                  />
                  <span className="text-[#fcfcfa]">Protect with password</span>
                </label>
                <p className="text-xs text-[#939293] mt-1 ml-8">
                  Optional - adds a layer of privacy
                </p>
              </div>

              {/* Password inputs */}
              {usePassword && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm text-[#939293] uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-3 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm text-[#939293] uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50"
                    />
                  </div>
                </>
              )}

              {validationError && (
                <div className="mb-4 p-3 bg-[#ff6188]/20 border border-[#ff6188] rounded-lg text-[#ff6188] text-sm">
                  {validationError}
                </div>
              )}

              <button
                onClick={handleCreateUser}
                disabled={isLoading}
                className="w-full py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg font-medium hover:bg-[#ffd866]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create & Continue"}
              </button>

              {users.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#5b595c] text-center">
                  <button
                    onClick={() => {
                      setMode("select");
                      setValidationError("");
                      setNewUserName("");
                      setNewUserPassword("");
                      setConfirmPassword("");
                      setUsePassword(false);
                      setSelectedAvatar("avatar-smile");
                    }}
                    className="text-[#78dce8] hover:text-[#ffd866] transition-colors"
                  >
                    Back to User Selection
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[#939293] text-sm mt-6">
          Your data is stored locally on this device
        </p>
      </div>
    </div>
  );
}
