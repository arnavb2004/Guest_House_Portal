import OTP from "./../models/Otp.js";
import User from "../models/User.js";

import jwt from "jsonwebtoken";
import { jwtDecode } from "jwt-decode";

export const sendOtp = async (req, res) => {
  const generateOtp = () => {
    let otp = "";
    for (let i = 0; i < 6; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  };
  try {
    const otp = generateOtp();
    if (!req.body.email)
      return res.status(400).json({ error: "Email cannot be empty" });

    await OTP.deleteMany({ email: req.body.email });

    const otpBody = await OTP.create({ email: req.body.email, otp });
    
    // Even if the email fails to send (which we now handle gracefully in the OTP model),
    // we still return success because the OTP was created in the database
    res.status(200).json({
      message: "OTP sent successfully",
    });
    console.log(otpBody);
  } catch (err) {
    console.log("Error in sendOtp controller:", err.message);
    // Log more detailed error information
    if (err.code) console.log("Error code:", err.code);
    if (err.stack) console.log("Error stack:", err.stack);
    
    res.status(400).json({ 
      error: "Error creating OTP", 
      message: err.message 
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req?.body;

    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP cannot be empty" });
    const result = await OTP.findOne({ email, otp });

    if (result) {
      const user = await User.findOne({ email: email });
      res.status(200).json({
        success: true,
        user: user?.email,
        message: "OTP verified successfully",
      });
    } else {
      res.status(400).json({ success: false, message: "OTP entered is wrong" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

export const registerUser = async (req, res) => {
  try {
    const user = req.body;
    console.log("Registration request with data:", user);
    console.log("Department:", user.department);
    console.log("Designation:", user.designation);
    console.log("Employee Code:", user.ecode);
    
    const email = user?.email;
    const mobile = user?.contact;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: "Email cannot be empty" });
    }

    // Validate mobile number
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ 
        success: false, 
        message: "Mobile number must be exactly 10 digits" 
      });
    }

    // Check if user already exists
    const result = await User.findOne({ email: email });
    if (result) {
      return res.status(400).json({ 
        success: false, 
        message: "User already exists" 
      });
    }

    // Ensure department, designation, and ecode are saved even if empty strings
    const userData = {
      ...user,
      department: user.department || "",
      designation: user.designation || "",
      ecode: user.ecode || ""
    };

    const newUser = await User.create(userData);
    console.log("User saved to database:", {
      id: newUser._id,
      name: newUser.name,
      department: newUser.department,
      designation: newUser.designation,
      ecode: newUser.ecode
    });
    
    const refreshToken = jwt.sign({ email }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "180d",
    });
    const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "5m",
    });
    
    return res.status(200).json({
      success: true,
      accessToken,
      user: newUser,
      refreshToken,
      message: "User added successfully",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const googleLoginUser = async (req, res) => {
  try {
    const { credential } = req?.body;
    const cred = jwtDecode(credential);
    const email = cred?.email;
    console.log("Google login request for email:", email);
    
    if (email) {
      const user = await User.findOne({ email });
      console.log("User found in Google login:", {
        exists: !!user,
        id: user?._id,
        name: user?.name,
        department: user?.department,
        designation: user?.designation,
        ecode: user?.ecode
      });
      
      if (user) {
        const refreshToken = jwt.sign(
          { email },
          process.env.REFRESH_TOKEN_SECRET,
          {
            expiresIn: "180d",
          }
        );
        const accessToken = jwt.sign(
          { email },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "5m",
          }
        );
        user.refreshToken = refreshToken;
        await user.save();
        
        // Make sure all fields are included in the response
        const userData = {
          ...user.toObject(),
          department: user.department || "",
          designation: user.designation || "",
          ecode: user.ecode || ""
        };
        
        console.log("Sending Google user data to client:", {
          department: userData.department,
          designation: userData.designation,
          ecode: userData.ecode
        });
        
        res.status(200).json({
          success: true,
          user: userData,
          message: "User logged in successfully",
          hideMessage: true,
          accessToken,
          refreshToken,
        });
      } else {
        console.log("New Google user, redirecting to registration");
        res.status(200).json({
          success: false,
          email,
          message: "User does not exist",
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Wrong Credentials",
      });
    }
  } catch (err) {
    console.log(err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    console.log("Login request:", req.body);
    const { email, otp } = req?.body;

    if (!email || !otp)
      return res.status(400).json({
        success: false,
        message: "Email and OTP cannot be empty",
      });
    const result = await OTP.findOne({ email, otp });

    if (result) {
      const user = await User.findOne({ email: email });
      console.log("User found in login:", {
        id: user?._id,
        name: user?.name,
        department: user?.department,
        designation: user?.designation,
        ecode: user?.ecode
      });
      
      if (user) {
        const refreshToken = jwt.sign(
          { email },
          process.env.REFRESH_TOKEN_SECRET,
          {
            expiresIn: "180d",
          }
        );
        const accessToken = jwt.sign(
          { email },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "5m",
          }
        );
        user.refreshToken = refreshToken;
        await user.save();
        
        // Make sure all fields are included in the response
        const userData = {
          ...user.toObject(),
          department: user.department || "",
          designation: user.designation || "",
          ecode: user.ecode || ""
        };
        
        console.log("Sending user data to client:", {
          department: userData.department,
          designation: userData.designation,
          ecode: userData.ecode
        });
        
        res.status(200).json({
          success: true,
          user: userData,
          message: "User logged in successfully",
          accessToken,
          refreshToken,
        });
      } else {
        res.status(200).json({
          success: false,
          message: "User does not exist",
        });
      }
    } else {
      res.status(400).json({ success: false, message: "OTP entered is wrong" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, user) => {
        if (err) {
          res.status(400).json({ message: "Error while logging out" });
        } else {
          const email = user?.email;
          await User.findOneAndUpdate({ email }, { refreshToken: "" });

          res.status(200).json({ message: "Logged out successfully" });
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Error while logging out" });
  }
};
