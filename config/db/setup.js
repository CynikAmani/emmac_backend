import { tableQueries, indexQueries } from './initQueries.js';
import { connectDB } from './connect.js';
import { initTablesAndIndexes, ensureSuperAdmin } from './dbHelpers.js';

export const initializeDatabase = async () => {
  const db = await connectDB();

  try {
    await initTablesAndIndexes(db, tableQueries, indexQueries);
    await ensureSuperAdmin(db);
  } catch (err) {
    console.error('❌ Database setup error:', err.message);
    process.exit(1);
  }
};