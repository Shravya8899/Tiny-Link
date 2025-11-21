import { defineConfig } from "@prisma/config";
import { config } from "dotenv";
config();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,   // URL MOVED HERE ✔
  },
});


