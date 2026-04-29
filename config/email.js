const nodemailer = require('nodemailer');

let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
};

const verifyEmailTransporter = async () => {
  try {
    const transport = createTransporter();
    await transport.verify();
    console.log('✅ Email transporter verified');
    return true;
  } catch (error) {
    console.log('⚠️ Email transporter not configured:', error.message);
    return false;
  }
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transport = createTransporter();
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@tasselhairandbeauty.co.za',
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

module.exports = {
  createTransporter,
  verifyEmailTransporter,
  sendEmail,
  transporter: null // Will be lazily created
};