// CLI entry: `npm run db:seed-demo`. Kept separate from seed-demo.ts so the
// seeding module stays side-effect free when bundled into the Nitro server
// (Nitro rewrites import.meta.url to the server entry, which made the old
// in-module CLI guard fire on import and process.exit(1) the production app).
import "dotenv/config";
import { client } from "./connection";
import { seedDemo } from "./seed-demo";

seedDemo()
  .then(() => client.end())
  .catch((err) => {
    console.error("❌ seedDemo failed:", err);
    return client.end().then(() => process.exit(1));
  });
