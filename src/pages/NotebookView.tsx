import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Notebook, Page, CreatePageRequest, UpdatePageRequest } from "@/types";
import {
  getNotebook,
  getPagesForNotebook,
  createPage,
  updatePage,
  deletePage,
  updateNotebook,
  togglePagePin,
} from "@/lib/db";
import { LoadingSpinner, SaveStatus } from "@/components";
import { useToast } from "@/context/ToastContext";
import { useSettings } from "@/context/SettingsContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChanges, UnsavedChangesDialog } from "@/hooks/useUnsavedChanges";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";

export function NotebookView() {
  const { notebookId, pageId } = useParams<{ notebookId: string; pageId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [notebookName, setNotebookName] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageContent, setPageContent] = useState("");

  // Auto-save data object
  const pageData = useMemo(
    () => ({
      title: pageTitle,
      content: pageContent,
      isPinned: selectedPage?.isPinned ?? false,
    }),
    [pageTitle, pageContent, selectedPage?.isPinned]
  );

  // Auto-save hook
  const {
    status: saveStatus,
    lastSavedAt,
    isDirty,
    saveNow,
    markClean,
    error: saveError,
  } = useAutoSave({
    data: pageData,
    onSave: async (data) => {
      if (!selectedPage) return;
      const request: UpdatePageRequest = {
        title: data.title,
        content: data.content,
        isPinned: data.isPinned,
      };
      const updatedPage = await updatePage(selectedPage.id, request);
      setSelectedPage(updatedPage);
      setPages((prev) =>
        prev.map((p) => (p.id === updatedPage.id ? updatedPage : p))
      );
    },
    delay: settings.editor.autoSaveDelay,
    enabled: settings.editor.autoSave && selectedPage !== null,
    onSaveError: () => {
      toast.error("Failed to save page");
    },
  });

  // Navigation warning for unsaved changes
  const { isBlocked, proceed, cancel } = useUnsavedChanges({
    isDirty,
    message: "You have unsaved changes. Are you sure you want to leave?",
  });

  const loadData = useCallback(async () => {
    if (!notebookId) return;

    try {
      const [notebookData, pagesData] = await Promise.all([
        getNotebook(notebookId),
        getPagesForNotebook(notebookId),
      ]);

      if (!notebookData) {
        toast.error("Notebook not found");
        navigate("/notes");
        return;
      }

      setNotebook(notebookData);
      setNotebookName(notebookData.name);
      setPages(pagesData);

      // Select page based on URL or first page
      if (pageId) {
        const page = pagesData.find((p) => p.id === pageId);
        if (page) {
          setSelectedPage(page);
          setPageTitle(page.title);
          setPageContent(page.content);
        }
      } else if (pagesData.length > 0) {
        const firstPage = pagesData[0];
        setSelectedPage(firstPage);
        setPageTitle(firstPage.title);
        setPageContent(firstPage.content);
        navigate(`/notes/${notebookId}/pages/${firstPage.id}`, { replace: true });
      }
    } catch (error) {
      console.error("Failed to load notebook:", error);
      toast.error("Failed to load notebook");
    } finally {
      setLoading(false);
    }
  }, [notebookId, pageId, navigate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPage = async (page: Page) => {
    // Auto-save current page if dirty
    if (isDirty && selectedPage) {
      await saveNow();
    }

    setSelectedPage(page);
    setPageTitle(page.title);
    setPageContent(page.content);
    // Mark clean after setting new page data (will be updated by useEffect)
    setTimeout(() => markClean(), 0);
    navigate(`/notes/${notebookId}/pages/${page.id}`);
  };

  const handleCreatePage = async () => {
    if (!notebookId) return;

    try {
      const request: CreatePageRequest = {
        title: "Untitled Page",
      };
      const newPage = await createPage(notebookId, request);
      setPages((prev) => [...prev, newPage]);
      handleSelectPage(newPage);
      toast.success("Page created");
    } catch (error) {
      toast.error("Failed to create page");
    }
  };

  // Manual save trigger (used by editor Ctrl+S and title blur)
  const handleSavePage = useCallback(async () => {
    if (!selectedPage || !isDirty) return;
    await saveNow();
  }, [selectedPage, isDirty, saveNow]);

  const handleDeletePage = async (pageIdToDelete: string) => {
    try {
      await deletePage(pageIdToDelete);
      const newPages = pages.filter((p) => p.id !== pageIdToDelete);
      setPages(newPages);

      if (selectedPage?.id === pageIdToDelete) {
        if (newPages.length > 0) {
          handleSelectPage(newPages[0]);
        } else {
          setSelectedPage(null);
          setPageTitle("");
          setPageContent("");
          navigate(`/notes/${notebookId}`);
        }
      }
      toast.success("Page deleted");
    } catch (error) {
      toast.error("Failed to delete page");
    }
  };

  const handleTogglePin = async (page: Page) => {
    try {
      const isPinned = await togglePagePin(page.id);
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, isPinned } : p))
      );
      if (selectedPage?.id === page.id) {
        setSelectedPage((prev) => (prev ? { ...prev, isPinned } : null));
      }
    } catch (error) {
      toast.error("Failed to toggle pin");
    }
  };

  const handleSaveNotebookName = async () => {
    if (!notebook || notebookName === notebook.name) {
      setEditingTitle(false);
      return;
    }

    try {
      await updateNotebook(notebook.id, {
        name: notebookName,
        description: notebook.description ?? undefined,
        icon: notebook.icon,
        color: notebook.color ?? undefined,
      });
      setNotebook((prev) => (prev ? { ...prev, name: notebookName } : null));
      setEditingTitle(false);
    } catch (error) {
      toast.error("Failed to update notebook name");
    }
  };

  // Sort pages: pinned first, then by position
  const sortedPages = [...pages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.position - b.position;
  });

  const pinnedPages = sortedPages.filter((p) => p.isPinned);
  const regularPages = sortedPages.filter((p) => !p.isPinned);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex bg-[#2d2a2e]">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-[#5b595c] bg-[#403e41] transition-all duration-200 ${
          sidebarCollapsed ? "w-12" : "w-64"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-[#5b595c]">
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full p-1 text-[#939293] hover:text-[#fcfcfa]"
                title="Expand sidebar"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <Link
                  to="/notes"
                  className="text-[#939293] hover:text-[#fcfcfa] p-1"
                  title="Back to notebooks"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <button
                  onClick={handleCreatePage}
                  className="px-2 py-1 text-xs bg-[#ffd866] text-[#2d2a2e] rounded hover:bg-[#ffd866]/90"
                >
                  + Page
                </button>
              </div>
            )}
          </div>

          {/* Pages List */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-2">
              {pinnedPages.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-[#939293] px-2 mb-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                    Pinned
                  </div>
                  {pinnedPages.map((page) => (
                    <PageListItem
                      key={page.id}
                      page={page}
                      isSelected={selectedPage?.id === page.id}
                      onSelect={() => handleSelectPage(page)}
                      onDelete={() => handleDeletePage(page.id)}
                      onTogglePin={() => handleTogglePin(page)}
                    />
                  ))}
                </div>
              )}

              {regularPages.length > 0 && (
                <div>
                  {pinnedPages.length > 0 && (
                    <div className="text-xs text-[#939293] px-2 mb-1">Pages</div>
                  )}
                  {regularPages.map((page) => (
                    <PageListItem
                      key={page.id}
                      page={page}
                      isSelected={selectedPage?.id === page.id}
                      onSelect={() => handleSelectPage(page)}
                      onDelete={() => handleDeletePage(page.id)}
                      onTogglePin={() => handleTogglePin(page)}
                    />
                  ))}
                </div>
              )}

              {pages.length === 0 && (
                <div className="text-center text-[#939293] text-sm py-4">
                  No pages yet
                </div>
              )}
            </div>
          )}

          {/* Sidebar Footer - Collapse Toggle */}
          {!sidebarCollapsed && (
            <div className="p-2 border-t border-[#5b595c]">
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="w-full flex items-center justify-center gap-2 p-2 text-xs text-[#939293] hover:text-[#fcfcfa] hover:bg-[#5b595c]/30 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                Collapse
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notebook Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[#5b595c] bg-[#403e41]">
          <div className="flex items-center justify-between">
            {editingTitle ? (
              <input
                type="text"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                onBlur={handleSaveNotebookName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNotebookName();
                  if (e.key === "Escape") {
                    setNotebookName(notebook?.name || "");
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className="text-xl font-bold text-[#fcfcfa] bg-transparent border-b border-[#ffd866] outline-none"
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-[#fcfcfa] cursor-pointer hover:text-[#ffd866]"
              >
                {notebook?.name}
              </h1>
            )}
            <SaveStatus
              status={saveStatus}
              lastSavedAt={lastSavedAt}
              error={saveError}
              size="sm"
            />
          </div>
        </div>

        {/* Page Editor */}
        {selectedPage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Page Title */}
            <div className="px-6 py-3 border-b border-[#5b595c]">
              <input
                type="text"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                onBlur={handleSavePage}
                placeholder="Page title..."
                className="w-full text-lg font-medium text-[#fcfcfa] bg-transparent outline-none placeholder-[#939293]"
              />
            </div>

            {/* Page Content - Milkdown Editor */}
            <div className="flex-1 overflow-hidden">
              <MarkdownEditor
                key={selectedPage.id}
                initialContent={pageContent}
                onChange={setPageContent}
                onSave={handleSavePage}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto text-[#939293] mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-[#939293] mb-4">No page selected</p>
              <button
                onClick={handleCreatePage}
                className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] rounded-lg hover:bg-[#ffd866]/90 font-medium"
              >
                Create a page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        isOpen={isBlocked}
        onConfirm={proceed ?? (() => {})}
        onCancel={cancel ?? (() => {})}
      />
    </div>
  );
}

// Page list item component
function PageListItem({
  page,
  isSelected,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  page: Page;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
        isSelected
          ? "bg-[#ffd866]/20 text-[#ffd866]"
          : "text-[#fcfcfa] hover:bg-[#5b595c]/30"
      }`}
      onClick={onSelect}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="flex-1 text-sm truncate">{page.title}</span>

      {/* Context menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#5b595c]/50 rounded"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-32 bg-[#403e41] border border-[#5b595c] rounded shadow-lg z-20 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#fcfcfa] hover:bg-[#5b595c]/30"
            >
              {page.isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#ff6188] hover:bg-[#5b595c]/30"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
