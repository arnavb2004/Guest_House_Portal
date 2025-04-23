import mongoose from "mongoose";
import { transporter } from "../utils.js";
import dotenv from "dotenv";
dotenv.config();

const { Schema } = mongoose;

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5, // The otp will expire after 5 minutes of its creation time
  },
});
// Define a function to send emails
async function sendVerificationEmail(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // Match the auth.user from utils.js
      to: email, // list of receivers
      subject: "OTP Verification", // Subject line
      html: `<p>Your otp for verification is ${otp}. It will expire in 5 minutes.</p>`, // plain text body
    });
    console.log("Message sent", info.messageId);
    return true;
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    // Log more details about the error
    if (error.code) console.log("Error code:", error.code);
    if (error.command) console.log("Error command:", error.command);
    if (error.response) console.log("Error response:", error.response);
    if (error.responseCode) console.log("Error response code:", error.responseCode);
    
    // We don't want to throw the error as it will fail the OTP creation
    // Instead, we'll return false to indicate failure
    return false;
  }
}

otpSchema.pre("save", async function (next) {
  console.log("New otp saved to database");
  // Only send an email when a new document is created
  if (this.isNew) {
    const emailSent = await sendVerificationEmail(this.email, this.otp);
    if (!emailSent) {
      console.log("Failed to send email but continuing with OTP creation");
    }
  }
  next();
});

export default mongoose.model("OTP", otpSchema);
