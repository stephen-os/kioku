import { useState, useEffect } from "react";
import { CodeEditor, CodeBlock } from "./CodeEditor";
import type { Card, Tag, ContentType, CodeLanguage, CreateCardRequest, UpdateCardRequest } from "@/types";
import { CODE_LANGUAGES, CODE_LANGUAGE_LABELS } from "@/types";

interface CardModalProps {
  card: Card | null;
  deckId: string;
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (request: CreateCardRequest | UpdateCardRequest) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  mode: "view" | "edit" | "create";
}

export function CardModal({
  card,
  deckId,
  tags,
  isOpen,
  onClose,
  onSave,
  onDelete,
  mode: initialMode,
}: CardModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontType, setFrontType] = useState<ContentType>("TEXT");
  const [backType, setBackType] = useState<ContentType>("TEXT");
  const [frontLanguage, setFrontLanguage] = useState<CodeLanguage | null>(null);
  const [backLanguage, setBackLanguage] = useState<CodeLanguage | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
      setFrontType(card.frontType);
      setBackType(card.backType);
      setFrontLanguage(card.frontLanguage);
      setBackLanguage(card.backLanguage);
      setNotes(card.notes || "");
    } else {
      setFront("");
      setBack("");
      setFrontType("TEXT");
      setBackType("TEXT");
      setFrontLanguage(null);
      setBackLanguage(null);
      setNotes("");
    }
    setMode(initialMode);
    setShowDeleteConfirm(false);
  }, [card, initialMode, isOpen]);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) return;

    setSaving(true);
    try {
      await onSave({
        front: front.trim(),
        back: back.trim(),
        frontType,
        backType,
        frontLanguage: frontType === "CODE" ? frontLanguage : undefined,
        backLanguage: backType === "CODE" ? backLanguage : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save card:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(card.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete card:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === "view";
  const isEditOrCreate = mode === "edit" || mode === "create";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background-light border border-background-lighter rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-background-lighter">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "New Card" : mode === "edit" ? "Edit Card" : "Card Details"}
          </h2>
          <div className="flex items-center gap-2">
            {isViewMode && (
              <button
                onClick={() => setMode("edit")}
                className="btn btn-secondary text-sm"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-lighter rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Front Side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-yellow">Front</label>
                {isEditOrCreate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFrontType(frontType === "TEXT" ? "CODE" : "TEXT");
                        if (frontType === "TEXT") setFrontLanguage("JAVASCRIPT");
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        frontType === "CODE"
                          ? "bg-cyan/20 text-cyan"
                          : "bg-background-lighter text-foreground-dim"
                      }`}
                    >
                      {frontType === "CODE" ? "CODE" : "TEXT"}
                    </button>
                    {frontType === "CODE" && (
                      <select
                        value={frontLanguage || "JAVASCRIPT"}
                        onChange={(e) => setFrontLanguage(e.target.value as CodeLanguage)}
                        className="text-xs bg-background-lighter border border-background-lighter rounded px-2 py-1"
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {CODE_LANGUAGE_LABELS[lang]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {isViewMode && frontType === "CODE" && (
                  <span className="text-xs text-cyan bg-cyan/20 px-2 py-0.5 rounded">
                    {CODE_LANGUAGE_LABELS[frontLanguage || "PLAINTEXT"]}
                  </span>
                )}
              </div>

              {isEditOrCreate ? (
                frontType === "CODE" ? (
                  <CodeEditor
                    value={front}
                    onChange={setFront}
                    language={frontLanguage}
                    minHeight="200px"
                  />
                ) : (
                  <textarea
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder="Enter the front of the card..."
                    className="input min-h-[200px] resize-y font-mono"
                  />
                )
              ) : frontType === "CODE" ? (
                <CodeBlock code={front} language={frontLanguage} />
              ) : (
                <div className="p-4 bg-background-lighter rounded-lg min-h-[100px] whitespace-pre-wrap">
                  {front}
                </div>
              )}
            </div>

            {/* Back Side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-green">Back</label>
                {isEditOrCreate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBackType(backType === "TEXT" ? "CODE" : "TEXT");
                        if (backType === "TEXT") setBackLanguage("JAVASCRIPT");
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        backType === "CODE"
                          ? "bg-cyan/20 text-cyan"
                          : "bg-background-lighter text-foreground-dim"
                      }`}
                    >
                      {backType === "CODE" ? "CODE" : "TEXT"}
                    </button>
                    {backType === "CODE" && (
                      <select
                        value={backLanguage || "JAVASCRIPT"}
                        onChange={(e) => setBackLanguage(e.target.value as CodeLanguage)}
                        className="text-xs bg-background-lighter border border-background-lighter rounded px-2 py-1"
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang}>
                            {CODE_LANGUAGE_LABELS[lang]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {isViewMode && backType === "CODE" && (
                  <span className="text-xs text-cyan bg-cyan/20 px-2 py-0.5 rounded">
                    {CODE_LANGUAGE_LABELS[backLanguage || "PLAINTEXT"]}
                  </span>
                )}
              </div>

              {isEditOrCreate ? (
                backType === "CODE" ? (
                  <CodeEditor
                    value={back}
                    onChange={setBack}
                    language={backLanguage}
                    minHeight="200px"
                  />
                ) : (
                  <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder="Enter the back of the card..."
                    className="input min-h-[200px] resize-y font-mono"
                  />
                )
              ) : backType === "CODE" ? (
                <CodeBlock code={back} language={backLanguage} />
              ) : (
                <div className="p-4 bg-background-lighter rounded-lg min-h-[100px] whitespace-pre-wrap">
                  {back}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 space-y-3">
            <label className="text-sm font-medium text-foreground-dim">Notes (optional)</label>
            {isEditOrCreate ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes, hints, or additional context..."
                className="input min-h-[80px] resize-y"
              />
            ) : notes ? (
              <div className="p-4 bg-background-lighter rounded-lg text-foreground-dim whitespace-pre-wrap">
                {notes}
              </div>
            ) : null}
          </div>

          {/* Tags display (view mode) */}
          {isViewMode && card?.tags && card.tags.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium text-foreground-dim mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-sm bg-purple/20 text-purple px-3 py-1 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-background-lighter bg-background">
          <div>
            {mode === "edit" && card && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-pink">Delete this card?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="btn btn-danger text-sm"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-pink hover:text-pink/80 text-sm"
                  >
                    Delete Card
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isEditOrCreate && (
              <>
                <button onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !front.trim() || !back.trim()}
                  className="btn btn-primary"
                >
                  {saving ? "Saving..." : mode === "create" ? "Create Card" : "Save Changes"}
                </button>
              </>
            )}
            {isViewMode && (
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
