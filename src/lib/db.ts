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

// Card tag type from API (simpler than full Tag)
interface CardTagResponse {
  id: string;
  name: string;
}

// Card response type from API
interface CardResponse {
  id: string;
  deckId: string;
  front: string;
  frontType: string;
  frontLanguage: string | null;
  back: string;
  backType: string;
  backLanguage: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  serverId: number | null;
  tags: CardTagResponse[];
}

export async function getCardsForDeck(deckId: string): Promise<Card[]> {
  const cards = await invoke<CardResponse[]>("get_cards_for_deck", {
    deckId,
  });

  // Transform card tags to full Tag format
  return cards.map((card) => ({
    ...card,
    tags: card.tags.map((t) => ({
      id: t.id,
      serverId: parseInt(t.id) || null,
      deckId: deckId,
      name: t.name,
      syncStatus: "synced" as const,
    })),
  })) as Card[];
}

export async function getCard(id: string, deckId?: string): Promise<Card | null> {
  const card = await invoke<CardResponse | null>("get_card", { id });
  if (!card) return null;

  return {
    ...card,
    tags: card.tags.map((t) => ({
      id: t.id,
      serverId: parseInt(t.id) || null,
      deckId: deckId || card.deckId,
      name: t.name,
      syncStatus: "synced" as const,
    })),
  } as Card;
}

export async function createCard(
  deckId: string,
  request: CreateCardRequest
): Promise<Card> {
  const card = await invoke<CardResponse>("create_card", {
    deckId,
    request,
  });
  // New cards have no tags
  return {
    ...card,
    tags: card.tags?.map((t) => ({
      id: t.id,
      serverId: parseInt(t.id) || null,
      deckId: deckId,
      name: t.name,
      syncStatus: "synced" as const,
    })) || [],
  } as Card;
}

export async function updateCard(
  id: string,
  deckId: string,
  request: UpdateCardRequest
): Promise<Card> {
  const card = await invoke<CardResponse>("update_card", {
    id,
    deckId,
    request,
  });
  return {
    ...card,
    tags: card.tags?.map((t) => ({
      id: t.id,
      serverId: parseInt(t.id) || null,
      deckId: deckId,
      name: t.name,
      syncStatus: "synced" as const,
    })) || [],
  } as Card;
}

export async function deleteCard(id: string, deckId: string): Promise<void> {
  return invoke("delete_card", { id, deckId });
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

export async function deleteTag(deckId: string, id: string): Promise<void> {
  return invoke("delete_tag", { deckId, id });
}

export async function addTagToCard(
  deckId: string,
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("add_tag_to_card", { deckId, cardId, tagId });
}

export async function removeTagFromCard(
  deckId: string,
  cardId: string,
  tagId: string
): Promise<void> {
  return invoke("remove_tag_from_card", { deckId, cardId, tagId });
}

// ============================================
// Import/Export Operations
// ============================================

export interface ImportResult {
  deck: Deck;
  cardsImported: number;
  synced: boolean;
}

export interface DeckExport {
  name: string;
  description: string | null;
  cards: CardExport[];
  exportedAt: string;
}

export interface CardExport {
  front: string;
  back: string;
  frontType: string;
  backType: string;
  frontLanguage: string | null;
  backLanguage: string | null;
  notes: string | null;
}

export async function importDeck(filePath: string): Promise<ImportResult> {
  return invoke<ImportResult>("import_deck", { filePath });
}

export async function exportDeck(deckId: string): Promise<DeckExport> {
  return invoke<DeckExport>("export_deck", { deckId });
}

export async function syncPending(): Promise<number> {
  return invoke<number>("sync_pending");
}

export async function getPendingCount(): Promise<number> {
  return invoke<number>("get_pending_count");
}

