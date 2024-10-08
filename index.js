require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mysql = require("mysql2/promise");
const path = require("path");
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const {
  sendConfirmationEmail,
} = require("./public/vendor/global/emailService");
const {
  sendSubmissionConfirmationEmail,
} = require("./public/vendor/global/emailService");

const app = express();
app.use(express.json());

// enabling the Helmet middleware
app.use(helmet());
const PORT = process.env.PORT;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 5000, // 10 seconds
});

app.use(express.urlencoded({ extended: true }));
// Improved in-memory session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        styleSrcElem: [
          "'self'",
          "https://fonts.googleapis.com",
          "'unsafe-inline'",
        ],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

const reonboardingFlags = new Map();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // First, check if the user exists in the attendance table
        const [attendanceRows] = await pool.query(
          "SELECT * FROM attendance WHERE attendee_email = ?",
          [profile.emails[0].value]
        );
        const isAttendanceVerified = attendanceRows.length > 0;

        // Now, insert or update the user, including the attendance_verified flag
        const [rows] = await pool.query(
          `
      INSERT INTO users (email, name, profile_picture, attendance_verified)
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE name = ?, profile_picture = ?, attendance_verified = ?
    `,
          [
            profile.emails[0].value,
            profile.displayName,
            profile.photos[0].value,
            isAttendanceVerified ? 1 : 0,
            profile.displayName,
            profile.photos[0].value,
            isAttendanceVerified ? 1 : 0,
          ]
        );

        // Fetch the updated user data
        const [userRows] = await pool.query(
          "SELECT * FROM users WHERE email = ?",
          [profile.emails[0].value]
        );
        const user = userRows[0];

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = rows[0];
    done(null, user);
  } catch (error) {
    done(error);
  }
});

const forceRedirect = (req, res, next) => {
  res.redirect = function (url) {
    res.writeHead(302, { Location: url });
    res.end();
  };
  next();
};

app.use(forceRedirect);

// Custom middleware for authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
};

