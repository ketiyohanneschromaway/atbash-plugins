declare module "@elizaos/core" {
  export interface Memory {
    content?: {
      text?: string;
      action?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface State {
    [key: string]: unknown;
  }

  export interface HandlerOptions {
    [key: string]: unknown;
  }

  export interface ActionResult {
    success: boolean;
    text?: string;
    values?: Record<string, unknown>;
    data?: unknown;
    error?: string | Error;
  }

  export type HandlerCallback = (response: {
    text?: string;
    [key: string]: unknown;
  }) => Promise<Memory[]>;

  export interface IAgentRuntime {
    actions: Action[];
    evaluators: Evaluator[];
    providers: Provider[];
    plugins: Plugin[];
    getSetting(key: string): string | boolean | number | null;
    getService<T = unknown>(serviceName: string): T | null;
    getServiceLoadPromise?(serviceType: string): Promise<unknown>;
    initialize?(options?: { skipMigrations?: boolean }): Promise<void>;
    stop?(): Promise<void>;
  }

  export interface Action {
    name: string;
    description: string;
    similes?: string[];
    validate?: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: HandlerOptions,
      callback?: HandlerCallback,
      responses?: Memory[],
    ) => Promise<ActionResult | void | undefined>;
    examples?: unknown[];
    [key: string]: unknown;
  }

  export interface ProviderResult {
    text?: string;
    values?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }

  export interface Provider {
    name: string;
    description?: string;
    get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
    [key: string]: unknown;
  }

  export interface Evaluator {
    name: string;
    description: string;
    validate?: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
    handler: (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: HandlerOptions,
      callback?: HandlerCallback,
      responses?: Memory[],
    ) => Promise<ActionResult | void | undefined>;
    examples?: unknown[];
    [key: string]: unknown;
  }

  export interface Plugin {
    name: string;
    description?: string;
    actions?: Action[];
    providers?: Provider[];
    evaluators?: Evaluator[];
    services?: Array<typeof Service>;
    config?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export abstract class Service {
    static serviceType: string;
    protected runtime: IAgentRuntime;
    constructor(runtime?: IAgentRuntime);
    abstract capabilityDescription: string;
    static start(runtime: IAgentRuntime): Promise<Service>;
    abstract stop(): Promise<void>;
  }

  export class AgentRuntime implements IAgentRuntime {
    actions: Action[];
    evaluators: Evaluator[];
    providers: Provider[];
    plugins: Plugin[];
    constructor(opts: {
      adapter?: unknown;
      plugins?: Plugin[];
      character?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      fetch?: typeof fetch;
    });
    initialize(options?: { skipMigrations?: boolean }): Promise<void>;
    stop(): Promise<void>;
    getSetting(key: string): string | boolean | number | null;
    getService<T = unknown>(serviceName: string): T | null;
    getServiceLoadPromise(serviceType: string): Promise<unknown>;
  }
}
