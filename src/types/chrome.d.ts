// Type definitions for Chrome's Built-in AI APIs (Gemini Nano)
// Supporting multiple API versions for maximum compatibility

declare global {
  interface AILanguageModelCreateOptions {
    signal?: AbortSignal;
    monitor?: (monitor: AICreateMonitor) => void;
    systemPrompt?: string;
    initialPrompts?: Array<{ role: string; content: string }>;
    topK?: number;
    temperature?: number;
  }

  interface AICreateMonitor extends EventTarget {
    addEventListener(
      type: 'downloadprogress',
      listener: (event: { loaded: number; total: number }) => void
    ): void;
  }

  interface AILanguageModel {
    prompt(input: string, options?: any): Promise<string>;
    promptStreaming(input: string, options?: any): ReadableStream;
    destroy(): Promise<void>;
    clone(options?: { signal?: AbortSignal }): Promise<AILanguageModel>;
  }

  interface AILanguageModelFactory {
    create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
    availability(): Promise<'readily' | 'after-download' | 'no'>;
    capabilities(): Promise<any>;
  }

  // Modern API structure (Chrome 138+)
  const ai: {
    languageModel: AILanguageModelFactory;
  } | undefined;

  // Alternative global object naming
  const LanguageModel: AILanguageModelFactory | undefined;
}

declare namespace chrome.runtime {
  export const lastError: {
      message?: string;
  } | undefined;
}

export {};
