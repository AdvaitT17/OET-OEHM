const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const dbConfig = {
  host: '13.234.60.137',
  user: 'admin_kjsce',
  password: 'uP58a70f#',
  database: 'oet-oehm',
};
const pool = mysql.createPool(dbConfig);

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: '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', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: '431516285171-jufcjr2ra8h8k6vtt8ocbsqjp56dm3h2.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'http://localhost:3000/auth/google/callback',
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
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    done(null, user);
  } catch (error) {
    done(error);
  }
});

const isAuthenticated = (req, res, next) => {
  req.isAuthenticated() ? next() : res.redirect('/login.html');
};

app.get('/user', isAuthenticated, (req, res) => {
  res.json({ user: req.user || null });
});

const needsOnboarding = async (req, res, next) => {
  if (req.isAuthenticated()) {
    try {
      const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const user = userRows[0];

      return user.first_login ? res.render('onboarding', { user }) : res.redirect('/index.html');
    } catch (error) {
      console.error('Error fetching user information:', error);
      res.redirect('/');
    }
  } else {
    res.redirect('/login.html');
  }
};

app.post('/updateRollNumber', async (req, res) => {
  try {
    const { name, email, number } = req.body;
    const [result] = await pool.query('UPDATE users SET roll_number = ? WHERE name = ? AND email = ?', [number, name, email]);

    result.affectedRows > 0 ? res.json({ success: true, message: 'Roll Number updated successfully' }) :
                              res.json({ success: false, message: 'User not found or Roll Number already updated' });
  } catch (error) {
    console.error('Error updating Roll Number:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/', isAuthenticated, (req, res) => {
  res.redirect('/index.html');
});

app.get('/logout', (req, res) => {
  req.logout((err) => err ? res.send('Error logging out') : res.redirect('/login.html'));
});

app.use(express.static('public'));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(req.user.first_login ? '/onboarding.html' : '/index.html')
);

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
