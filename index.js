require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());
const PORT = process.env.PORT;

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool({ ...dbConfig });

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
      INSERT INTO users (email, name, profile_picture)
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE name = ?, profile_picture = ?
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

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'ETIMEDOUT') {
    res.redirect('/login.html'); // Redirect to login page on timeout
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Custom middleware for authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login.html');
  }
};

const isAuthenticatedAndOnboarded = (req, res, next) => {
  if (req.isAuthenticated()) {
    const userEmail = req.user.email;
    // Check if the user is authenticated and has completed the onboarding process
    pool.query('SELECT * FROM users WHERE email = ?', [userEmail])
      .then(([userRows]) => {
        const user = userRows[0];
        if (user && user.onboarded === 0) {
          // If the user has not completed onboarding, redirect to onboarding page
          res.redirect('/onboarding.html');
        } else if (user && user.onboarded === 1) {
          // If the user has completed onboarding, allow access to index.html
          next();
        } else {
          // If onboarded status is not defined, handle appropriately
          res.redirect('/login.html');
        }
      })
      .catch(error => {
        console.error('Error checking user onboarding status:', error);
        res.redirect('/login.html'); // Redirect to login page on error
      });
  } else {
    res.redirect('/login.html'); // Redirect to login page if not authenticated
  }
};

// Route to serve onboarding.html
app.get('/onboarding.html', isAuthenticated, (req, res) => {
  const userEmail = req.user.email;
  pool.query('SELECT onboarded FROM users WHERE email = ?', [userEmail])
    .then(([userRows]) => {
      const user = userRows[0];
      if (user && user.onboarded === 0) {
        // If the user has not completed onboarding, allow access to onboarding.html
        res.sendFile(path.join(__dirname, '/public/onboarding.html'));
      } else {
        // If the user has completed onboarding or the onboarded status is not defined, redirect to index.html
        res.redirect('/index.html');
      }
    })
    .catch(error => {
      console.error('Error checking user onboarding status:', error);
      res.redirect('/login.html'); // Redirect to login page on error
    });
});

// User service or utility function
const getUserData = async (req, res) => {
  // Check if the user is authenticated
  if (!req.user) {
    return null;
  }

  // Create a sanitized user object with only necessary properties
  const sanitizedUser = {
    name: req.user.name,
    email: req.user.email,
    profile_picture: req.user.profile_picture,
  };

  return sanitizedUser;
};

// Route to fetch user data
app.get('/user', isAuthenticated, async (req, res) => {
  try {
    const userData = await getUserData(req);

    if (!userData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({ user: userData });
  } catch (err) {
    console.error('Error fetching user data:', err);
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

async function isValidEnumValue(tableName, fieldName, value) {
  try {
    const query = `
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = ? AND COLUMN_NAME = ?;
    `;
    const [rows] = await pool.query(query, [tableName, fieldName]);

    const enumValues = rows[0].COLUMN_TYPE.match(/'([^']+)'/g).map(value => value.slice(1, -1));
    return enumValues.includes(value);
  } catch (error) {
    console.error('Error checking enum value:', error);
    return false;
  }
}

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

// Logout route
app.get('/logout', (req, res) => {
  req.logout((err) => err ? res.send('Error logging out') : res.redirect('/login.html'));
});

// Google authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(req.user.onboarded ? '/index.html' : '/onboarding.html')
);

// Route to serve onboarding.html
app.get('/onboarding.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/onboarding.html'));
});

// Route to serve index.html
app.get(['/', '/index.html'], isAuthenticatedAndOnboarded, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));