import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { LoadingSpinner } from "@/components";
import { useToast } from "@/context/ToastContext";
import { useSettings } from "@/context/SettingsContext";
import { useAutoSave, useSidebarState, useMarkdownOutline } from "@/hooks";
import { useUnsavedChanges, UnsavedChangesDialog } from "@/hooks/useUnsavedChanges";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import { NotebookSidebar } from "@/components/notes/NotebookSidebar";
import { EditorFooter } from "@/components/notes/EditorFooter";
import { OutlinePanel } from "@/components/notes/OutlinePanel";

export function NotebookView() {
  const { notebookId, pageId } = useParams<{ notebookId: string; pageId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  // Sidebar state with persistence
  const {
    isCollapsed: sidebarCollapsed,
    width: sidebarWidth,
    setCollapsed: setSidebarCollapsed,
    setWidth: setSidebarWidth,
  } = useSidebarState({
    storageKey: "notebook-sidebar",
    defaultCollapsed: settings.sidebar.defaultCollapsed,
    defaultWidth: settings.sidebar.width,
    minWidth: 200,
    maxWidth: 400,
  });

  // Editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [notebookName, setNotebookName] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageContent, setPageContent] = useState("");

  // Outline panel state
  const [outlineVisible, setOutlineVisible] = useState(false);
  const headings = useMarkdownOutline(pageContent);

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex bg-[#2d2a2e]">
      {/* Sidebar */}
      <NotebookSidebar
        pages={pages}
        selectedPageId={selectedPage?.id ?? null}
        width={sidebarWidth}
        isCollapsed={sidebarCollapsed}
        onSelectPage={handleSelectPage}
        onDeletePage={handleDeletePage}
        onTogglePin={handleTogglePin}
        onCreatePage={handleCreatePage}
        onCollapseChange={setSidebarCollapsed}
        onWidthChange={setSidebarWidth}
        minWidth={200}
        maxWidth={400}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notebook Header */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-[#5b595c] bg-[#403e41]">
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
        </div>

        {/* Page Editor */}
        {selectedPage ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Area */}
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

              {/* Editor Footer */}
              <EditorFooter
                content={pageContent}
                createdAt={selectedPage.createdAt}
                updatedAt={selectedPage.updatedAt}
                saveStatus={saveStatus}
                lastSavedAt={lastSavedAt}
                saveError={saveError}
                showOutlineToggle={true}
                outlineVisible={outlineVisible}
                onToggleOutline={() => setOutlineVisible(!outlineVisible)}
              />
            </div>

            {/* Outline Panel */}
            <OutlinePanel
              headings={headings}
              onHeadingClick={(heading) => {
                // For now, just log - scrolling requires editor integration
                console.log("Navigate to heading:", heading);
              }}
              isVisible={outlineVisible}
              onClose={() => setOutlineVisible(false)}
            />
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
