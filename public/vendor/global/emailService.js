require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const fs = require("fs").promises;
const handlebars = require("handlebars");
const { promisify } = require("util");
const retry = promisify(require("async").retry);

// Validate environment variables
const requiredEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_USER",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Template caching
const templateCache = {};

// Compiles and caches Handlebars templates
const getCompiledTemplate = async (templatePath) => {
  if (!templateCache[templatePath]) {
    const template = await fs.readFile(templatePath, "utf-8");
    templateCache[templatePath] = handlebars.compile(template);
  }
  return templateCache[templatePath];
};

// Refreshes OAuth2 access token
const getNewAccessToken = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  try {
    const { token, refresh_token } = await oauth2Client.getAccessToken();
    console.log("Access Token:", token); // Log the access token
    console.log("Refresh Token:", refresh_token); // Log the refresh token
    return token;
  } catch (error) {
    console.error(
      "Error refreshing access token:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// Creates and returns a nodemailer transporter using OAuth2
const createTransporter = async () => {
  try {
    const accessToken = await getNewAccessToken();
    console.log("Generated Access Token:", accessToken);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    return transporter;
  } catch (error) {
    console.error(
      "Error creating transporter:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// Sends an email with retries in case of failure
const sendEmail = async (to, subject, htmlContent) => {
  const retryOptions = {
    times: 3,
    interval: (retryCount) => 1000 * Math.pow(2, retryCount),
  };

  try {
    await retry(retryOptions, async () => {
      const transporter = await createTransporter();
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: htmlContent,
      });
    });
  } catch (error) {
    console.error(
      "Failed to send email after retries:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// Sends a confirmation email to the user
const sendConfirmationEmail = async (
  userEmail,
  userName,
  courses,
  connection
) => {
  try {
    const coursesWithNames = await Promise.all(
      courses.map(async (course) => {
        let courseName, hours;
        if (course.mode === "ONLINE") {
          const [rows] = await connection.query(
            "SELECT course_name FROM courses_online WHERE course_id = ?",
            [course.course_id]
          );
          courseName = rows[0]?.course_name;
          hours = course.total_hours;
        } else {
          const [rows] = await connection.query(
            "SELECT course_name FROM courses_offline WHERE course_code = ?",
            [course.course_id]
          );
          courseName = rows[0]?.course_name;
          hours = "N/A";
        }
        return { ...course, course_name: courseName, total_hours: hours };
      })
    );

    const compiledTemplate = await getCompiledTemplate(
      "./public/vendor/global/enrolmentConfirmation.hbs"
    );
    const htmlContent = compiledTemplate({
      userName: userName,
      courses: coursesWithNames,
    });

    await sendEmail(
      userEmail,
      "Onboarding Successful | KJSCE OET-OEHM Portal",
      htmlContent
    );
  } catch (error) {
    console.error(
      "Error sending confirmation email:",
      error.response ? error.response.data : error.message
    );
  }
};

// Sends a submission confirmation email to the user
const sendSubmissionConfirmationEmail = async (
  userEmail,
  userName,
  courseDetails,
  submissionLink
) => {
  try {
    const compiledTemplate = await getCompiledTemplate(
      "./public/vendor/global/submissionConfirmation.hbs"
    );
    const htmlContent = compiledTemplate({
      userName: userName,
      courseName: courseDetails.course_name,
      courseType: courseDetails.type,
      semester: courseDetails.enrolled_semester,
      submissionLink: submissionLink,
    });

    await sendEmail(
      userEmail,
      "Submission Confirmation | KJSCE OET-OEHM Portal",
      htmlContent
    );
  } catch (error) {
    console.error(
      "Error sending submission confirmation email:",
      error.response ? error.response.data : error.message
    );
  }
};

module.exports = { sendConfirmationEmail, sendSubmissionConfirmationEmail };
