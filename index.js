const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL database connection setup
const dbConfig = {
  host: '13.234.60.137',
  user: 'admin_kjsce',
  password: 'uP58a70f#',
  database: 'oet-oehm',
};
const pool = mysql.createPool(dbConfig);

// Express middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: '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', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy for OAuth 2.0 authentication
passport.use(new GoogleStrategy(
  {
    clientID: '431516285171-jufcjr2ra8h8k6vtt8ocbsqjp56dm3h2.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Store user data in MySQL after successful Google authentication
      const [rows] = await pool.query(`
        INSERT INTO users (email, name, first_login, profile_picture)
        VALUES (?, ?, 1, ?) 
        ON DUPLICATE KEY UPDATE name = ?, first_login = 0, profile_picture = ?
      `, [profile.emails[0].value, profile.displayName, profile.photos[0].value, profile.displayName, profile.photos[0].value]);

      // Retrieve the user from MySQL
      const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
      const user = userRows[0];

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize and deserialize user functions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Retrieve user from MySQL
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Google authentication route
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google authentication callback route
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Redirect to onboarding or dashboard based on first login
    const redirectPath = req.user.first_login ? '/onboarding.html' : '/dashboard';
    res.redirect(redirectPath);
  }
);

// Dashboard route
app.get('/dashboard', isAuthenticated, (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`
      <h1>Welcome to the Dashboard, ${req.user.name || 'Google User'}!</h1>
      <img src="${req.user.profile_picture}" alt="Profile Picture">
      <br>
      <a href="/logout">Logout</a>
    `);
  } else {
    res.redirect('/');
  }
});

// Logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.send('Error logging out');
      }
      res.redirect('/login.html');
    });
  });
  

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
