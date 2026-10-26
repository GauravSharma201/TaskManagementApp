/* <---------------- 
could be used later to save user information like ip_address
----------------> */

// import session from 'express-session';
// import connectPgSimple from 'connect-pg-simple';
// import { sequelize } from './database';

// const PgSession = connectPgSimple(session);

// export const sessionMiddleware = session({
//   store: new PgSession({
//     conString: process.env.DATABASE_URL!,
//     tableName: 'session',
//     createTableIfMissing: true,
//   }),
//   secret: process.env.SESSION_SECRET || 'session_secret_key',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000, // 1 day
//   },
// });
