export function LoadingSpinner() {
  return (
    <div className="min-h-full flex items-center justify-center bg-[#2d2a2e]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#ffd866] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#939293]">Loading...</p>
      </div>
    </div>
  );
}
