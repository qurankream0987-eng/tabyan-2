// Main exports for @workspace/tabyan-trpc
// The frontend imports AppRouter as a type-only import.
// The API server imports the full router for serving.
export * from "./middleware";
export * from "./router";
export * from "./context";
export * from "@workspace/tabyan-domain/input-normalization";
export * from "@workspace/tabyan-domain/password-validation";
export * from "./lib/registration-validation";
export * from "./lib/video-attachment";
export * from "./lib/user-storage-ownership";
export { recitationAudioObjectPath } from "./recitation-contract";
