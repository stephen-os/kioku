import { useState, useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useToast } from "@/context/ToastContext";
import {
  isPiperInstalled,
  getPiperVoices,
  installPiper,
  uninstallPiper,
  downloadVoice,
  deleteVoice,
  formatBytes,
  getPiperStorageSize,
  type PiperVoice,
  type DownloadProgress,
} from "@/lib/piper";

function VoiceItem({
  voice,
  isDownloading,
  progress,
  onDownload,
  onDelete,
  disabled,
}: {
  voice: PiperVoice;
  isDownloading: boolean;
  progress: DownloadProgress | null;
  onDownload: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  if (isDownloading && progress) {
    return (
      <div className="flex items-center justify-between p-3 bg-[#2d2a2e] rounded-lg border border-[#ffd866]/30">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded bg-[#ffd866]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#ffd866] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-[#fcfcfa]">{voice.name}</p>
              <span className="text-xs text-[#ffd866]">{Math.round(progress.progress * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[#5b595c] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffd866] rounded-full transition-all duration-300"
                style={{ width: `${progress.progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-[#2d2a2e] rounded-lg border border-[#5b595c]">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${
          voice.isInstalled ? 'bg-[#78dce8]/20' : 'bg-[#5b595c]/50'
        }`}>
          {voice.isInstalled ? (
            <svg className="w-4 h-4 text-[#78dce8]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#5b595c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[#fcfcfa]">{voice.name}</p>
          <p className="text-xs text-[#939293]">{voice.languageCode} • {voice.sizeMb} MB</p>
        </div>
      </div>
      {voice.isInstalled ? (
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs text-[#ff6188] hover:bg-[#ff6188]/10 rounded transition-colors"
        >
          Remove
        </button>
      ) : (
        <button
          onClick={onDownload}
          disabled={disabled}
          className="px-3 py-1 text-xs bg-[#78dce8] text-[#2d2a2e] rounded hover:bg-[#78dce8]/90 transition-colors font-medium disabled:opacity-50"
        >
          Download
        </button>
      )}
    </div>
  );
}

export function PiperSettings() {
  const toast = useToast();

  const [piperInstalled, setPiperInstalled] = useState<boolean | null>(null);
  const [piperVoices, setPiperVoices] = useState<PiperVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingPiper, setInstallingPiper] = useState(false);
  const [downloadingVoice, setDownloadingVoice] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [storageSize, setStorageSize] = useState<number>(0);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<DownloadProgress>("piper-download-progress", (event) => {
      setDownloadProgress(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const loadState = async () => {
    try {
      setLoading(true);
      const [installed, voices, size] = await Promise.all([
        isPiperInstalled(),
        getPiperVoices(),
        getPiperStorageSize(),
      ]);
      setPiperInstalled(installed);
      setPiperVoices(voices);
      setStorageSize(size);
    } catch (error) {
      console.error("Failed to load TTS state:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPiper = async () => {
    try {
      setInstallingPiper(true);
      setDownloadProgress({ id: "piper", progress: 0, message: "Starting..." });
      await installPiper();
      toast.success("Piper TTS engine installed");
      await loadState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to install Piper");
    } finally {
      setInstallingPiper(false);
      setDownloadProgress(null);
    }
  };

  const handleUninstallPiper = async () => {
    try {
      await uninstallPiper();
      toast.success("Piper TTS engine removed");
      await loadState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove Piper");
    }
  };

  const handleDownloadVoice = async (voiceId: string) => {
    try {
      setDownloadingVoice(voiceId);
      setDownloadProgress({ id: voiceId, progress: 0, message: "Starting..." });
      await downloadVoice(voiceId);
      toast.success("Voice model downloaded");
      await loadState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download voice");
    } finally {
      setDownloadingVoice(null);
      setDownloadProgress(null);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    try {
      await deleteVoice(voiceId);
      toast.success("Voice model removed");
      await loadState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove voice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#939293] py-4">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Loading TTS settings...</span>
      </div>
    );
  }

  const installedCount = piperVoices.filter(v => v.isInstalled).length;

  return (
    <div className="space-y-4">
      {/* Piper Engine */}
      <div className={`p-4 bg-[#2d2a2e] rounded-lg border ${installingPiper ? 'border-[#ffd866]/30' : 'border-[#5b595c]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${piperInstalled ? 'bg-[#a9dc76]/20' : 'bg-[#5b595c]/50'}`}>
              <svg className={`w-5 h-5 ${piperInstalled ? 'text-[#a9dc76]' : 'text-[#939293]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[#fcfcfa]">Piper TTS Engine</p>
              <p className="text-xs text-[#939293]">
                {piperInstalled ? "Installed and ready" : "Offline text-to-speech synthesis"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!piperInstalled && <span className="text-xs text-[#939293]">~25 MB</span>}
            {piperInstalled ? (
              <button
                onClick={handleUninstallPiper}
                className="px-3 py-1.5 text-[#ff6188] text-sm hover:bg-[#ff6188]/10 rounded-lg transition-colors"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={handleInstallPiper}
                disabled={installingPiper}
                className="px-3 py-1.5 bg-[#a9dc76] text-[#2d2a2e] rounded-lg text-sm font-medium hover:bg-[#a9dc76]/90 transition-colors disabled:opacity-50"
              >
                {installingPiper ? "Installing..." : "Install"}
              </button>
            )}
          </div>
        </div>

        {installingPiper && downloadProgress?.id === "piper" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-[#939293] mb-1">
              <span>{downloadProgress.message}</span>
              <span>{Math.round(downloadProgress.progress * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[#5b595c] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffd866] rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Voice Models */}
      {piperInstalled && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#939293] uppercase tracking-wider">Voice Models</h3>
            <span className="text-xs text-[#5b595c]">
              {installedCount} of {piperVoices.length} installed
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {piperVoices.map((voice) => (
              <VoiceItem
                key={voice.id}
                voice={voice}
                isDownloading={downloadingVoice === voice.id}
                progress={downloadingVoice === voice.id ? downloadProgress : null}
                onDownload={() => handleDownloadVoice(voice.id)}
                onDelete={() => handleDeleteVoice(voice.id)}
                disabled={downloadingVoice !== null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#5b595c]">
          Piper provides high-quality offline text-to-speech.
        </p>
        {storageSize > 0 && (
          <span className="text-xs text-[#939293]">{formatBytes(storageSize)} used</span>
        )}
      </div>
    </div>
  );
}
