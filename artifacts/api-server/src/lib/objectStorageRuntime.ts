import { ReplitObjectStorageProvider } from "./ReplitObjectStorageProvider";
import { RailwayObjectStorageProvider } from "./RailwayObjectStorageProvider";
import { ObjectStorageService } from "./objectStorage";

const providerName = (process.env.TABYAN_OBJECT_STORAGE_PROVIDER ?? "replit").trim();
const provider =
  providerName === "replit"
    ? new ReplitObjectStorageProvider()
    : providerName === "railway"
      ? new RailwayObjectStorageProvider()
      : null;

if (!provider) {
  throw new Error(
    `Unsupported TABYAN_OBJECT_STORAGE_PROVIDER: ${providerName || "(empty)"}`,
  );
}

export const objectStorageService = new ObjectStorageService(provider);
