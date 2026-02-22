import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { createDeck } from "@/lib/db";

export function NewDeck() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shuffleCards, setShuffleCards] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!name.trim()) {
      setValidationError("Deck name is required");
      return;
    }

    setLoading(true);

    try {
      const deck = await createDeck({
        name: name.trim(),
        description: description.trim() || undefined,
        shuffleCards,
      });
      navigate(`/decks/${deck.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-xl mx-auto py-6 px-6">
        <div className="fade-in">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center text-[#78dce8] hover:text-[#ffd866] mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Decks
          </Link>

          <h1 className="text-2xl font-bold text-[#fcfcfa] font-mono mb-6">Create New Deck</h1>

          <form onSubmit={handleSubmit} className="bg-[#403e41] rounded-xl border border-[#5b595c] p-6 space-y-4">
            {validationError && (
              <div className="bg-[#ff6188]/10 border border-[#ff6188] text-[#ff6188] px-4 py-2 rounded-lg text-sm">
                {validationError}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#939293] mb-1"
              >
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#5b595c] focus:outline-none focus:border-[#ffd866] transition-colors"
                placeholder="e.g., JavaScript Fundamentals"
                maxLength={255}
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-[#939293] mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#5b595c] focus:outline-none focus:border-[#ffd866] transition-colors resize-none"
                placeholder="What is this deck about?"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shuffle"
                checked={shuffleCards}
                onChange={(e) => setShuffleCards(e.target.checked)}
                className="w-4 h-4 rounded border-[#5b595c] bg-[#2d2a2e] text-[#ffd866] focus:ring-[#ffd866] focus:ring-offset-0"
              />
              <label htmlFor="shuffle" className="text-sm text-[#939293]">
                Shuffle cards when studying
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 px-4 py-2 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 font-medium transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Deck"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
