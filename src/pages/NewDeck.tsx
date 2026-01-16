import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function NewDeck() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Deck name is required");
      return;
    }

    setLoading(true);

    try {
      // TODO: Create deck in local SQLite database
      // const deck = await db.createDeck({ name, description });
      // navigate(`/decks/${deck.id}`);

      // For now, just navigate back
      navigate("/");
    } catch {
      setError("Failed to create deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto fade-in">
      <h1 className="text-2xl font-bold mb-6">Create New Deck</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="bg-pink/10 border border-pink text-pink px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground-dim mb-1"
          >
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g., JavaScript Fundamentals"
            maxLength={255}
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground-dim mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-none"
            placeholder="What is this deck about?"
            rows={3}
            maxLength={1000}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Deck"}
          </button>
        </div>
      </form>
    </div>
  );
}
