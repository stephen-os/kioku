import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";
import { Layout } from "./components/Layout";

// Eagerly loaded pages (critical path)
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";

// Lazy-loaded pages (code splitting)
const DeckView = lazy(() => import("./pages/DeckView").then(m => ({ default: m.DeckView })));
const StudyMode = lazy(() => import("./pages/StudyMode").then(m => ({ default: m.StudyMode })));
const ListenMode = lazy(() => import("./pages/ListenMode").then(m => ({ default: m.ListenMode })));
const NewDeck = lazy(() => import("./pages/NewDeck").then(m => ({ default: m.NewDeck })));
const DeckEdit = lazy(() => import("./pages/DeckEdit").then(m => ({ default: m.DeckEdit })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Stats = lazy(() => import("./pages/Stats").then(m => ({ default: m.Stats })));
const Help = lazy(() => import("./pages/Help").then(m => ({ default: m.Help })));
const Export = lazy(() => import("./pages/Export").then(m => ({ default: m.Export })));

// Quiz pages (lazy-loaded)
const QuizList = lazy(() => import("./pages/QuizList").then(m => ({ default: m.QuizList })));
const QuizView = lazy(() => import("./pages/QuizView").then(m => ({ default: m.QuizView })));
const QuizEditor = lazy(() => import("./pages/QuizEditor").then(m => ({ default: m.QuizEditor })));
const TakeQuiz = lazy(() => import("./pages/TakeQuiz").then(m => ({ default: m.TakeQuiz })));
const QuizResults = lazy(() => import("./pages/QuizResults").then(m => ({ default: m.QuizResults })));

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center bg-[#2d2a2e]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#939293]">Loading...</p>
      </div>
    </div>
  );
}

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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
