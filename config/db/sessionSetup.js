import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import dotenv from 'dotenv';
dotenv.config();

export const createSessionMiddleware = () => {
  const MySQLStore = MySQLStoreFactory(session);

  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'emmac_root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emmac',
  });

  return session({
    key: 'session_id',
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      domain: undefined,
      path: '/',
    }
  });
};
