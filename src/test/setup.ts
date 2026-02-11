import "@testing-library/jest-dom";
import { vi } from "vitest";

// Fix for React 19 + happy-dom compatibility
// React 19 checks for scheduler implementation in browser
if (typeof window !== "undefined") {
  // @ts-expect-error - Mock scheduler for React 19
  window.MessageChannel = class MessageChannel {
    port1 = {
      onmessage: null as ((ev: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      close: vi.fn(),
      start: vi.fn(),
    };
    port2 = {
      onmessage: null as ((ev: MessageEvent) => void) | null,
      postMessage: vi.fn(),
      close: vi.fn(),
      start: vi.fn(),
    };
  };
}

// Mock Tauri APIs for testing
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

// Mock matchMedia for components that use it
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
