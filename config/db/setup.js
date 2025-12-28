import { tableQueries, indexQueries } from './initQueries.js';
import { connectDB } from './connect.js';
import { initTablesAndIndexes, ensureSuperAdmin } from './dbHelpers.js';

export const initializeDatabase = async () => {
  const db = await connectDB();

  try {
    // Initialize tables
    for (const query of tableQueries) {
      await db.query(query);
    }

    // Create indexes safely
    for (const query of indexQueries) {
      try {
        await db.query(query);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
        // Duplicate index exists — ignore
      }
    }

    // Ensure super admin exists
    await ensureSuperAdmin(db);

  } catch (err) {
    console.error('❌ Database setup error:', err.message);
    process.exit(1);
  }
};
