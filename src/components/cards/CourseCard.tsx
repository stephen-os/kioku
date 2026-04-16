import { Link } from "react-router-dom";
import type { Course } from "@/types";
import { FavoriteButton } from "../ui/FavoriteButton";
import { DeleteConfirmButton } from "../ui/DeleteConfirmButton";
import { ProgressBar } from "../ui/ProgressBar";

interface CourseCardProps {
  course: Course;
  onDelete: () => void;
  onToggleFavorite: () => void;
  isDeleting?: boolean;
}

export function CourseCard({ course, onDelete, onToggleFavorite, isDeleting }: CourseCardProps) {
  const lessonCount = course.lessonCount ?? 0;
  const completedCount = course.completedLessonCount ?? 0;
  const progressPercent = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div className="block bg-[#403e41] overflow-hidden rounded-xl border border-[#5b595c] hover:border-[#939293] transition-colors">
      <Link to={`/courses/${course.id}`} className="block px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-[#78dce8]/20 text-[#78dce8]">
              {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            {lessonCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                progressPercent === 100
                  ? "bg-[#a9dc76]/20 text-[#a9dc76]"
                  : "bg-[#ab9df2]/20 text-[#ab9df2]"
              }`}>
                {progressPercent}% complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FavoriteButton
              isFavorite={course.isFavorite ?? false}
              onClick={handleFavoriteClick}
              size="sm"
            />
            <span className="text-xs text-[#939293] font-mono">
              {new Date(course.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <h3 className="text-base font-medium text-[#fcfcfa] truncate">
          {course.name}
        </h3>
        <p className="mt-1 text-sm text-[#939293] line-clamp-2">
          {course.description || "No description"}
        </p>
        {lessonCount > 0 && (
          <div className="mt-3">
            <ProgressBar percent={progressPercent} />
          </div>
        )}
      </Link>
      <div className="px-5 pb-4 flex gap-2">
        <Link
          to={`/courses/${course.id}`}
          className="flex-1 text-center px-3 py-2 bg-[#a9dc76]/20 text-[#a9dc76] text-sm rounded-lg hover:bg-[#a9dc76]/30 transition-colors font-medium"
        >
          Continue
        </Link>
        <Link
          to={`/courses/${course.id}/edit`}
          className="flex-1 text-center px-3 py-2 bg-[#ffd866]/20 text-[#ffd866] text-sm rounded-lg hover:bg-[#ffd866]/30 transition-colors font-medium"
        >
          Edit
        </Link>
        <DeleteConfirmButton onConfirm={onDelete} isDeleting={isDeleting} />
      </div>
    </div>
  );
}
