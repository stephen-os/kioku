import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DeckView } from "./pages/DeckView";
import { StudyMode } from "./pages/StudyMode";
import { ListenMode } from "./pages/ListenMode";
import { NewDeck } from "./pages/NewDeck";
import { DeckEdit } from "./pages/DeckEdit";
import { Settings } from "./pages/Settings";
import { Stats } from "./pages/Stats";
import { Help } from "./pages/Help";
import { Export } from "./pages/Export";
import { Login } from "./pages/Login";
// Quiz pages
import { QuizList } from "./pages/QuizList";
import { QuizView } from "./pages/QuizView";
import { QuizEditor } from "./pages/QuizEditor";
import { TakeQuiz } from "./pages/TakeQuiz";
import { QuizResults } from "./pages/QuizResults";

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
        <Route path="decks/:id/edit" element={<DeckEdit />} />
        <Route path="decks/:id/study" element={<StudyMode />} />
        <Route path="decks/:id/listen" element={<ListenMode />} />
        {/* Quiz routes */}
        <Route path="quizzes" element={<QuizList />} />
        <Route path="quizzes/new" element={<QuizEditor />} />
        <Route path="quizzes/:id" element={<QuizView />} />
        <Route path="quizzes/:id/edit" element={<QuizEditor />} />
        <Route path="quizzes/:id/take" element={<TakeQuiz />} />
        <Route path="quizzes/:id/results/:attemptId" element={<QuizResults />} />
        <Route path="stats" element={<Stats />} />
        <Route path="export" element={<Export />} />
        <Route path="help" element={<Help />} />
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
