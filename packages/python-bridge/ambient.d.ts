/**
 * Minimal typings so this package compiles before workspace `npm install` pulls `@types/*`.
 * Prefer installing `@types/express` and `@types/cors` in devDependencies when the lockfile is healthy.
 */

declare module "express" {
  export interface Request {
    body: unknown;
  }

  export interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
  }

  export type RequestHandler = (req: Request, res: Response) => void | Promise<void>;

  export interface ExpressApp {
    use(...args: unknown[]): void;
    post(path: string, handler: RequestHandler): void;
    get(path: string, handler: RequestHandler): void;
    listen(port: number, callback?: () => void): unknown;
  }

  export interface ExpressFactory {
    (): ExpressApp;
    json(_opts?: unknown): RequestHandler;
  }

  const express: ExpressFactory;
  export default express;
}

declare module "cors" {
  type CorsMiddleware = (req: unknown, res: unknown, next: () => void) => void;

  function cors(_opts?: unknown): CorsMiddleware;
  export default cors;
}
