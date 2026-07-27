import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.MYSQL_URL) {
  throw new Error("MYSQL_URL must be set. Provide your MySQL connection string.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_URL,
  },
});
