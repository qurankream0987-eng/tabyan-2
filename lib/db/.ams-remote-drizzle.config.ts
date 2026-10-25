import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "./.ams-source-schema.ts"),
  out: path.join(__dirname, "./.ams-generated"),
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://unused:unused@localhost:5432/unused",
  },
});
