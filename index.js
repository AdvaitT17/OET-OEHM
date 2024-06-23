require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mysql = require('mysql2/promise');
const path = require('path');
const { body, validationResult } = require('express-validator');
const cron = require('node-cron');

const app = express();
app.use(express.json());
const PORT = process.env.PORT;

const dbConfig = {
  host: process.env.DB_HOST_LOCAL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 60000, // 60 seconds
};

const pool = mysql.createPool({ ...dbConfig });

// Periodic database ping
const pingDatabase = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database pinged successfully');
  } catch (error) {
    console.error('Error pinging database:', error);
  }
};

// Schedule the pingDatabase function to run every minute
cron.schedule('* * * * *', pingDatabase);

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
  done(null, user.email);
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
    res.redirect('/login.html');
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
    pool.query('SELECT * FROM users WHERE email = ?', [userEmail])
      .then(([userRows]) => {
        const user = userRows[0];
        if (user && user.onboarded === 0) {
          res.redirect('/onboarding.html');
        } else if (user && user.onboarded === 1) {
          next();
        } else {
          res.redirect('/login.html');
        }
      })
      .catch(error => {
        console.error('Error checking user onboarding status:', error);
        res.redirect('/login.html');
      });
  } else {
    res.redirect('/login.html');
  }
};

// Route to serve onboarding.html
app.get('/onboarding.html', isAuthenticated, (req, res) => {
  const userEmail = req.user.email;
  pool.query('SELECT onboarded FROM users WHERE email = ?', [userEmail])
    .then(([userRows]) => {
      const user = userRows[0];
      if (user && user.onboarded === 0) {
        res.sendFile(path.join(__dirname, '/public/onboarding.html'));
      } else {
        res.redirect('/index.html');
      }
    })
    .catch(error => {
      console.error('Error checking user onboarding status:', error);
      res.redirect('/login.html');
    });
});

// User service or utility function
const getUserData = async (req, res) => {
  if (!req.user) {
    return null;
  }

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
  const currentYear = new Date().getFullYear();
  let academicYear = currentYear;

  if (newSemester % 2 === 0) {
    academicYear++;
  }

  const academicYearString = `${academicYear - 1}-${academicYear}`;

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
    if (field !== 'semester') {
      await pool.query(`UPDATE users SET ${field} = ? WHERE email = ?`, [value, userEmail]);
      return res.json({ success: true, message: `${field} updated successfully` });
    }

    const isValidValue = await isValidEnumValue('users', field, value);
    if (!isValidValue) {
      return res.status(400).json({ success: false, message: `Invalid value for ${field}` });
    }

    await pool.query(`UPDATE users SET ${field} = ? WHERE email = ?`, [value, userEmail]);
    
    updateAcademicYear(userEmail, value);

    res.json({ success: true, message: `${field} updated successfully` });
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    res.status(500).json({ success: false, message: `Failed to update ${field}` });
  }
});

async function isValidEnumValue(tableName, fieldName, value) {
  try {
    const query = `
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = ? AND COLUMN_NAME = ?;
    `;
    const [rows] = await pool.query(query, [tableName, fieldName]);

    if (!rows || rows.length === 0 || !rows[0].COLUMN_TYPE) {
      console.error('No COLUMN_TYPE found for the specified field.');
      return false;
    }

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
    const [rows] = await pool.query('SELECT * FROM courses_online;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching online courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to fetch offline course data from the database
app.get('/api/courses_offline', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses_offline;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching offline courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to check attendance verification
app.get('/checkAttendance', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const [rows] = await pool.query('SELECT attendance_verified FROM users WHERE email = ?', [userEmail]);
    const attendanceVerified = rows[0].attendance_verified === 1;
    res.json({ attendanceVerified });
  } catch (error) {
    console.error('Error checking attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to handle course enrollment
app.post('/api/enroll', isAuthenticated, async (req, res) => {
  console.log('Enrollment request received:', req.body);

  try {
    const userEmail = req.user.email;
    const courses = req.body.courses;

    const [userRows] = await pool.query('SELECT semester FROM users WHERE email = ?', [userEmail]);
    const userSemester = userRows[0].semester;

    const currentAcademicYear = await getCurrentAcademicYear();

    const isValid = await validateCourses(userEmail, courses);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Course validation failed' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const course of courses) {
        if (!course.course_id || !course.type) {
          throw new Error('Course ID or type is missing');
        }
        await connection.query('INSERT INTO enrollments (email, course_id, total_hours, mode, type, enrolled_academic_year, enrolled_semester) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [userEmail, course.course_id, course.total_hours, course.mode, course.type, currentAcademicYear, userSemester]);
      }

      await connection.commit();
      connection.release();

      await checkEnrollmentAndSetOnboarded(userEmail, userSemester);

      res.json({ success: true, message: 'Enrollment successful' });
    } catch (error) {
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

async function validateCourses(userEmail, courses) {
  try {
    const [pastEnrollments] = await pool.query('SELECT course_id FROM enrollments WHERE email = ?', [userEmail]);
    const pastCourseIds = pastEnrollments.map(enrollment => enrollment.course_id);

    for (const course of courses) {
      if (pastCourseIds.includes(course.course_id)) {
        return false;
      }
    }

    const selectedCourseIds = courses.map(course => course.course_id);
    if (new Set(selectedCourseIds).size !== selectedCourseIds.length) {
      return false;
    }

    let totalOETHours = 0;
    let totalOEHMHours = 0;
    for (const course of courses) {
      if (course.type === 'OET') {
        totalOETHours += course.total_hours;
      } else if (course.type === 'OEHM') {
        totalOEHMHours += course.total_hours;
      }
    }

    if (totalOETHours < 30 || totalOETHours > 45 || totalOEHMHours < 30 || totalOEHMHours > 45) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating courses:', error);
    return false;
  }
}

async function getCurrentAcademicYear() {
  const currentYear = new Date().getFullYear();
  return `${currentYear - 1}-${currentYear}`;
}

async function checkEnrollmentAndSetOnboarded(userEmail, currentSemester) {
  try {
    const [enrollmentRows] = await pool.query('SELECT COUNT(*) AS count FROM enrollments WHERE email = ? AND enrolled_semester = ?', [userEmail, currentSemester]);
    const enrollmentCount = enrollmentRows[0].count;

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