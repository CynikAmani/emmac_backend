import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initialize tables and indexes
 */
export const initTablesAndIndexes = async (db, tableQueries, indexQueries) => {
  for (const query of tableQueries) {
    await db.query(query);
  }
  for (const query of indexQueries) {
    await db.query(query);
  }
  console.log('✅ Database tables and indexes initialized.');
};

/**
 * Ensure Super Admin exists, create if not
 */
export const ensureSuperAdmin = async (db) => {
  const [rows] = await db.query(
    'SELECT id FROM users WHERE email = ?',
    [process.env.SUPER_ADMIN_EMAIL]
  );

  if (rows.length === 0) {
    const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12);

    await db.query(
      `INSERT INTO users 
      (first_name, last_name, email, user_type, password, default_password) 
      VALUES (?, ?, ?, 'Super_user', ?, true)`,
      [
        process.env.SUPER_ADMIN_FIRST_NAME,
        process.env.SUPER_ADMIN_LAST_NAME,
        process.env.SUPER_ADMIN_EMAIL,
        hashedPassword
      ]
    );

    console.log('✅ Super Admin created');
  } else {
    console.log('ℹ️ Super Admin already exists');
  }
};