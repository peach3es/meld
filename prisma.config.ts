// prisma.config.ts
import { defineConfig } from "prisma/config";
// Optional: only needed if you’ll read envs inside this file later
import "dotenv/config";

export default defineConfig({
  // explicit for clarity; default is prisma/schema.prisma
  schema: "prisma/schema.prisma",
  migrations: {
    // runs when you call `npx prisma db seed`
    // Node 20+: --env-file works cross-platform
    seed: "node --env-file=.env.local prisma/seed.mjs",
  },
});
