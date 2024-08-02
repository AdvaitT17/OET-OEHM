require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const fs = require("fs").promises;
const handlebars = require("handlebars");
const path = require("path");

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });

  return transporter;
};

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = await createTransporter();
    const result = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: htmlContent,
    });
    return result;
  } catch (error) {
    throw error;
  }
};

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

    const template = await fs.readFile(
      "./public/vendor/global/enrolmentConfirmation.hbs",
      "utf-8"
    );
    const compiledTemplate = handlebars.compile(template);
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
    console.error("Error sending confirmation email:", error);
    // Don't throw the error, just log it
  }
};

const sendSubmissionConfirmationEmail = async (
  userEmail,
  userName,
  courseDetails,
  submissionLink
) => {
  try {
    const template = await fs.readFile(
      "./public/vendor/global/submissionConfirmation.hbs",
      "utf-8"
    );
    const compiledTemplate = handlebars.compile(template);
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
    console.error("Error sending submission confirmation email:", error);
    // Don't throw the error, just log it
  }
};

module.exports = { sendConfirmationEmail, sendSubmissionConfirmationEmail };
