import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="text-center">
        <div className="mx-auto h-12 w-12 text-[#5b595c]">
          {icon}
        </div>
        <h3 className="mt-2 text-sm font-medium text-[#fcfcfa]">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[#939293]">
          {description}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
