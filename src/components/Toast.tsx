import { useToast, ToastType } from "../context/ToastContext";

const toastStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "bg-[#a9dc76]/10",
    border: "border-[#a9dc76]/30",
    text: "text-[#a9dc76]",
    icon: "M5 13l4 4L19 7", // Checkmark
  },
  error: {
    bg: "bg-[#ff6188]/10",
    border: "border-[#ff6188]/30",
    text: "text-[#ff6188]",
    icon: "M6 18L18 6M6 6l12 12", // X
  },
  warning: {
    bg: "bg-[#fc9867]/10",
    border: "border-[#fc9867]/30",
    text: "text-[#fc9867]",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", // Warning triangle
  },
  info: {
    bg: "bg-[#78dce8]/10",
    border: "border-[#78dce8]/30",
    text: "text-[#78dce8]",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", // Info circle
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              ${style.bg} ${style.border} ${style.text}
              border rounded-lg px-4 py-3 shadow-lg
              flex items-start gap-3
              animate-toast-in
            `}
            role="alert"
          >
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={style.icon} />
            </svg>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
