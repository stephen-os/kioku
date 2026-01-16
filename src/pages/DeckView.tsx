import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { Deck, Card } from "@/types";
import { getDeck, getCardsForDeck } from "@/lib/db";
import { isTauri } from "@/lib/auth";

export function DeckView() {
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDeckData() {
      if (!id) return;
      try {
        if (isTauri()) {
          const [deckData, cardsData] = await Promise.all([
            getDeck(id),
            getCardsForDeck(id),
          ]);
          setDeck(deckData);
          setCards(cardsData);
        }
      } catch (error) {
        console.error("Failed to load deck:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDeckData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="skeleton h-8 w-64 rounded mb-4" />
        <div className="skeleton h-4 w-48 rounded mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-3/4 rounded mb-2" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-semibold text-pink">Deck not found</h1>
        <Link to="/" className="text-cyan hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-foreground-dim mb-1">
            <Link to="/" className="hover:text-foreground">
              Decks
            </Link>
            <span>/</span>
            <span className="text-foreground">{deck.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="text-foreground-dim mt-1">{deck.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`/decks/${id}/study`}
            className="btn btn-primary"
          >
            Study
          </Link>
        </div>
      </div>

      {/* Cards Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Cards ({cards.length})
        </h2>
        <button className="btn btn-secondary text-sm">
          + Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-foreground-dim mb-4">No cards in this deck yet</p>
          <button className="btn btn-primary">Add Your First Card</button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  return (
    <div className="card hover:border-background-lighter cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-foreground truncate">{card.front}</p>
          <p className="text-foreground-dim text-sm truncate mt-1">
            {card.back}
          </p>
        </div>
        {card.tags.length > 0 && (
          <div className="flex gap-1 ml-4">
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-purple/20 text-purple px-2 py-0.5 rounded"
              >
                {tag.name}
              </span>
            ))}
            {card.tags.length > 3 && (
              <span className="text-xs text-foreground-dim">
                +{card.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
