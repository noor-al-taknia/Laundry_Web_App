import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./BE/platform-api/drizzle",
  schema: "./BE/platform-api/db/schema.ts",
  dialect: "sqlite",
});
