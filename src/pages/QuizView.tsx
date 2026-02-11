import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { Quiz, QuizStats, Question } from "@/types";
import { getQuiz, getQuizStats, deleteQuiz, getTagsForQuiz, QuizTag, exportQuiz } from "@/lib/db";

type FilterLogic = "any" | "all";

export function QuizView() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [quizTags, setQuizTags] = useState<QuizTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<FilterLogic>("any");

  useEffect(() => {
    async function loadQuiz() {
      if (!id) return;
      try {
        const [quizData, statsData, tagsData] = await Promise.all([
          getQuiz(id),
          getQuizStats(id).catch(() => null),
          getTagsForQuiz(id).catch(() => []),
        ]);
        setQuiz(quizData);
        setStats(statsData);
        setQuizTags(tagsData);
      } catch (error) {
        console.error("Failed to load quiz:", error);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [id]);

  // Filter questions based on search and tags
  const filteredQuestions = useMemo(() => {
    if (!quiz?.questions) return [];

    let result: Question[] = [...quiz.questions];

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (q) =>
          q.content.toLowerCase().includes(term) ||
          (q.explanation && q.explanation.toLowerCase().includes(term)) ||
          (q.correctAnswer && q.correctAnswer.toLowerCase().includes(term))
      );
    }

    // Tag filter
    if (selectedTagFilters.length > 0) {
      result = result.filter((q) => {
        const questionTagIds = q.tags?.map((t) => t.id) || [];
        if (tagFilterMode === "all") {
          return selectedTagFilters.every((tagId) => questionTagIds.includes(tagId));
        } else {
          return selectedTagFilters.some((tagId) => questionTagIds.includes(tagId));
        }
      });
    }

    return result.sort((a, b) => a.position - b.position);
  }, [quiz?.questions, searchTerm, selectedTagFilters, tagFilterMode]);

  const handleToggleTagFilter = (tagId: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTagFilters([]);
    setTagFilterMode("any");
  };

  const hasActiveFilters = searchTerm.trim() !== "" || selectedTagFilters.length > 0;

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteQuiz(id);
      window.location.href = "/quizzes";
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!id || !quiz) return;
    setExporting(true);
    try {
      const exportData = await exportQuiz(id);
      const filePath = await save({
        defaultPath: `${quiz.name.replace(/[^a-zA-Z0-9]/g, "_")}_quiz.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (filePath) {
        await writeTextFile(filePath, exportData);
      }
    } catch (error) {
      console.error("Failed to export quiz:", error);
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#2d2a2e]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#939293]">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-[#2d2a2e]">
        <div className="text-6xl mb-4">❓</div>
        <h1 className="text-xl font-semibold text-[#fcfcfa] mb-2">Quiz not found</h1>
        <p className="text-[#939293] mb-6">
          This quiz doesn't exist or has been deleted.
        </p>
        <Link
          to="/quizzes"
          className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
        >
          Back to Quizzes
        </Link>
      </div>
    );
  }

  const questionCount = quiz.questions?.length || 0;

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-4xl mx-auto py-6 px-6">
        <div className="fade-in">
          {/* Back Link */}
          <Link
            to="/quizzes"
            className="inline-flex items-center text-[#78dce8] hover:text-[#ffd866] mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Quizzes
          </Link>

          {/* Quiz Header */}
          <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#78dce8]/20 text-[#78dce8]">
                    {questionCount} question{questionCount !== 1 ? "s" : ""}
                  </span>
                  {quiz.shuffleQuestions && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#ab9df2]/20 text-[#ab9df2]">
                      Shuffle
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#fcfcfa] font-mono mb-2">
                  {quiz.name}
                </h1>
                <p className="text-[#939293]">
                  {quiz.description || "No description"}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/quizzes/${id}/edit`}
                  className="px-4 py-2 bg-[#ffd866]/20 text-[#ffd866] rounded-lg hover:bg-[#ffd866]/30 font-medium transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-4 py-2 bg-[#ab9df2]/20 text-[#ab9df2] rounded-lg hover:bg-[#ab9df2]/30 font-medium transition-colors disabled:opacity-50"
                >
                  {exporting ? "..." : "Export"}
                </button>
                {showDeleteConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-[#ff6188] hover:bg-[#ff6188]/10 rounded-lg transition-colors"
                    title="Delete quiz"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>

          {/* Start Quiz Card */}
          {questionCount > 0 ? (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-8 text-center mb-6">
              <h2 className="text-xl font-semibold text-[#fcfcfa] mb-4">
                Ready to test your knowledge?
              </h2>
              <p className="text-[#939293] mb-6">
                This quiz has {questionCount} question{questionCount !== 1 ? "s" : ""}.
                {quiz.shuffleQuestions && " Questions will be shuffled."}
              </p>
              <Link
                to={`/quizzes/${id}/take`}
                className="inline-flex items-center justify-center px-8 py-3 bg-[#a9dc76] text-[#2d2a2e] rounded-lg hover:bg-[#a9dc76]/90 font-medium text-lg transition-colors"
              >
                Start Quiz
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-8 text-center mb-6">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-[#fcfcfa] mb-2">
                No questions yet
              </h2>
              <p className="text-[#939293] mb-6">
                Add some questions to this quiz before taking it.
              </p>
              <Link
                to={`/quizzes/${id}/edit`}
                className="inline-flex items-center justify-center px-6 py-3 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors"
              >
                Add Questions
              </Link>
            </div>
          )}

          {/* Stats */}
          {stats && stats.totalAttempts > 0 && (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 mb-6">
              <h3 className="text-lg font-semibold text-[#fcfcfa] mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#a9dc76] font-mono">
                    {stats.bestScore}%
                  </div>
                  <div className="text-sm text-[#939293]">Best Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#ffd866] font-mono">
                    {Math.round(stats.averageScore)}%
                  </div>
                  <div className="text-sm text-[#939293]">Average</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#78dce8] font-mono">
                    {stats.totalAttempts}
                  </div>
                  <div className="text-sm text-[#939293]">Attempts</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#ab9df2] font-mono">
                    {formatDuration(stats.averageDurationSeconds)}
                  </div>
                  <div className="text-sm text-[#939293]">Avg Time</div>
                </div>
              </div>

              {/* Recent scores */}
              {stats.recentScores.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[#5b595c]">
                  <div className="text-sm text-[#939293] mb-2">Recent Scores</div>
                  <div className="flex gap-2">
                    {stats.recentScores.map((score, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          score >= 80
                            ? "bg-[#a9dc76]/20 text-[#a9dc76]"
                            : score >= 60
                            ? "bg-[#ffd866]/20 text-[#ffd866]"
                            : "bg-[#ff6188]/20 text-[#ff6188]"
                        }`}
                      >
                        {score}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions Preview */}
          {quiz.questions && quiz.questions.length > 0 && (
            <div className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6">
              <h3 className="text-lg font-semibold text-[#fcfcfa] mb-4">
                Questions ({hasActiveFilters ? `${filteredQuestions.length} of ` : ""}{quiz.questions.length})
              </h3>

              {/* Search and Filter */}
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors"
                />

                {/* Tag Filters */}
                {quizTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-[#939293]">Tags:</span>

                    {/* Tag Mode Toggle */}
                    {selectedTagFilters.length > 1 && (
                      <div className="flex items-center bg-[#2d2a2e] rounded-lg p-0.5 mr-2">
                        <button
                          onClick={() => setTagFilterMode("any")}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            tagFilterMode === "any"
                              ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                              : "text-[#939293] hover:text-[#fcfcfa]"
                          }`}
                        >
                          Any
                        </button>
                        <button
                          onClick={() => setTagFilterMode("all")}
                          className={`px-2 py-1 text-xs rounded-md transition-colors ${
                            tagFilterMode === "all"
                              ? "bg-[#ab9df2] text-[#2d2a2e] font-medium"
                              : "text-[#939293] hover:text-[#fcfcfa]"
                          }`}
                        >
                          All
                        </button>
                      </div>
                    )}

                    {quizTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTagFilter(tag.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTagFilters.includes(tag.id)
                            ? "bg-[#ab9df2] text-[#2d2a2e]"
                            : "bg-[#ab9df2]/20 text-[#ab9df2] hover:bg-[#ab9df2]/30"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Clear filters button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#ffd866] hover:text-[#ffd866]/80"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Questions List */}
              {filteredQuestions.length === 0 ? (
                <p className="text-[#939293] text-center py-4">
                  No questions match your search
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="flex items-start gap-3 p-3 bg-[#2d2a2e] rounded-lg"
                    >
                      <span className="text-[#939293] font-mono text-sm">
                        {question.position + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#fcfcfa] truncate">
                          {question.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-[#5b595c]/50 text-[#939293]">
                            {question.questionType === "multiple_choice"
                              ? `${question.choices.length} choices`
                              : "Fill in blank"}
                          </span>
                          {question.contentType === "CODE" && (
                            <span className="text-xs px-2 py-0.5 rounded bg-[#78dce8]/20 text-[#78dce8]">
                              Code
                            </span>
                          )}
                          {question.tags && question.tags.length > 0 && (
                            <>
                              {question.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="text-xs px-2 py-0.5 rounded-full bg-[#ab9df2]/20 text-[#ab9df2]"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
