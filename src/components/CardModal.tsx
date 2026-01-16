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
  deckId: _deckId,
  tags: _tags,
  isOpen,
  onClose,
  onSave,
  onDelete,
  mode: initialMode,
}: CardModalProps) {
  // deckId and tags reserved for future tag editing feature
  void _deckId;
  void _tags;
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
        frontLanguage: frontType === "CODE" ? (frontLanguage ?? undefined) : undefined,
        backLanguage: backType === "CODE" ? (backLanguage ?? undefined) : undefined,
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
      <div className="relative bg-[#403e41] border border-[#5b595c] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#5b595c]">
          <h2 className="text-lg font-semibold text-[#fcfcfa]">
            {mode === "create" ? "New Card" : mode === "edit" ? "Edit Card" : "Card Details"}
          </h2>
          <div className="flex items-center gap-2">
            {isViewMode && (
              <button
                onClick={() => setMode("edit")}
                className="px-3 py-1.5 bg-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/80 text-sm transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#5b595c]/30 rounded-lg transition-colors text-[#939293] hover:text-[#fcfcfa]"
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
                <label className="text-sm font-medium text-[#ffd866]">Front</label>
                {isEditOrCreate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFrontType(frontType === "TEXT" ? "CODE" : "TEXT");
                        if (frontType === "TEXT") setFrontLanguage("JAVASCRIPT");
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        frontType === "CODE"
                          ? "bg-[#78dce8]/20 text-[#78dce8]"
                          : "bg-[#5b595c] text-[#939293]"
                      }`}
                    >
                      {frontType === "CODE" ? "CODE" : "TEXT"}
                    </button>
                    {frontType === "CODE" && (
                      <select
                        value={frontLanguage || "JAVASCRIPT"}
                        onChange={(e) => setFrontLanguage(e.target.value as CodeLanguage)}
                        className="text-xs bg-[#2d2a2e] border border-[#5b595c] rounded px-2 py-1 text-[#fcfcfa]"
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
                  <span className="text-xs text-[#78dce8] bg-[#78dce8]/20 px-2 py-0.5 rounded">
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
                    className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none min-h-[200px] font-mono"
                  />
                )
              ) : frontType === "CODE" ? (
                <CodeBlock code={front} language={frontLanguage} />
              ) : (
                <div className="p-4 bg-[#2d2a2e] rounded-lg min-h-[100px] whitespace-pre-wrap text-[#fcfcfa]">
                  {front}
                </div>
              )}
            </div>

            {/* Back Side */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#a9dc76]">Back</label>
                {isEditOrCreate && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBackType(backType === "TEXT" ? "CODE" : "TEXT");
                        if (backType === "TEXT") setBackLanguage("JAVASCRIPT");
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        backType === "CODE"
                          ? "bg-[#78dce8]/20 text-[#78dce8]"
                          : "bg-[#5b595c] text-[#939293]"
                      }`}
                    >
                      {backType === "CODE" ? "CODE" : "TEXT"}
                    </button>
                    {backType === "CODE" && (
                      <select
                        value={backLanguage || "JAVASCRIPT"}
                        onChange={(e) => setBackLanguage(e.target.value as CodeLanguage)}
                        className="text-xs bg-[#2d2a2e] border border-[#5b595c] rounded px-2 py-1 text-[#fcfcfa]"
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
                  <span className="text-xs text-[#78dce8] bg-[#78dce8]/20 px-2 py-0.5 rounded">
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
                    className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none min-h-[200px] font-mono"
                  />
                )
              ) : backType === "CODE" ? (
                <CodeBlock code={back} language={backLanguage} />
              ) : (
                <div className="p-4 bg-[#2d2a2e] rounded-lg min-h-[100px] whitespace-pre-wrap text-[#fcfcfa]">
                  {back}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 space-y-3">
            <label className="text-sm font-medium text-[#939293]">Notes (optional)</label>
            {isEditOrCreate ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes, hints, or additional context..."
                className="w-full px-3 py-2.5 bg-[#2d2a2e] border border-[#5b595c] rounded-lg text-[#fcfcfa] placeholder-[#939293] focus:outline-none focus:border-[#ffd866] focus:ring-1 focus:ring-[#ffd866]/50 transition-colors resize-none min-h-[80px]"
              />
            ) : notes ? (
              <div className="p-4 bg-[#2d2a2e] rounded-lg text-[#939293] whitespace-pre-wrap">
                {notes}
              </div>
            ) : null}
          </div>

          {/* Tags display (view mode) */}
          {isViewMode && card?.tags && card.tags.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium text-[#939293] mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-sm bg-[#ab9df2]/20 text-[#ab9df2] px-3 py-1 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#5b595c] bg-[#2d2a2e]">
          <div>
            {mode === "edit" && card && onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#ff6188]">Delete this card?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-[#ff6188] text-[#2d2a2e] rounded-lg hover:bg-[#ff6188]/90 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[#ff6188] hover:text-[#ff6188]/80 text-sm"
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
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !front.trim() || !back.trim()}
                  className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 disabled:opacity-50 font-medium transition-colors"
                >
                  {saving ? "Saving..." : mode === "create" ? "Create Card" : "Save Changes"}
                </button>
              </>
            )}
            {isViewMode && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#5b595c] text-[#fcfcfa] rounded-lg hover:bg-[#5b595c]/30 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
