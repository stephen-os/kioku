import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import type { Quiz, QuizStats } from "@/types";
import { getAllQuizzes, getQuizStats, deleteQuiz, importQuiz } from "@/lib/db";
import { DropZone } from "@/components/DropZone";

export function QuizList() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizStats, setQuizStats] = useState<Record<string, QuizStats>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadQuizzes = useCallback(async () => {
    try {
      const data = await getAllQuizzes();
      setQuizzes(data);

      // Load stats for each quiz
      const stats: Record<string, QuizStats> = {};
      for (const quiz of data) {
        try {
          stats[quiz.id] = await getQuizStats(quiz.id);
        } catch {
          // Quiz might not have any attempts yet
        }
      }
      setQuizStats(stats);
    } catch (error) {
      console.error("Failed to load quizzes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleDelete = async (quizId: string) => {
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      loadQuizzes();
    } catch (error) {
      console.error("Failed to delete quiz:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (selected && typeof selected === "string") {
        setImporting(true);
        const result = await importQuiz(selected);
        navigate(`/quizzes/${result.quiz.id}`);
      }
    } catch (error) {
      console.error("Failed to import quiz:", error);
      alert(`Failed to import quiz: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = useCallback(async (filePath: string) => {
    setImporting(true);
    try {
      const result = await importQuiz(filePath);
      navigate(`/quizzes/${result.quiz.id}`);
    } catch (error) {
      console.error("Failed to import quiz:", error);
      alert(`Failed to import quiz: ${error}`);
    } finally {
      setImporting(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#2d2a2e]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#939293]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DropZone
      onFileDrop={handleFileDrop}
      disabled={importing}
      label="Drop quiz file to import"
    >
      <div className="min-h-full bg-[#2d2a2e]">
        <main className="max-w-7xl mx-auto py-6 px-6">
          <div className="fade-in">
            {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#fcfcfa] font-mono">Quizzes</h2>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:min-w-[300px]">
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#fcfcfa] bg-[#5b595c] hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import Quiz"}
              </button>
              <Link
                to="/quizzes/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#2d2a2e] bg-[#ffd866] hover:bg-[#ffd866]/90 transition-colors"
              >
                + New Quiz
              </Link>
            </div>
          </div>

          {/* Quizzes Grid */}
          {quizzes.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-[#5b595c]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-[#fcfcfa]">No quizzes</h3>
                <p className="mt-1 text-sm text-[#939293]">
                  Create your first quiz to test your knowledge.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  stats={quizStats[quiz.id]}
                  onDelete={() => handleDelete(quiz.id)}
                  isDeleting={deletingId === quiz.id}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>
    </DropZone>
  );
}

interface QuizCardProps {
  quiz: Quiz;
  stats?: QuizStats;
  onDelete: () => void;
  isDeleting: boolean;
}

function QuizCard({ quiz, stats, onDelete, isDeleting }: QuizCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="block bg-[#403e41] overflow-hidden rounded-xl border border-[#5b595c] hover:border-[#939293] transition-colors">
      <Link to={`/quizzes/${quiz.id}`} className="block px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-[#78dce8]/20 text-[#78dce8]">
              {quiz.questionCount ?? quiz.questions?.length ?? 0} questions
            </span>
            {quiz.shuffleQuestions && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#ab9df2]/20 text-[#ab9df2]">
                Shuffle
              </span>
            )}
          </div>
          <span className="text-xs text-[#939293] font-mono">
            {new Date(quiz.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h3 className="text-base font-medium text-[#fcfcfa] truncate">
          {quiz.name}
        </h3>
        <p className="mt-1 text-sm text-[#939293] line-clamp-2">
          {quiz.description || "No description"}
        </p>

        {/* Stats */}
        {stats && stats.totalAttempts > 0 && (
          <div className="mt-3 pt-3 border-t border-[#5b595c] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-[#a9dc76]">
                {stats.bestScore}%
              </div>
              <div className="text-xs text-[#939293]">Best</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#ffd866]">
                {Math.round(stats.averageScore)}%
              </div>
              <div className="text-xs text-[#939293]">Avg</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#78dce8]">
                {stats.totalAttempts}
              </div>
              <div className="text-xs text-[#939293]">Attempts</div>
            </div>
          </div>
        )}
      </Link>

      <div className="px-5 pb-4 flex gap-2">
        <Link
          to={`/quizzes/${quiz.id}/take`}
          className="flex-1 text-center px-3 py-2 bg-[#a9dc76]/20 text-[#a9dc76] text-sm rounded-lg hover:bg-[#a9dc76]/30 transition-colors font-medium"
        >
          Take Quiz
        </Link>
        <Link
          to={`/quizzes/${quiz.id}/edit`}
          className="flex-1 text-center px-3 py-2 bg-[#ffd866]/20 text-[#ffd866] text-sm rounded-lg hover:bg-[#ffd866]/30 transition-colors font-medium"
        >
          Edit
        </Link>
        {showDeleteConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="px-2 py-2 bg-[#ff6188] text-[#2d2a2e] text-sm rounded-lg hover:bg-[#ff6188]/90 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "..." : "Yes"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-2 bg-[#5b595c] text-[#fcfcfa] text-sm rounded-lg hover:bg-[#5b595c]/80 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-[#ff6188] hover:bg-[#ff6188]/10 rounded-lg transition-colors"
            title="Delete quiz"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
