/// <reference types="npm:hono" />

declare module "npm:hono" {
    export * from "hono";
}

declare module "npm:hono/cookie" {
    export * from "hono/cookie";
}

declare module "npm:google-auth-library" {
    export * from "google-auth-library";
}

declare module "npm:jose" {
    export * from "jose";
}

// Deno environment types
declare namespace Deno {
    function env(): { get(key: string): string | undefined };
    function exit(code?: number): never;
    function mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
    namespace errors {
        class AlreadyExists extends Error { }
    }
    function serve(options: { port: number; hostname?: string }): void;
} 