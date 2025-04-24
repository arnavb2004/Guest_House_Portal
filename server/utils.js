import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER ,
    pass: process.env.EMAIL_PASS ,
  },
});

export const getDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2); // Add leading zero if needed
  const day = ("0" + date.getDate()).slice(-2); // Add leading zero if needed

  const formattedDate = `${day}/${month}/${year}`;
  return formattedDate;
};

export const getTime = (dateString) => {
  const date = new Date(dateString);

  // Extracting hours, minutes, and seconds
  const hours24 = date.getHours();
  const minutes = ("0" + date.getMinutes()).slice(-2); // Add leading zero if needed

  // Converting to 12-hour format
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = ("0" + (hours24 % 12) || 12).slice(-2);

  // Formatting time in 12-hour clock format
  const time = `${hours12}:${minutes} ${ampm}`;
  return time;
};


export async function sendVerificationEmail(to, subject, body) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, 
      to: to, // list of receivers
      subject: subject, // Subject line
      html: body, // plain text body
    });
    console.log("Message sent", info.messageId);
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

