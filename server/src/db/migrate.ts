import { db } from './index.js';

async function main() {
  try {
    console.log('[Migration] Starting database migration...');
    await db.init();
    console.log('[Migration] Migration completed successfully.');
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

main();
