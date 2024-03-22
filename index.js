require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');
const { body, validationResult } = require('express-validator');
//const cron = require('node-cron');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8080;

const poolConfig = {
  connectionLimit: 10, // maximum number of connections in the pool
};

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 60000, // 60 seconds
};

const pool = mysql.createPool({ ...dbConfig, ...poolConfig });

// Periodic database ping
//  const pingDatabase = async () => {
//    try {
//      await pool.query('SELECT 1');
//      console.log('Database pinged successfully');
//    } catch (error) {
//      console.error('Error pinging database:', error);
//    }
//  };

  // Schedule the pingDatabase function to run every minute
//  cron.schedule('* * * * *', pingDatabase);

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const [rows] = await pool.query(`
      INSERT INTO users (email, name, first_login, profile_picture)
      VALUES (?, ?, 1, ?) 
      ON DUPLICATE KEY UPDATE name = ?, first_login = 0, profile_picture = ?
    `, [profile.emails[0].value, profile.displayName, profile.photos[0].value, profile.displayName, profile.photos[0].value]);

    const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
    const user = userRows[0];

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.email); // Serialize using the email instead of id
});

passport.deserializeUser(async (email, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    done(null, user);
  } catch (error) {
    done(error);
  }
});

const isAuthenticated = (req, res, next) => {
  req.isAuthenticated() ? next() : res.redirect('/login.html');
};

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'ETIMEDOUT') {
    res.redirect('/login.html'); // Redirect to login page on timeout
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to fetch course data from the database
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT course_name, university, domain, difficulty_level, language, hours FROM courses_online;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Refactored route for updating user data
app.post('/updateUserData', isAuthenticated, [
  body('field').isString().notEmpty().withMessage('Field is required'),
  body('value').isString().notEmpty().withMessage('Value is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { field, value } = req.body;
  const userEmail = req.user.email;

  try {
    // Validate the field and value
    const isValidValue = await isValidEnumValue('users', field, value);
    if (!isValidValue) {
      return res.status(400).json({ success: false, message: `Invalid value for ${field}` });
    }

    // Update the specified field in the database
    await pool.query(`UPDATE users SET ${field} = ? WHERE email = ?`, [value, userEmail]);
    res.json({ success: true, message: `${field} updated successfully` });
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    res.status(500).json({ success: false, message: `Failed to update ${field}` });
  }
});

// Function to check if a value is valid for an ENUM field
async function isValidEnumValue(tableName, fieldName, value) {
  try {
    const [rows] = await pool.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = ? AND COLUMN_NAME = ?;
    `, [tableName, fieldName]);

    const enumValues = rows[0].COLUMN_TYPE.match(/'([^']+)'/g).map(value => value.slice(1, -1));
    return enumValues.includes(value);
  } catch (error) {
    console.error('Error checking enum value:', error);
    return false;
  }
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to fetch user data
app.get('/user', isAuthenticated, (req, res) => {
  res.json({ user: req.user || null });
});

// Route for onboarding page
app.get('/onboarding.html', isAuthenticated, async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [req.user.email]);
    const user = userRows[0];
    if (user && user.first_login === 1) {
      // Pass user email to the client-side code
      res.sendFile(path.join(__dirname, '/public/onboarding.html'));
    } else {
      res.redirect('/index.html');
    }
  } catch (error) {
    console.error('Error fetching user information:', error);
    res.redirect('/');
  }
});

app.post('/updateRollNumber', isAuthenticated, [
  body('rollNumber').isString().notEmpty().withMessage('Roll number is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const rollNumber = req.body.rollNumber;
  const userEmail = req.user.email;

  try {
    // Update the roll number in the database
    await pool.query('UPDATE users SET roll_number = ? WHERE email = ?', [rollNumber, userEmail]);
    res.json({ success: true, message: 'Roll number updated successfully' });
  } catch (error) {
    console.error('Error updating roll number:', error);
    res.status(500).json({ success: false, message: 'Failed to update roll number' });
  }
});

// Route to serve index.html
app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout((err) => err ? res.send('Error logging out') : res.redirect('/login.html'));
});

// Google authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(req.user.first_login ? '/onboarding.html' : '/index.html')
);

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));