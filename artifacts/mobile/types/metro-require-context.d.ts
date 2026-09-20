// Metro (the RN/Expo bundler) injects `require.context(...)` at build time,
// like webpack does, but Node's own `NodeRequire` type doesn't declare it.
// See lib/mushaf-native.ts, which calls it behind a disabled feature flag.
interface RequireContext {
  keys(): string[];
  (id: string): unknown;
  resolve(id: string): string;
  id: string;
}

interface NodeRequire {
  context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
}
