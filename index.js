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
  user: 'kjsce_admin',
  password: 'admin@kjsce',
  database: 'oet-oehm-student',
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

// Route to save selected courses
app.post('/api/saveSelectedCourses', async (req, res) => {
  try {
    const { selectedCourses, userEmail } = req.body;

    // Validate the received data
    if (!selectedCourses || !Array.isArray(selectedCourses) || selectedCourses.length === 0 || !userEmail) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Calculate total hours of selected courses (if needed)
    // Assuming you have a function to calculate total hours
    const totalHours = await calculateTotalHours(selectedCourses);

    // Check if total hours are within the specified range
    if (totalHours < 30 || totalHours > 45) {
      return res.status(400).json({ error: 'Total hours of selected courses must be between 30 and 45.' });
    }

    // Save selected courses to the database
    await saveSelectedCoursesToDatabase(userEmail, selectedCourses);

    // Respond with success message
    res.json({ message: 'Selected courses saved successfully.' });
  } catch (error) {
    console.error('Error saving selected courses:', error);
    res.status(500).json({ error: 'Failed to save selected courses. Please try again.' });
  }
});

// Function to calculate total hours of selected courses
async function calculateTotalHours(selectedCourses) {
  // Implement your logic to calculate total hours
  // Example: Iterate through selectedCourses, fetch hours for each course from the database, and sum them
  let totalHours = 0;
  for (const courseId of selectedCourses) {
    // Fetch hours for courseId from the database
    const course = await fetchCourseById(courseId);
    if (course) {
      totalHours += course.hours;
    }
  }
  return totalHours;
}

// Function to fetch course by ID from the database
async function fetchCourseById(courseId) {
  // Implement your logic to fetch course by ID from the database
  // Example: Query the courses_online table to fetch the course by its ID
  // Replace this with your actual database query
  const [rows] = await db.query('SELECT * FROM courses_online WHERE course_id = ?', [courseId]);
  return rows[0]; // Assuming course_id is unique and only one course is returned
}

// Function to save selected courses to the database
async function saveSelectedCoursesToDatabase(userEmail, selectedCourses) {
  // Implement your logic to insert selected courses into the database
  // Example: Insert each selected course into the students_online table
  for (const courseId of selectedCourses) {
    await db.query('INSERT INTO students_online (email, course_id) VALUES (?, ?)', [userEmail, courseId]);
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

app.post('/updateRollNumber', isAuthenticated, async (req, res) => {
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

app.post('/updateUserData', isAuthenticated, async (req, res) => {
  const field = req.body.field;
  const value = req.body.value;
  const userEmail = req.user.email;

  try {
    // Check if the value is valid for the ENUM field
    const isValidValue = await isValidEnumValue(field, value);
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

async function isValidEnumValue(field, value) {
  // Query the INFORMATION_SCHEMA.COLUMNS table to get the possible ENUM values for the specified field
  const [rows] = await pool.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = ?;
  `, [field]);

  // Extract the ENUM values from the column type definition
  const enumValues = rows[0].COLUMN_TYPE.match(/'([^']+)'/g).map(value => value.slice(1, -1));

  // Check if the provided value exists in the ENUM values
  return enumValues.includes(value);
}

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
