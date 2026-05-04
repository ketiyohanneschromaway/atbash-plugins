declare module "@elizaos/core" {
  export interface Memory {
    content?: {
      text?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface State {
    [key: string]: unknown;
  }

  export interface HandlerResult {
    success?: boolean;
    text?: string;
    data?: unknown;
    [key: string]: unknown;
  }

  export type HandlerCallback = (response: { text: string; [key: string]: unknown }) => void;

  export interface IAgentRuntime {
    getSetting(key: string): string | boolean | number | null;
    getService<T = unknown>(serviceName: string): T | null;
  }

  export interface Action {
    name: string;
    description: string;
    similes?: string[];
    validate?: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
    handler?: (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: Record<string, unknown>,
      callback?: HandlerCallback,
    ) => Promise<HandlerResult | void | undefined>;
    examples?: unknown[];
  }

  export interface Provider {
    name: string;
    description: string;
    get: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<string>;
  }

  export interface Evaluator {
    name: string;
    description: string;
    validate?: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: Record<string, unknown>,
      callback?: HandlerCallback,
    ) => Promise<void>;
  }

  export abstract class Service {
    static serviceType: string;
    constructor(runtime?: IAgentRuntime);
    initialize?(runtime: IAgentRuntime): Promise<void>;
  }
}
