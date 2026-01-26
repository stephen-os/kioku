import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DeckView } from "./pages/DeckView";
import { StudyMode } from "./pages/StudyMode";
import { ListenMode } from "./pages/ListenMode";
import { NewDeck } from "./pages/NewDeck";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";

// Protected route wrapper - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow mb-2">Kioku</div>
          <div className="text-foreground-dim">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Login route - only shown if not logged in
function LoginRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow mb-2">Kioku</div>
          <div className="text-foreground-dim">Loading...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login route */}
      <Route
        path="/login"
        element={
          <LoginRoute>
            <Login />
          </LoginRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="decks/new" element={<NewDeck />} />
        <Route path="decks/:id" element={<DeckView />} />
        <Route path="decks/:id/study" element={<StudyMode />} />
        <Route path="decks/:id/listen" element={<ListenMode />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
