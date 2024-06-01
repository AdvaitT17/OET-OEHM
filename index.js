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
    semester: req.user.semester,
    onboarded: req.user.onboarded,
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

// Function to update academic year in the Users table
function updateAcademicYear(userEmail, newSemester) {
  // Fetch the current year
  const currentYear = new Date().getFullYear();

  // Calculate the academic year based on the current year and the provided semester
  let academicYear = currentYear;

  // Adjust the academic year based on the semester
  if (newSemester % 2 === 0) {
    // For even semesters, increment the academic year
    academicYear++;
  } else {
    // For odd semesters, no change in academic year
  }

  // Construct the academic year string
  const academicYearString = `${academicYear - 1}-${academicYear}`;

  // Update the academic year in the Users table
  const query = `UPDATE users SET academic_year = ? WHERE email = ?`;
  pool.query(query, [academicYearString, userEmail], (error, results) => {
    if (error) {
      console.error('Error updating academic year:', error);
      return;
    }
    console.log('Academic year updated successfully');
  });
}


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
    // Skip ENUM validation for fields that are not ENUM types
    if (field !== 'semester') {
      await pool.query(`UPDATE users SET ${field} = ? WHERE email = ?`, [value, userEmail]);
      return res.json({ success: true, message: `${field} updated successfully` });
    }

    // Proceed with ENUM validation for 'semester'
    const isValidValue = await isValidEnumValue('users', field, value);
    if (!isValidValue) {
      return res.status(400).json({ success: false, message: `Invalid value for ${field}` });
    }

    // Update the semester in the database
    await pool.query(`UPDATE users SET ${field} = ? WHERE email = ?`, [value, userEmail]);
    
    // Calculate and update the academic year based on the new semester
    updateAcademicYear(userEmail, value);

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

    // Check if rows are returned and if COLUMN_TYPE is not null
    if (!rows || rows.length === 0 || !rows[0].COLUMN_TYPE) {
      console.error('No COLUMN_TYPE found for the specified field.');
      return false;
    }

    // Extract enum values and check if the provided value is valid
    const enumValues = rows[0].COLUMN_TYPE.match(/'([^']+)'/g).map(enumValue => enumValue.replace(/'/g, ''));
    return enumValues.includes(value);
  } catch (error) {
    console.error('Error checking enum value:', error);
    return false;
  }
}

// Route to fetch online course data from the database
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT course_id, course_name, university, domain, difficulty_level, language, hours FROM courses_online;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.toString() });
  }
});

// Route to fetch offline course data from the database
app.get('/api/courses_offline', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        course_code, 
        course_name, 
        faculty_name, 
        semester, 
        faculty_email, 
        course_type 
      FROM courses_offline;
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching offline courses:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.toString() });
  }
});

// Endpoint to handle course enrollment
app.post('/api/enroll', isAuthenticated, async (req, res) => {
  console.log('Enrollment request received:', req.body); // Server-side debugging log

  try {
    const userEmail = req.user.email; // Get the user email from the session
    const courses = req.body.courses; // Array of courses from the client

    // Fetch the current semester of the user from the Users table
    const [userRows] = await pool.query('SELECT semester FROM users WHERE email = ?', [userEmail]);
    const userSemester = userRows[0].semester;

    // Fetch the current academic year
    const currentAcademicYear = await getCurrentAcademicYear();

    // Validate courses
    const isValid = await validateCourses(userEmail, courses);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Course validation failed' });
    }

    // Begin a transaction to ensure atomicity of the enrollment process
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert each course enrollment into the database
      for (const course of courses) {
        // Ensure course_id is not null or undefined
        if (!course.course_id || !course.type) {
          throw new Error('Course ID is missing');
        }
        await connection.query('INSERT INTO enrollments (email, course_id, total_hours, mode, type, enrolled_academic_year, enrolled_semester) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [userEmail, course.course_id, course.total_hours, course.mode, course.type, currentAcademicYear, userSemester]);
      }

      // Commit the transaction
      await connection.commit();
      connection.release();

      // Call the function to check enrollment and set onboarded status
      await checkEnrollmentAndSetOnboarded(userEmail, userSemester);

      res.json({ success: true, message: 'Enrollment successful' });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      connection.release();
      console.error('Enrollment error:', error);
      res.status(500).json({ success: false, message: 'Enrollment failed' });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, message: 'Enrollment failed' });
  }
});

// Function to validate courses before enrollment
async function validateCourses(userEmail, courses) {
  try {
    // Fetch the user's past enrollments
    const [pastEnrollments] = await pool.query('SELECT course_id FROM enrollments WHERE email = ?', [userEmail]);

    const pastCourseIds = pastEnrollments.map(enrollment => enrollment.course_id);

    // Check if any of the selected courses are already enrolled
    for (const course of courses) {
      if (pastCourseIds.includes(course.course_id)) {
        return false;
      }
    }

    // Check for repetitive courses within the selected courses
    const selectedCourseIds = courses.map(course => course.course_id);
    if (new Set(selectedCourseIds).size !== selectedCourseIds.length) {
      return false;
    }

    // Check for total hours for OET and OEHM courses
    let totalOETHours = 0;
    let totalOEHMHours = 0;
    for (const course of courses) {
      if (course.type === 'OET') {
        totalOETHours += course.total_hours;
      } else if (course.type === 'OEHM') {
        totalOEHMHours += course.total_hours;
      }
    }

    // Validate total hours for OET courses
    if (totalOETHours < 30 || totalOETHours > 45) {
      return false;
    }

    // Validate total hours for OEHM courses
    if (totalOEHMHours < 30 || totalOEHMHours > 45) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating courses:', error);
    return false;
  }
}

// Function to fetch the current academic year
async function getCurrentAcademicYear() {
  // Fetch the current year
  const currentYear = new Date().getFullYear();

  // Calculate the academic year based on the current year and semester
  const academicYear = currentYear;
  return `${academicYear - 1}-${academicYear}`;
}

// Function to check if the user has successfully enrolled for courses in their respective semester
async function checkEnrollmentAndSetOnboarded(userEmail, currentSemester) {
  try {
    // Check if the user has enrolled for courses in their current semester
    const [enrollmentRows] = await pool.query('SELECT COUNT(*) AS count FROM enrollments WHERE email = ? AND enrolled_semester = ?', [userEmail, currentSemester]);
    const enrollmentCount = enrollmentRows[0].count;

    // If the user has enrolled for courses in their current semester, update onboarded status to 1
    if (enrollmentCount > 0) {
      await pool.query('UPDATE users SET onboarded = 1 WHERE email = ?', [userEmail]);
      console.log('User onboarded successfully');
    }
  } catch (error) {
    console.error('Error checking enrollment and setting onboarded status:', error);
  }
}

app.get(['/successful-onboarding', '/successful-onboarding.html'], isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/successful-onboarding.html'));
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

// Route to serve index.html
app.get(['/', '/index.html'], isAuthenticatedAndOnboarded, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));