import { useState, useEffect } from "react";

interface ConnectionStatus {
  online: boolean;
  pendingChanges: number;
}

export function ConnectionIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>({
    online: navigator.onLine,
    pendingChanges: 0,
  });

  useEffect(() => {
    const handleOnline = () => setStatus((s) => ({ ...s, online: true }));
    const handleOffline = () => setStatus((s) => ({ ...s, online: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {status.pendingChanges > 0 && (
        <span className="text-xs text-[#fc9867]">
          {status.pendingChanges} pending
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            status.online ? "bg-[#a9dc76]" : "bg-[#ff6188]"
          }`}
        />
        <span className="text-xs text-[#939293]">
          {status.online ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}
