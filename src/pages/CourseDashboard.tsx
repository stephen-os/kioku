import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import type { Course } from "@/types";
import { getAllCourses, deleteCourse, toggleCourseFavorite, importCourse } from "@/lib/db";
import {
  SearchBar,
  SearchToggleButton,
  LoadingSpinner,
  EmptyState,
  SectionHeader,
  CardGrid,
  CourseCard,
} from "@/components";
import { useSearchFilter } from "@/hooks";
import { useToast } from "@/context/ToastContext";

const CourseIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

export function CourseDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const {
    filters,
    setNameFilter,
    setDescriptionFilter,
    clearFilters,
    hasActiveFilters,
    isVisible: isSearchVisible,
    toggleVisibility: toggleSearch,
    filteredItems: filteredCourses,
  } = useSearchFilter({
    items: courses,
    getSearchableFields: (course) => ({
      name: course.name,
      description: course.description,
    }),
    storageKey: "courses",
  });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const coursesData = await getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load courses:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (courseId: string): Promise<void> => {
    setDeletingId(courseId);
    try {
      await deleteCourse(courseId);
      toast.success("Course deleted");
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (courseId: string): Promise<void> => {
    try {
      await toggleCourseFavorite(courseId);
      loadData();
    } catch (error) {
      toast.error("Failed to update favorite");
    }
  };

  const handleImport = async (): Promise<void> => {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) return;

    setImporting(true);
    try {
      const result = await importCourse(filePath as string);
      if (result.itemsNotFound.length > 0) {
        toast.success(
          `Imported "${result.course.name}" with ${result.itemsLinked} items. ` +
          `${result.itemsNotFound.length} items not found (import those decks/quizzes first).`
        );
      } else {
        toast.success(`Imported "${result.course.name}" with ${result.itemsLinked} items`);
      }
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import course");
    } finally {
      setImporting(false);
    }
  };

  const favoriteCourses = filteredCourses.filter((c) => c.isFavorite);
  const regularCourses = filteredCourses.filter((c) => !c.isFavorite);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-full bg-[#2d2a2e]">
      <main className="max-w-7xl mx-auto py-6 px-6">
        <div className="fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <SearchToggleButton
                isVisible={isSearchVisible}
                hasActiveFilters={hasActiveFilters}
                onClick={toggleSearch}
              />
              <h2 className="text-2xl font-bold text-[#fcfcfa] font-mono">Courses</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#fcfcfa] bg-[#5b595c] hover:bg-[#5b595c]/80 transition-colors disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import Course"}
              </button>
              <Link
                to="/courses/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-[#2d2a2e] bg-[#ffd866] hover:bg-[#ffd866]/90 transition-colors"
              >
                + New Course
              </Link>
            </div>
          </div>

          <SearchBar
            isVisible={isSearchVisible}
            nameValue={filters.name}
            descriptionValue={filters.description}
            onNameChange={setNameFilter}
            onDescriptionChange={setDescriptionFilter}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            namePlaceholder="Filter by course name..."
            descriptionPlaceholder="Filter by description..."
          />

          {filteredCourses.length === 0 ? (
            <EmptyState
              icon={<CourseIcon />}
              title={hasActiveFilters ? "No matching courses" : "No courses"}
              description={
                hasActiveFilters
                  ? "Try adjusting your search filters."
                  : "Get started by creating a learning path to organize your decks and quizzes."
              }
              action={
                hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-[#ffd866] hover:underline">
                    Clear filters
                  </button>
                )
              }
            />
          ) : (
            <>
              {favoriteCourses.length > 0 && (
                <div className="mb-6">
                  <SectionHeader title="Favorites" showStar />
                  <CardGrid>
                    {favoriteCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onDelete={() => handleDelete(course.id)}
                        onToggleFavorite={() => handleToggleFavorite(course.id)}
                        isDeleting={deletingId === course.id}
                      />
                    ))}
                  </CardGrid>
                </div>
              )}

              {regularCourses.length > 0 && (
                <div>
                  {favoriteCourses.length > 0 && <SectionHeader title="All Courses" />}
                  <CardGrid>
                    {regularCourses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onDelete={() => handleDelete(course.id)}
                        onToggleFavorite={() => handleToggleFavorite(course.id)}
                        isDeleting={deletingId === course.id}
                      />
                    ))}
                  </CardGrid>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
