// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace chrome.ai {
  export function createTextSession(
    options?: any
  ): Promise<TextSession>;
  
  export function getAvailability(): Promise<string>;

  export interface TextSession {
    prompt(prompt: string): Promise<string>;
    destroy(): Promise<void>;
  }
}

declare namespace chrome.runtime {
  export const lastError: {
      message?: string;
  } | undefined;
}
