import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export function BackButton({
  fallbackPath = "/",
  label = "Back",
  className,
  showIcon = true,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if we have history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  const defaultClassName = "inline-flex items-center gap-1 text-sm text-[#939293] hover:text-[#fcfcfa] mb-4";

  return (
    <button
      onClick={handleBack}
      className={className || defaultClassName}
    >
      {showIcon && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      )}
      {label}
    </button>
  );
}