// checkUserStatus middleware
const checkUserStatus = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {
    const userEmail = req.user.email;

    // Check if re-onboarding is needed
    if (reonboardingFlags.get(userEmail)) {
      return res.redirect("/onboarding");
    }

    // Fetch user data
    const [userRows] = await pool.query(
      "SELECT semester FROM users WHERE email = ?",
      [userEmail]
    );
    const user = userRows[0];

    if (!user) {
      return res.redirect("/login");
    }

    // Check enrollments
    const [enrollmentRows] = await pool.query(
      `
      SELECT COUNT(*) as total_count, 
             SUM(CASE WHEN course_approved = 1 THEN 1 ELSE 0 END) as approved_count
      FROM enrollments 
      WHERE email = ? AND enrolled_semester = ?
    `,
      [userEmail, user.semester]
    );

    const { total_count, approved_count } = enrollmentRows[0];

    if (total_count === 0) {
      return res.redirect("/onboarding");
    }

    if (total_count > approved_count) {
      return res.redirect("/successful-onboarding");
    }

    next();
  } catch (error) {
    console.error("[checkUserStatus] Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// Webhook endpoint to trigger re-onboarding
app.post("/webhook/trigger-reonboarding", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { userEmail } = req.body;

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get the user's current semester
      const [userRows] = await connection.query(
        "SELECT semester FROM users WHERE email = ?",
        [userEmail]
      );

      if (userRows.length === 0) {
        throw new Error("User not found");
      }

      const currentSemester = userRows[0].semester;

      // Clear existing enrollments for the current semester only
      await connection.query(
        "DELETE FROM enrollments WHERE email = ? AND enrolled_semester = ?",
        [userEmail, currentSemester]
      );

      // Set the re-onboarding flag
      reonboardingFlags.set(userEmail, true);

      // Commit the transaction
      await connection.commit();

      res.json({
        success: true,
        message:
          "Re-onboarding triggered successfully and current semester enrollments cleared",
      });
    } catch (error) {
      // If there's an error, rollback the changes
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error in re-onboarding process:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Updated checkSuccessfulOnboarding middleware
const checkSuccessfulOnboarding = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {
    const [userRows] = await pool.query(
      "SELECT semester FROM users WHERE email = ?",
      [req.user.email]
    );
    const user = userRows[0];

    const [enrollmentRows] = await pool.query(
      `
      SELECT COUNT(*) as total_count, 
             SUM(CASE WHEN course_approved = 1 THEN 1 ELSE 0 END) as approved_count
      FROM enrollments 
      WHERE email = ? AND enrolled_semester = ?
    `,
      [req.user.email, user.semester]
    );

    const { total_count, approved_count } = enrollmentRows[0];

    if (total_count === 0) {
      return res.redirect("/onboarding");
    }

    if (parseInt(total_count) === parseInt(approved_count)) {
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.error("[checkSuccessfulOnboarding] Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// User service or utility function
const getUserData = async (req) => {
  if (!req.user) {
    return null;
  }

  const [userRows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    req.user.email,
  ]);
  const user = userRows[0];

  const sanitizedUser = {
    name: user.name,
    email: user.email,
    profile_picture: user.profile_picture,
    semester: user.semester,
  };

  return sanitizedUser;
};

// Route to fetch user data
app.get("/user", isAuthenticated, async (req, res) => {
  try {
    const userData = await getUserData(req);

    if (!userData) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ user: userData });
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to check the onboarding step
app.get("/checkOnboardingStep", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT onboarding_step FROM users WHERE email = ?",
      [req.user.email]
    );
    if (rows.length > 0) {
      res.json({ step: rows[0].onboarding_step });
    } else {
      res.json({ step: 1 });
    }
  } catch (error) {
    console.error("Error checking onboarding step:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update user data route with semester change handling
app.post(
  "/updateUserData",
  isAuthenticated,
  [
    body("roll_number").isString().notEmpty(),
    body("branch").isIn(["IT", "COMPS", "EXTC"]),
    body("semester").isIn(["V", "VI", "VII"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { roll_number, branch, semester } = req.body;
    const userEmail = req.user.email;

    try {
      const [currentUserData] = await pool.query(
        "SELECT semester FROM users WHERE email = ?",
        [userEmail]
      );
      const currentSemester = currentUserData[0].semester;

      await pool.query(
        "UPDATE users SET roll_number = ?, branch = ?, semester = ?, onboarding_step = 2 WHERE email = ?",
        [roll_number, branch, semester, userEmail]
      );

      if (currentSemester !== semester) {
        req.session.needsOnboarding = true;
      }

      res.json({
        success: true,
        message: "User data updated successfully",
        needsOnboarding: req.session.needsOnboarding,
      });
    } catch (error) {
      console.error("Error updating user data:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update user data" });
    }
  }
);

// Route to fetch online course data from the database
app.get("/api/courses", isAuthenticated, async (req, res) => {
  try {
    const [courses] = await pool.query(
      `
      SELECT c.*, 
             CASE WHEN e.course_id IS NOT NULL THEN TRUE ELSE FALSE END AS previously_taken
      FROM courses_online c
      LEFT JOIN enrollments e ON c.course_id = e.course_id 
                              AND e.email = ? 
                              AND e.enrolled_semester < ?
    `,
      [req.user.email, req.user.semester]
    );

    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch offline course data from the database
app.get("/api/courses_offline", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses_offline;");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching offline courses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to check attendance verification
app.get("/checkAttendance", isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const [rows] = await pool.query(
      "SELECT attendance_verified FROM users WHERE email = ?",
      [userEmail]
    );
    const attendanceVerified = rows[0].attendance_verified === 1;
    res.json({ attendanceVerified });
  } catch (error) {
    console.error("Error checking attendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/enrollments", isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const query = `
      SELECT 
        e.course_id,
        COALESCE(co.course_name, cf.course_name) AS course_name,
        e.type,
        e.mode,
        e.enrolled_semester,
        e.course_completed
      FROM 
        enrollments e
      LEFT JOIN 
        courses_online co ON e.course_id = co.course_id AND e.mode = 'Online'
      LEFT JOIN 
        courses_offline cf ON e.course_id = cf.course_code AND e.mode = 'Offline'
      WHERE 
        e.email = ?
      ORDER BY 
        e.enrolled_semester DESC, course_name ASC
    `;

    const [rows] = await pool.query(query, [userEmail]);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to handle course enrollment
app.post("/api/enroll", isAuthenticated, async (req, res) => {
  const { courses } = req.body;
  const userEmail = req.user.email;

  if (!Array.isArray(courses) || courses.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid courses data" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Fetch user data
    const [userRows] = await connection.query(
      "SELECT academic_year, semester, name FROM users WHERE email = ?",
      [userEmail]
    );
    const {
      academic_year: academicYear,
      semester: userSemester,
      name: userName,
    } = userRows[0];

    // Validate and process courses
    const onlineCourses = courses.filter((course) => course.mode === "ONLINE");
    const offlineOETCourses = courses.filter(
      (course) => course.mode === "OFFLINE" && course.type === "OET"
    );
    const offlineOEHMCourses = courses.filter(
      (course) => course.mode === "OFFLINE" && course.type === "OEHM"
    );

    const onlineOETCourses = onlineCourses.filter(
      (course) => course.type === "OET"
    );
    const onlineOEHMCourses = onlineCourses.filter(
      (course) => course.type === "OEHM"
    );

    // Validate online courses
    if (onlineCourses.length > 0) {
      const totalOETHours = onlineOETCourses.reduce(
        (sum, course) => sum + parseInt(course.total_hours || 0),
        0
      );
      const totalOEHMHours = onlineOEHMCourses.reduce(
        (sum, course) => sum + parseInt(course.total_hours || 0),
        0
      );

      if (
        onlineOETCourses.length > 0 &&
        (totalOETHours < 30 || totalOETHours > 45)
      ) {
        throw new Error(
          "Total hours for online OET courses must be between 30 and 45."
        );
      }

      if (
        userSemester !== "VII" &&
        onlineOEHMCourses.length > 0 &&
        (totalOEHMHours < 30 || totalOEHMHours > 45)
      ) {
        throw new Error(
          "Total hours for online OEHM courses must be between 30 and 45."
        );
      }

      if (
        onlineOETCourses.length > 5 ||
        (userSemester !== "VII" && onlineOEHMCourses.length > 5)
      ) {
        throw new Error(
          "You can select at most 5 online courses for each type."
        );
      }

      const allOnlineCourseIds = new Set(
        onlineCourses.map((course) => course.course_id)
      );
      if (allOnlineCourseIds.size !== onlineCourses.length) {
        throw new Error(
          "A course selected in OET cannot be selected again in OEHM."
        );
      }
    }

    // Validate offline courses
    if (offlineOETCourses.length > 0 || offlineOEHMCourses.length > 0) {
      const [availableOfflineOETRows] = await connection.query(
        "SELECT COUNT(*) as count FROM courses_offline WHERE course_type = 'OET' AND semester = ?",
        [userSemester]
      );
      const [availableOfflineOEHMRows] = await connection.query(
        "SELECT COUNT(*) as count FROM courses_offline WHERE course_type = 'OEHM' AND semester = ?",
        [userSemester]
      );

      if (
        offlineOETCourses.length > 0 &&
        offlineOETCourses.length !== availableOfflineOETRows[0].count
      ) {
        throw new Error(
          `Please select all available offline OET courses for semester ${userSemester} in order of preference.`
        );
      }

      if (
        userSemester !== "VII" &&
        offlineOEHMCourses.length > 0 &&
        offlineOEHMCourses.length !== availableOfflineOEHMRows[0].count
      ) {
        throw new Error(
          `Please select all available offline OEHM courses for semester ${userSemester} in order of preference.`
        );
      }
    }

    // Validate course combination
    if (userSemester === "VII") {
      if (onlineOETCourses.length === 0 && offlineOETCourses.length === 0) {
        throw new Error(
          "Please select at least one OET course (online or offline) for semester VII."
        );
      }
    } else {
      const hasOnlineOET = onlineOETCourses.length > 0;
      const hasOnlineOEHM = onlineOEHMCourses.length > 0;
      const hasOfflineOET = offlineOETCourses.length > 0;
      const hasOfflineOEHM = offlineOEHMCourses.length > 0;

      if (
        !(
          (hasOnlineOET && hasOnlineOEHM) ||
          (hasOfflineOET && hasOfflineOEHM) ||
          (hasOnlineOET && hasOfflineOEHM) ||
          (hasOfflineOET && hasOnlineOEHM)
        )
      ) {
        throw new Error(
          "Invalid combination of courses. Please select either:\n" +
            "1. Online OET and Online OEHM\n" +
            "2. Offline OET and Offline OEHM\n" +
            "3. Online OET and Offline OEHM\n" +
            "4. Offline OET and Online OEHM"
        );
      }
    }

    // Insert courses into the database
    for (const course of courses) {
      await connection.query(
        `INSERT INTO enrollments 
         (email, course_id, total_hours, mode, type, enrolled_semester, enrolled_academic_year, course_approved) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          userEmail,
          course.course_id,
          course.total_hours,
          course.mode,
          course.type,
          userSemester,
          academicYear,
        ]
      );
    }

    await connection.commit();

    // Send confirmation email asynchronously
    sendConfirmationEmail(userEmail, userName, courses, connection).catch(
      (error) => console.error("Error sending confirmation email:", error)
    );

    res.json({
      success: true,
      message:
        "Enrollment successful. A confirmation email will be sent shortly.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Enrollment failed",
      details: error.toString(),
    });
  } finally {
    connection.release();
  }
});

// Route to get completed courses count (remains the same)
app.get("/api/completed-courses", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM enrollments WHERE email = ? AND course_completed = 1",
      [req.user.email]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error("Error fetching completed courses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get enrolled courses count for current semester
app.get("/api/enrolled-courses", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM enrollments e JOIN users u ON e.email = u.email WHERE e.email = ? AND e.enrolled_semester = u.semester",
      [req.user.email]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get total learning hours
app.get("/api/total-learning-hours", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT SUM(e.total_hours) as total FROM enrollments e JOIN users u ON e.email = u.email WHERE e.email = ?",
      [req.user.email]
    );
    res.json({ total: rows[0].total || 0 });
  } catch (error) {
    console.error("Error fetching total learning hours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get progress for all the semesters (both online & offline courses)
app.get("/api/progress", isAuthenticated, async (req, res) => {
  try {
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) as total FROM enrollments e JOIN users u ON e.email = u.email WHERE e.email = ?",
      [req.user.email]
    );
    const [completedRows] = await pool.query(
      "SELECT COUNT(*) as completed FROM enrollments e JOIN users u ON e.email = u.email WHERE e.email = ? AND e.course_completed = 1",
      [req.user.email]
    );

    const total = totalRows[0].total;
    const completed = completedRows[0].completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      total: total,
      completed: completed,
      percentage: percentage,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/submissions", isAuthenticated, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT 
        e.course_id, 
        c.course_name, 
        e.type,
        e.enrolled_semester,
        e.course_completed,
        COALESCE(s.submission_link, 'Not submitted') as submission_link,
        COALESCE(s.submission_status, 'Not submitted') as submission_status
      FROM enrollments e
      JOIN courses_online c ON e.course_id = c.course_id
      LEFT JOIN submissions s ON e.email = s.email AND e.course_id = s.course_id
      WHERE e.email = ? 
        AND e.mode = 'ONLINE'
      ORDER BY e.enrolled_semester DESC, c.course_name
    `,
      [req.user.email]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.toString() });
  } finally {
    connection.release();
  }
});

app.post("/api/submit", isAuthenticated, async (req, res) => {
  const { courseId, submissionLink } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingSubmission] = await connection.query(
      "SELECT * FROM submissions WHERE email = ? AND course_id = ?",
      [req.user.email, courseId]
    );

    let message;
    if (existingSubmission.length > 0) {
      // Update existing submission
      await connection.query(
        `
        UPDATE submissions
        SET submission_link = ?, submission_status = 'Pending'
        WHERE email = ? AND course_id = ?
        `,
        [submissionLink, req.user.email, courseId]
      );
      message = "Submission updated successfully";
    } else {
      // Insert new submission
      await connection.query(
        `
        INSERT INTO submissions (email, course_id, submission_link, submission_status)
        VALUES (?, ?, ?, 'Pending')
        `,
        [req.user.email, courseId, submissionLink]
      );
      message = "Submission successful";
    }

    // Fetch course details
    const [courseDetails] = await connection.query(
      `
      SELECT c.course_name, e.type, e.enrolled_semester
      FROM courses_online c
      JOIN enrollments e ON c.course_id = e.course_id
      WHERE c.course_id = ? AND e.email = ?
      `,
      [courseId, req.user.email]
    );

    await connection.commit();

    // Send confirmation email asynchronously
    sendSubmissionConfirmationEmail(
      req.user.email,
      req.user.name,
      courseDetails[0],
      submissionLink
    ).catch((error) =>
      console.error("Error sending submission confirmation email:", error)
    );

    res.json({
      success: true,
      message: message + ". A confirmation email will be sent shortly.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error submitting:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      details: error.toString(),
    });
  } finally {
    connection.release();
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout((err) =>
    err ? res.send("Error logging out") : res.redirect("/login")
  );
});

// Google authentication routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  checkUserStatus,
  (req, res) => {
    res.redirect("/");
  }
);

// Route to serve login route
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});

app.get("/", checkUserStatus, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

app.get("/submissions", checkUserStatus, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/submissions.html"));
});

app.get("/profile", checkUserStatus, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/profile.html"));
});

app.get("/successful-onboarding", checkSuccessfulOnboarding, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/successful-onboarding.html"));
});

// Updated onboarding route
app.get("/onboarding", isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.user.email;

    if (reonboardingFlags.get(userEmail)) {
      return res.sendFile(path.join(__dirname, "/public/onboarding.html"));
    }

    // Check for existing enrollments
    const [enrollmentRows] = await pool.query(
      `
      SELECT COUNT(*) as count 
      FROM enrollments 
      WHERE email = ? AND enrolled_semester = ?
    `,
      [req.user.email, req.user.semester]
    );

    if (enrollmentRows[0].count === 0) {
      return res.sendFile(path.join(__dirname, "/public/onboarding.html"));
    }

    // Check for pending approvals
    const [approvalRows] = await pool.query(
      `
      SELECT COUNT(*) as total_count, 
             SUM(CASE WHEN course_approved = 1 THEN 1 ELSE 0 END) as approved_count
      FROM enrollments 
      WHERE email = ? AND enrolled_semester = ?
    `,
      [req.user.email, req.user.semester]
    );

    const { total_count, approved_count } = approvalRows[0];

    if (total_count > approved_count) {
      return res.redirect("/successful-onboarding");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Redirect .html to ./
app.get("/:page.html", (req, res, next) => {
  const page = req.params.page;
  res.redirect(`/${page}`);
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Route to handle 404 errors
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "/public/404.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);

  if (req.session) {
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destruction error:", sessionErr);
      }

      // Differentiating error handling for API vs. web clients
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      } else {
        res.redirect("/login");
      }
    });
  } else {
    // Handle cases with no session differently for API vs. web clients
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    } else {
      res.redirect("/login");
    }
  }
});

app.listen(PORT);
