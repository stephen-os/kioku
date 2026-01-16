import { invoke } from "@tauri-apps/api/core";
import type {
  Deck,
  Card,
  Tag,
  CreateDeckRequest,
  CreateCardRequest,
  UpdateCardRequest,
} from "@/types";

// ============================================
// Deck Operations
// ============================================

export async function getAllDecks(): Promise<Deck[]> {
  return invoke<Deck[]>("get_all_decks");
}

export async function getDeck(id: string): Promise<Deck | null> {
  return invoke<Deck | null>("get_deck", { id });
}

export async function createDeck(request: CreateDeckRequest): Promise<Deck> {
  return invoke<Deck>("create_deck", { request });
}

export async function updateDeck(
  id: string,
  request: CreateDeckRequest
): Promise<Deck> {
  return invoke<Deck>("update_deck", { id, request });
}

export async function deleteDeck(id: string): Promise<void> {
  return invoke("delete_deck", { id });
}

// ============================================
// Card Operations
// ============================================

export async function getCardsForDeck(deckId: string): Promise<Card[]> {
  const cards = await invoke<Omit<Card, "tags">[]>("get_cards_for_deck", {
    deckId,
  });
  // Fetch tags for each card
  // For now, return cards with empty tags array
  return cards.map((card) => ({ ...card, tags: [] }));
}

export async function getCard(id: string): Promise<Card | null> {
  const card = await invoke<Omit<Card, "tags"> | null>("get_card", { id });
  if (!card) return null;
  return { ...card, tags: [] };
}

export async function createCard(
  deckId: string,
  request: CreateCardRequest
): Promise<Card> {
  const card = await invoke<Omit<Card, "tags">>("create_card", {
    deckId,
    request,
  });
  return { ...card, tags: [] };
}

export async function updateCard(
  id: string,
  deckId: string,
  request: UpdateCardRequest
): Promise<Card> {
  const card = await invoke<Omit<Card, "tags">>("update_card", {
    id,
    deckId,
    request,
  });
  return { ...card, tags: [] };
}

export async function deleteCard(id: string): Promise<void> {
  return invoke("delete_card", { id });
}

// ============================================
// Tag Operations
// ============================================

export async function getTagsForDeck(deckId: string): Promise<Tag[]> {
  return invoke<Tag[]>("get_tags_for_deck", { deckId });
}

export async function createTag(deckId: string, name: string): Promise<Tag> {
  return invoke<Tag>("create_tag", { deckId, name });
}

export async function deleteTag(id: string): Promise<void> {
  return invoke("delete_tag", { id });
}

export async function addTagToCard(
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("add_tag_to_card", { cardId, tagId });
}

export async function removeTagFromCard(
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("remove_tag_from_card", { cardId, tagId });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if running inside Tauri (desktop app)
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
