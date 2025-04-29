import Reservation from "../models/Reservation.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Meal from "../models/Meal.js";
import { getDate, getTime, transporter } from "../utils.js";
import archiver from "archiver";
import { getFileById } from "../middlewares/fileStore.js";
import mongoose from "mongoose";
import { google } from "googleapis";
import {
  appendReservationToSheet,
  appendReservationToSheetAfterCheckout,
} from "./google_sheet.js";
import { GridFSBucket } from "mongodb";
import pkg from "mongodb";
const { ObjectId } = pkg;
import dotenv from "dotenv";
dotenv.config();

const googleSheets = google.sheets("v4");
const auth = new google.auth.JWT(
  process.env.client_email,
  null,
  process.env.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const spreadsheetId = `${process.env.GOOGLE_SHEET_ID}`;

async function sendVerificationEmail(to, subject, body) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to.length > 0 ? to : process.env.EMAIL_USER, // list of receivers
      subject: subject, // Subject line
      html: body, // plain text body
    });
    console.log("Message sent", info.messageId);
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

export async function createReservation(req, res) {
  try {
    //user details are contained in req.user
    //console.dir(req, { depth: null, colors: true });
  
    // Check if required files and data are available before proceeding
    if (!req.files) {
      return res.status(400).json({ message: "No files were uploaded" });
    }

    const {
      numberOfGuests,
      numberOfRooms,
      roomType,
      purpose,
      guestName,
      guestGender,
      arrivalDate,
      arrivalTime,
      departureTime,
      address,
      category,
      departureDate,
      reviewers,
      subroles,
      applicant,
      source,
      sourceName,
      signature,
    } = req.body;

    // Validate required fields
    if (!guestName || !arrivalDate || !departureDate || !category) {
      return res.status(400).json({ message: "checking, Missing required fields" });
    }
  
    const ms = Number(
      new Date(departureDate).getTime() - new Date(arrivalDate).getTime()
    );
    //console.log(ms);
    const days = Number(ms / (1000 * 60 * 60 * 24));
    //console.log(days);

    // Calculate room cost using the helper function
    const room_cost = calculateRoomCost(category, roomType, numberOfRooms, days);
    
    let applicantData;
    if (typeof applicant === 'string') {
      try {
        applicantData = JSON.parse(applicant);
      } catch (err) {
        console.error("Error parsing applicant JSON:", err);
      }
    } else if (applicant && applicant[0]) {
      applicantData = applicant[0];
    }
    
    console.log("Applicant data:", typeof(applicantData), applicantData);

    // Parse signature JSON if it's a string
    let signatureData;
    if (typeof signature === 'string') {
      try {
        signatureData = JSON.parse(signature);
        console.log("Signature data parsed:", signatureData);
      } catch (err) {
        console.error("Error parsing signature JSON:", err);
      }
    } else {
      signatureData = signature;
    }

    const email = req.user.email;
    
    // Fix: Add proper null checks for receipt and files
    let receiptid = null;
    if (!req.files?.receipt?.[0]) return res.status(400).json({ message:"Receipt file is required" })	// checking purpose of this
    if (req.files && req.files["receipt"] && req.files["receipt"][0]) {
      receiptid = req.files["receipt"][0].id;
    } else {
      return res.status(400).json({ message: "Receipt file is required" });
    }
    
    let fileids = [];
    if (req.files && req.files["files"]) {
      fileids = req.files["files"].map((f) => ({
        refid: f.id,
        extension: f.originalname ? f.originalname.split(".").pop() : "",
      }));
    }
    
    // Check if reviewers and subroles are provided
    if (!reviewers) {
      return res.status(400).json({ message: "Reviewers are required" });
    }
    
    console.log("Reviewers:", reviewers);
    console.log("Subroles:", subroles);
    
    let subrolesArray = subroles ? subroles.split(",") : [];
    let reviewersArray = reviewers ? reviewers.split(",").map((role, index) => {
      console.log(`Processing reviewer: '${role}'`);
      return {
        role: role.trim(), // Make sure to trim any whitespace
        comments: "",
        status: "PENDING",
      };


    }) : [];
    
    console.log("Final reviewers array:", reviewersArray.map(r => r.role));
    
    // Validate category-specific approval requirements
    const catESAReviewers = ["DIRECTOR", "DEAN RESEARCH AND DEVELOPMENT", "DEAN STUDENT AFFAIRS", "DEAN FACULTY AFFAIRS AND ADMINISTRATION", "DEAN UNDER GRADUATE STUDIES", "DEAN POST GRADUATE STUDIES"];
    const catESBReviewers = ["CHAIRMAN"];
    const catBRAValidOptions = [
      ["DIRECTOR"], // Option 1: Director alone
      ["REGISTRAR"], // Option 2: Registrar alone
      // Option 3: Any Dean + Any Associate Dean (validated in the validation logic)
    ];
    const catBRB1PrimaryOptions = ["DEAN RESEARCH AND DEVELOPMENT", "DEAN STUDENT AFFAIRS", "DEAN FACULTY AFFAIRS AND ADMINISTRATION", "DEAN UNDER GRADUATE STUDIES", "DEAN POST GRADUATE STUDIES"];
    const catBRB1SecondaryOptions = ["REGISTRAR", "ASSOCIATE DEAN HOSTEL MANAGEMENT", "ASSOCIATE DEAN INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS", "ASSOCIATE DEAN CONTINUING EDUCATION AND OUTREACH ACTIVITIES", "ASSOCIATE DEAN INFRASTRUCTURE", "HOD COMPUTER SCIENCE", "HOD ELECTRICAL ENGINEERING", "HOD MECHANICAL ENGINEERING", "HOD CHEMISTRY", "HOD MATHEMATICS", "HOD PHYSICS", "HOD HUMANITIES AND SOCIAL SCIENCES", "HOD BIOMEDICAL ENGINEERING", "HOD CHEMICAL ENGINEERING", "HOD METALLURGICAL AND MATERIALS ENGINEERING", "HOD CIVIL ENGINEERING"];
    const catBRB2Reviewers = ["CHAIRMAN"];
    
    // Validate reviewers based on category if user is not admin
    if (req.user.role !== "ADMIN") {
      // This validation would typically be done on the frontend, but it's good to have backend validation too
      let validationPassed = true;
      let validationMessage = "";
      
      const reviewerRoles = reviewersArray.map(r => r.role);
      
      switch(category) {
        case "ES-A":
          // ES-A: Director or any Dean
          if (reviewerRoles.length !== 1 || !catESAReviewers.includes(reviewerRoles[0])) {
            validationPassed = false;
            validationMessage = "For ES-A category, only Director or a Dean can be approving authority";
          }
          break;
          
        case "ES-B":
          // ES-B: Chairman only
          if (reviewerRoles.length !== 1 || reviewerRoles[0] !== "CHAIRMAN") {
            validationPassed = false;
            validationMessage = "For ES-B category, only Chairman can be approving authority";
          }
          break;
          
        case "BR-A":
          // BR-A: Either (1) Director alone OR (2) Registrar alone OR (3) Dean + Associate Dean
          if (reviewerRoles.length === 1) {
            // Case 1 & 2: Director alone or Registrar alone is valid
            if (reviewerRoles[0] !== "DIRECTOR" && reviewerRoles[0] !== "REGISTRAR" && !reviewerRoles[0].startsWith("DEAN ")) {
              validationPassed = false;
              validationMessage = "For BR-A single authority, must be Director, Registrar, or a Dean";
            }
          } else if (reviewerRoles.length === 2) {
            // Case 3: Primary (Dean) + Secondary (Associate Dean)
            const primaryIsDean = reviewerRoles[0].startsWith("DEAN ");
            const secondaryIsAssociateDean = reviewerRoles[1].startsWith("ASSOCIATE DEAN ");
            
            if (!primaryIsDean || !secondaryIsAssociateDean) {
              // Also check the other way around - sometimes order might vary
              const altPrimaryIsAssociateDean = reviewerRoles[0].startsWith("ASSOCIATE DEAN ");
              const altSecondaryIsDean = reviewerRoles[1].startsWith("DEAN ");
              
              if (!(altPrimaryIsAssociateDean && altSecondaryIsDean)) {
                validationPassed = false;
                validationMessage = "For BR-A with two authorities, must be a Dean and an Associate Dean";
              }
            }
          } else {
            validationPassed = false;
            validationMessage = "For BR-A, select either Director alone, Registrar alone, or a Dean with an Associate Dean";
          }
          break;
          
        case "BR-B1":
          // BR-B1: Dean + (Associate Dean, HOD, or Registrar)
          if (reviewerRoles.length !== 2) {
            validationPassed = false;
            validationMessage = "BR-B1 requires two approving authorities";
          } else {
            const hasDean = reviewerRoles[0].startsWith("DEAN ") && !reviewerRoles[0].startsWith("ASSOCIATE");
            if (!hasDean) {
              validationPassed = false;
              validationMessage = "For BR-B1, primary must be a Dean";
            }
            
            const validSecondary = reviewerRoles[1].startsWith("ASSOCIATE DEAN ") || 
                                reviewerRoles[1].startsWith("HOD ") || 
                                reviewerRoles[1] === "REGISTRAR";
            if (!validSecondary) {
              validationPassed = false;
              validationMessage = "For BR-B1, secondary must be Associate Dean, HOD, or Registrar";
            }
          }
          break;
          
        case "BR-B2":
          // BR-B2: Chairman only
          if (reviewerRoles.length !== 1 || reviewerRoles[0] !== "CHAIRMAN") {
            validationPassed = false;
            validationMessage = "For BR-B2 category, only Chairman can be approving authority";
          }
          break;
      }
      
      if (!validationPassed) {
        return res.status(400).json({ message: validationMessage });
      }
    }
    
    // Always add ADMIN as a reviewer for all reservations
    if (req.user.role !== "ADMIN") {
      reviewersArray.unshift({ role: "ADMIN", comments: "", status: "PENDING" });
    }
    
    if (req.user.role === "ADMIN") {
      // First, add ADMIN as a reviewer
      if(guestName === "") guestName = "ADMIN";
      reviewersArray = [{ role: "ADMIN", comments: "", status: "PENDING" }];
      
      // Preserve the user-selected reviewers if admin is creating the reservation
      if (reviewers) {
        const userSelectedReviewers = reviewers.split(",").map((role, index) => ({
          role:
            role +
            (subrolesArray[index] && subrolesArray[index] !== "Select" ? " " + subrolesArray[index] : ""),
          comments: "",
          status: "PENDING",
        }));
        
        // Add all user-selected reviewers
        reviewersArray.push(...userSelectedReviewers);
      }
    }
   
    const reservation = await Reservation.create({
      srno: 1,
      guestEmail: email,
      byAdmin: req.user.role === "ADMIN",
      guestName,
      guestGender,
      address,
      purpose,
      numberOfGuests,
      numberOfRooms,
      roomType,
      arrivalDate: new Date(`${arrivalDate}T${arrivalTime || "13:00"}`),
      arrivalTime,
      departureDate: new Date(`${departureDate}T${departureTime || "11:00"}`),
      departureTime,
      category,
      stepsCompleted: 1,
      files: fileids,
      payment: { source: source, sourceName: sourceName || "", amount: room_cost, paymentId: "" },
      applicant: applicantData,
      reviewers: reviewersArray,
      receipt: receiptid,
      signature: signatureData,
    });

    let revArray = reviewersArray.map((reviewer) => reviewer.role);

    const emails = [email];
    for(let i = 0; i < reviewersArray.length; i++){
      const user = await User.findOne({ role: reviewersArray[i].role });
      if(user) emails.push(user.email);
    }
    
    sendVerificationEmail(
      emails,
      "New Reservation Request",
      "<div>A new reservation request has been made.</div><br><br><div>Guest Name: " +
        guestName +
        "</div><br><div>Guest Email: " +
        email +
        "</div><br><div>Number of Guests: " +
        numberOfGuests +
        "</div><br><div>Number of Rooms: " +
        numberOfRooms +
        "</div><br><div>Room Type: " +
        roomType +
        "</div><br><div>Purpose: " +
        purpose +
        "</div><br><div>Arrival Date: " +
        getDate(arrivalDate) +
        "</div><br><div>Arrival Time: " +
        arrivalTime +
        "</div><br><div>Departure Date: " +
        getDate(departureDate) +
        "</div><br><div>Departure Time: " +
        departureTime +
        "</div><br><div>Address: " +
        address +
        "</div><br><div>Category: " +
        category +
        "</div>"
    );
    
    res.status(200).json({
      message:
        "Reservation Request added successfully. Please wait for approval from the admin.",
    });
    
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: error.message });
  }
}

export const updateRoomBookings = async (req, res) => {
  try {
    const { id } = req.params; // Reservation ID
    const { user, startDate, endDate, roomNumber, _id } = req.body; // Updated data
    const resid = id;
    // Find the Reservation by ID
    let reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    // console.log("Reservation ", reservation);
    // Find the Room by roomNumber
    let room = await Room.findOne({ roomNumber });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    // console.log("Room " , room);
    // Find the Booking in the Room's bookings array
    // console.log("resid", resid);
    let roomBooking = room.bookings.find((b) => b.resid.toString() == resid);
    // let roomBooking = room.bookings.find((b) => console.log("id : ", b._id.toString()));

    if (!roomBooking) {
      return res.status(404).json({ message: "Room booking not found" });
    }

    // Update Room's booking details
    roomBooking.user = user;
    roomBooking.startDate = new Date(startDate);
    roomBooking.endDate = new Date(endDate);

    // Find the Booking in the Reservation's bookings array
    let reservationBooking = reservation.bookings.find((b) => b.roomNumber === roomNumber);
    if (!reservationBooking) {
      return res.status(404).json({ message: "Booking not found in reservation" });
    }

    // Update Reservation's booking details
    reservationBooking.user = user;
    reservationBooking.startDate = new Date(startDate);
    reservationBooking.endDate = new Date(endDate);

    // Save both Room and Reservation
    await room.save();
    await reservation.save();

    res.status(200).json({
      message: "Room booking updated successfully",
      updatedRoomBooking: roomBooking,
      updatedReservationBooking: reservationBooking,
    });

  } catch (error) {
    console.error("Error updating room booking:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export async function withdrawApplication(req, res) {
  console.log("Withdraw request received for ID:", req.params.id);
  try {
    const { id } = req.params; // Extract reservation ID from the request URL
    let reservation = await Reservation.findById(req.params.id);
    let user = await User.findOne({ email: reservation.guestEmail });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Ensure only the guest or an admin can withdraw
    if (req.user.email !== reservation.guestEmail && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized to withdraw this application" });
    }

    // Prevent withdrawal if the user has an active booking
    if (reservation.bookings.length > 0) {
      return res.status(400).json({ message: "Cannot withdraw, room already booked" });
    }
    user.pendingRequest -= 1;
    await user.save();
    // Delete the reservation
    // if (req.user?.email) {
      const email = reservation.guestEmail;
      sendVerificationEmail(
        [email], // Sending only to the user who made the update
        "Reservation withdrawn Request",
        `<div>Your reservation has been withdrawn.</div><br><br>
        <div>Guest Name: ${reservation.guestName}</div>
        <div>Guest Email: ${reservation.guestEmail}</div>
        <div>Number of Guests: ${reservation.numberOfGuests}</div>
        <div>Number of Rooms: ${reservation.numberOfRooms}</div>
        <div>Room Type: ${reservation.roomType}</div>
        <div>Purpose: ${reservation.purpose}</div>
        <div>Category: ${reservation.category}</div>`
      );
    // }
    await Reservation.findByIdAndDelete(id);
    res.status(200).json({ message: "Application withdrawn successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to withdraw application", error: error.message });
  }
};



export async function getAllReservationDetails(req, res) {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this application" });
    }
    console.log("Getting all reservations...");
    const reservations = await Reservation.find();
    res.status(200).json({ reservations });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function updateReservation(req, res) {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "CASHIER") {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (
      reservation.payment.status === "PAID" &&
      reservation.status === "APPROVED"
    ) {
      reservation.stepsCompleted = 4;
    }

    await reservation.save();
    res.status(200).json({ message: "Reservation Updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
export async function assignReservation(req, res) {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    const reservation = await Reservation.findById(req.params.id);
    reservation.reviewers = req.body.reviewers.map((r) => ({
      role: r,
      status: "PENDING",
      comments: "",
    }));
    await reservation.save();
    res.status(200).json({ message: "Reservation Approved" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function getReservationDetails(req, res) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (
      req.user.email != reservation.guestEmail &&
      req.user.role !== "ADMIN" &&
      req.user.role !== "CASHIER" &&
      !reservation.reviewers.find((r) => r.role === req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this application" });
    }
    res.status(200).json({ reservation });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function getReservationDocuments(req, res) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (
      req.user.email !== reservation.guestEmail &&
      req.user.role !== "ADMIN" &&
      !reservation.reviewers.find((r) => r.role === req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this application" });
    }
    const archive = archiver("zip");
    res.attachment("files.zip");
    archive.pipe(res);
    for (const fileId of reservation.files) {
      const downloadStream = await getFileById(fileId.refid);
      archive.append(downloadStream, {
        name: `${req.user.email}_${fileId.refid}.${fileId.extension}`,
      });
    }
    const receiptStream = await getFileById(reservation.receipt);
    archive.append(receiptStream, { name: `Receipt_${reservation._id}.pdf` });
    archive.finalize();
    res.on("finish", () => {
      console.log("Download finished");
    });
    // res.status(200).json({ message: "Downloaded successfully" })
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteReservations(req, res) {
  const { ids } = req.body;
  ids = ids.filter((id) => id !== "#" && id !== "");
  try {
    const reservations = await Reservation.find({ _id: { $in: ids } });
    for (const reservation of reservations) {
      if (
        req.user.email !== reservation.guestEmail &&
        req.user.role !== "ADMIN"
      ) {
        return res.status(403).json({
          message: "You are not authorized to delete this reservation",
        });
      }
    }
    await Reservation.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: "Reservations Deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function approveReservation(req, res) {
  try {
    let reservation = await Reservation.findById(req.params.id);
    if (
      req.user.role !== "ADMIN" &&
      !reservation.reviewers.some((r) => r.role.includes(req.user.role))
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    
    let found = false;
    let wasRejectedByChairman = false;
    
    // Check if this is a chairman reverting a rejection
    if (req.user.role === "CHAIRMAN") {
      const chairmanReviewer = reservation.reviewers.find(r => r.role === "CHAIRMAN");
      if (chairmanReviewer && chairmanReviewer.status === "REJECTED") {
        wasRejectedByChairman = true;
      }
    }
    
    reservation.reviewers = reservation.reviewers.map((reviewer) => {
      if (reviewer.role.includes(req.user.role)) {
        found = true;
        reviewer.status = "APPROVED";
        if (req.body.comments) reviewer.comments = req.body.comments;
      }
      return reviewer;
    });

    if (!found && req.user.role === "ADMIN") {
      reservation.reviewers.push({
        role: req.user.role,
        status: "APPROVED",
        comments: req.body.comments || "",
      });
    }
    
    // If chairman is reverting a rejection, we need to make sure admin sees this
    if (wasRejectedByChairman && req.user.role === "CHAIRMAN") {
      // Find if admin is already a reviewer
      const adminReviewer = reservation.reviewers.find(r => r.role === "ADMIN");
      
      if (adminReviewer) {
        // Reset admin status to PENDING so they can review again
        adminReviewer.status = "PENDING";
        adminReviewer.comments = "Reverted by Chairman, needs review again: " + (req.body.comments || "");
      } else {
        // Add admin as a pending reviewer if not already there
        reservation.reviewers.push({
          role: "ADMIN",
          status: "PENDING",
          comments: "Added by Chairman after reverting rejection: " + (req.body.comments || ""),
        });
      }
    }
    
    let initStatus = reservation.status;
    reservation = await updateReservationStatus(reservation);
    console.log(reservation);
    //add the message to the user model of who made the reservation
    if (initStatus !== reservation.status) {
      console.log(reservation.guestEmail);
      const resUser = await User.findOne({ email: reservation.guestEmail });
      console.log(resUser);
      if (resUser.notifications == null) {
        // console.log()
        resUser.notifications = [];
      }
      // console.log(resUser.notifications)
      resUser.notifications.push({
        message: `Reservation Status changed to ${reservation.status} - ${
          req.body.comments || "No comments"
        }`,
        sender: req.user.role,
        res_id: reservation._id,
      });
      await resUser.save();
    }
    const body =
      "<div>Your reservation has been approved</div><br><div>Comments: " +
      req.body.comments +
      "</div>";
    sendVerificationEmail(
      reservation.guestEmail,
      "Reservation status updated",
      body
    );
    await reservation.save();
    res.status(200).json({ message: "Reservation Approved" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function rejectReservation(req, res) {
  try {
    let reservation = await Reservation.findById(req.params.id);
    if (
      req.user.role !== "ADMIN" &&
      !reservation.reviewers.some((r) => r.role.includes(req.user.role))
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    let found = false;
    reservation.reviewers = reservation.reviewers.map((reviewer) => {
      if (reviewer.role.includes(req.user.role)) {
        found = true;
        reviewer.status = "REJECTED";
        reviewer.comments = `Rejection Reason: ${req.body.reason || "No reason provided"}`;
      }
      return reviewer;
    });

    if (!found && req.user.role === "ADMIN") {
      reservation.reviewers.push({
        role: req.user.role,
        status: "REJECTED",
        comments: `Rejection Reason: ${req.body.reason || "No reason provided"}`,
      });
    }
    let initStatus = reservation.status;
    reservation = await updateReservationStatus(reservation);
    if (initStatus !== reservation.status) {
      const resUser = await User.findOne({ email: reservation.guestEmail });
      if (resUser.notifications == null) {
        resUser.notifications = [];
      }
      resUser.notifications.push({
        message: `Reservation Status changed to ${reservation.status} - Reason: ${req.body.reason || "No reason provided"}`,
        sender: req.user.role,
        res_id: reservation._id,
      });
      await resUser.save();
    }

    await reservation.save();
    res.status(200).json({ message: "Reservation Rejected" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function holdReservation(req, res) {
  try {
    let reservation = await Reservation.findById(req.params.id);
    if (
      req.user.role !== "ADMIN" &&
      !reservation.reviewers.some((r) => r.role.includes(req.user.role))
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    reservation.reviewers = reservation.reviewers.map((reviewer) => {
      if (reviewer.role.includes(req.user.role)) {
        reviewer.status = "HOLD";
        if (req.body.comments) reviewer.comments = req.body.comments;
      }
      return reviewer;
    });
    let initStatus = reservation.status;
    reservation = await updateReservationStatus(reservation);

    if (initStatus !== reservation.status) {
      const resUser = await User.findOne({ email: reservation.guestEmail });
      if (resUser.notifications == null) {
        // console.log()
        resUser.notifications = [];
      }
      resUser.notifications.push({
        message: `Reservation Status changed to ${reservation.status} - ${
          req.body.comments || "No comments"
        }`,
        sender: req.user.role,
        res_id: reservation._id,
      });
      await resUser.save();
    }

    // const body =
    //   "<div>Your reservation has been put on hold.</div><br><div>Comments: " +
    //   req.body.comments +
    //   "</div>";
    // sendVerificationEmail(
    //   reservation.guestEmail,
    //   "Reservation status updated",
    //   body
    // );

    await reservation.save();
    res.status(200).json({ message: "Reservation on hold" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export const getPendingReservations = async (req, res) => {
  console.log(req.user.role);
  console.log(req.user.email);
  console.log("Getting pending reservations...");
  try {
    if (req.user.role === "USER") {
      const reservations = await Reservation.find({
        guestEmail: req.user.email,
        status: "PENDING",
      }).sort({
        createdAt: -1,
      });
      return res.status(200).json(reservations);
    } else if (req.user.role !== "ADMIN") {
      // For non-ADMIN roles (like Chairman, Dean, etc.), show all reservations where they are a reviewer
      // and their specific review is still pending
      console.log("Getting reservations for non-ADMIN role...",req.user.role,req.user.email);
      const reservations = await Reservation.find({}).sort({ createdAt: -1 });
      const filteredReservations = reservations.filter(res => {
        return res.reviewers.some(reviewer => 
          reviewer.role.includes(req.user.role) && reviewer.status === "PENDING"
        );
      });
      res.status(200).json(filteredReservations);
    } else {
      // For ADMIN, show all PENDING reservations where admin's review is still pending
      const reservations = await Reservation.find({ 
        reviewers: {
          $elemMatch: {
            role: "ADMIN",
            status: "PENDING"
          }
        }
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getApprovedReservations = async (req, res) => {
  console.log("Getting approved reservations...");
  try {
    if (req.user.role === "USER") {
      const reservations = await Reservation.find({
        guestEmail: req.user.email,
        status: "APPROVED",
      }).sort({
        createdAt: -1,
      });
      return res.status(200).json(reservations);
    } else if (req.user.role === "ADMIN") {
      // For ADMIN show reservations where ADMIN has approved (regardless of overall status)
      const reservations = await Reservation.find({
        reviewers: {
          $elemMatch: {
            role: "ADMIN",
            status: "APPROVED"
          }
        }
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    } else {
      // For non-ADMIN roles show reservations where their role has approved (regardless of overall status)
      const reservations = await Reservation.find({}).sort({ createdAt: -1 });
      const filteredReservations = reservations.filter(res => {
        return res.reviewers.some(reviewer => 
          reviewer.role.includes(req.user.role) && reviewer.status === "APPROVED"
        );
      });
      res.status(200).json(filteredReservations);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getRejectedReservations = async (req, res) => {
  try {
    if (req.user.role === "USER") {
      const reservations = await Reservation.find({
        guestEmail: req.user.email,
        status: "REJECTED",
      }).sort({
        createdAt: -1,
      });
      console.log(reservations);
      return res.status(200).json(reservations);
    } else if (req.user.role === "ADMIN") {
      const reservations = await Reservation.find({
        reviewers: {
          $elemMatch: {
            role: "ADMIN",
            status: "REJECTED"
          }
        }
      }).sort({
        createdAt: -1,
      });
      console.log(reservations);
      res.status(200).json(reservations);
    } else {
      const reservations = await Reservation.find({}).sort({ createdAt: -1 });
      const filteredReservations = reservations.filter(res => {
        return res.reviewers.some(reviewer => 
          reviewer.role.includes(req.user.role) && reviewer.status === "REJECTED"
        );
      });
      res.status(200).json(filteredReservations);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const updatePaymentStatus = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    reservation.payment.status = req.body.status;
    reservation.payment.amount = req.body.amount;
    reservation.payment.payment_method = req.body.payment_method;
    reservation.payment.transaction_id = req.body.transaction_id;
    console.log(reservation);
    console.log("Updated the payment status");
    await reservation.save();
    res.status(200).json({ message: "Payment status updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



const updateReservationStatus = async (reservation) => {
  let initStatus = reservation.status;
  const userEmail = reservation.guestEmail;

  // Determine overall status: reject if any reviewer rejects, approve only if all approve, otherwise pending
  if (reservation.reviewers.some((r) => r.status === "REJECTED")) {
    reservation.status = "REJECTED";
  } else if (reservation.reviewers.every((r) => r.status === "APPROVED")) {
    reservation.status = "APPROVED";
  } else {
    reservation.status = "PENDING";
  }
  // Update stepsCompleted as count of approvals
  const adminReviewer = reservation.reviewers.find(r => r.role === "ADMIN");
if (adminReviewer && adminReviewer.status === "APPROVED") {
  reservation.stepsCompleted = 2;
} else {
  reservation.stepsCompleted = 1;
}

  
  if (initStatus !== reservation.status) {
    try {
      const user = await User.findOne({ email: userEmail });
      if (user) {
        if (
          reservation.status === "APPROVED" ||
          reservation.status === "REJECTED"
        ) {
          user.pendingRequest = user.pendingRequest - 1;
        } else {
          user.pendingRequest = user.pendingRequest + 1;
        }

        // Save the updated user document
        await user.save();
      } else {
        console.log("User not found");
      }
    } catch (err) {
      console.log("Error updating user:", err);
    }
  }
  return reservation;
};



export const getRooms = async (req, res) => {
  // Allow access to all authority roles (ADMIN, CHAIRMAN, DEAN, HOD, REGISTRAR, DIRECTOR)
  const authorizedRoles = ["ADMIN", "CHAIRMAN", "DEAN", "HOD", "REGISTRAR", "DIRECTOR", "ASSOCIATE_DEAN"];
  
  if (!req.user || !authorizedRoles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    console.log("Rooms", rooms);
    res.status(200).json(rooms);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};



export const sendReminder = async (req, res) => {
  const id = req.body.reservationId;
  try{
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }
  // console.log(reservation);
  const email = reservation.guestEmail;
  sendVerificationEmail(
    [email], 
    "Payment Reminder",
    `<div>This is a reminder for payment of your reservation.</div><br><br>
    <div>Guest Name: ${reservation.guestName}</div>
        <div>Guest Email: ${email}</div>
        <div>Number of Guests: ${reservation.numberOfGuests}</div>
        <div>Number of Rooms: ${reservation.numberOfRooms}</div>
        <div>Room Type: ${reservation.roomType}</div>
        <div>Purpose: ${reservation.purpose}</div>
        <div>Arrival Date: ${new Date(reservation.arrivalDate).toISOString().split("T")[0]}</div>
        <div>Departure Date: ${new Date(reservation.departureDate).toISOString().split("T")[0]}</div>
        <div>Address: ${reservation.address}</div>
        <div>Category: ${reservation.category}</div>
        <div>Payment Amount: ${reservation.payment.amount}</div>`
  );
  res.status(200).json({ message: "Reminder sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send reminder", error: error.message });
  }
};



export const sendReminderAll = async (req, res) => {
  const paymentdetails = req.body.pendingPaymentsDetails;
  try{
  for(const i in paymentdetails) {
    const reservation = await Reservation.findById(paymentdetails[i].reservationId);

  // const reservation = await Reservation.findById(id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }
  // console.log(reservation);
  const email = reservation.guestEmail;
  sendVerificationEmail(
    [email], 
    "Payment Reminder",
    `<div>This is a reminder for payment of your reservation.</div><br><br>
    <div>Guest Name: ${reservation.guestName}</div>
        <div>Guest Email: ${email}</div>
        <div>Number of Guests: ${reservation.numberOfGuests}</div>
        <div>Number of Rooms: ${reservation.numberOfRooms}</div>
        <div>Room Type: ${reservation.roomType}</div>
        <div>Purpose: ${reservation.purpose}</div>
        <div>Arrival Date: ${new Date(reservation.arrivalDate).toISOString().split("T")[0]}</div>
        <div>Departure Date: ${new Date(reservation.departureDate).toISOString().split("T")[0]}</div>
        <div>Address: ${reservation.address}</div>
        <div>Category: ${reservation.category}</div>
        <div>Payment Amount: ${reservation.payment.amount}</div>`
  );
}
  res.status(200).json({ message: "Reminder sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send reminder", error: error.message });
  }
};



export const removeFromList = async (req, res) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Unauthorized action" });
  }

  const { id } = req.params; // Reservation ID
  const { roomNumber } = req.body; // Room to remove

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the reservation
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Find the room and remove its booking
    const room = await Room.findOne({ roomNumber });
    if (!room) {
      throw new Error(`Room with number ${roomNumber} not found`);
    }
    //console.log("room bookings", room.bookings);
    // Remove the booking from the room
    //console.log(reservation._id);
    // console.log(booking.roomNumber._id);
    room.bookings = room.bookings.filter((booking) => booking.resid !== reservation._id.toString() );
    await room.save();
    //console.log("updated room bookings", room.bookings);
    // Remove the room from the reservation
    
    reservation.bookings = reservation.bookings.filter((booking) => booking.roomNumber !== roomNumber);
    await reservation.save();

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: `Room ${roomNumber} unassigned successfully` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message || "Failed to remove room" });
  }
};




export const monthlyReport = async (req, res) => {
  try {
    const { month } = req.params; // Extract month from URL (YYYY-MM)
    if (!month) {
      return res.status(400).json({ message: "Month is required in format YYYY-MM" });
    }

    // Define start and end dates for the month
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(`${month}-31T23:59:59.999Z`);

    // Fetch reservations where at least one booking falls in the month
    const reservations = await Reservation.find({
      "bookings.startDate": { $gte: startDate, $lt: endDate },
    });

    // console.log("Reservations", reservations);
    
    // Initialize report summary
    let totalBookings = 0;
    let totalRevenue = 0;
    let totalCheckedOut = 0;
    let totalPendingPayments = 0;
    let totalPendingPaymentsDetails = [];
    let categoryData = {};

 // Stores data by category

    reservations.forEach((reservation) => {
      // reservation.bookings.forEach((booking) => {
        if (reservation.arrivalDate >= startDate && reservation.departureDate <= endDate) {
          totalBookings++;

          let category = reservation.category || "Uncategorized"; // Ensure category exists
          if (!categoryData[category]) {
            categoryData[category] = { 
              revenue: 0, 
              pendingPayments: 0, 
              totalBookings: 0, 
              checkedOut: 0,
              pendingPaymentsDetails: []
            };


          }

          let revenue = reservation.payment.amount || 0;
          totalRevenue += revenue;
          categoryData[category].revenue += revenue;
          categoryData[category].totalBookings++;

          if (reservation.checkOut) {
            totalCheckedOut++;
            categoryData[category].checkedOut++;
          }

          if (reservation.payment.status === "PENDING") {
            totalPendingPayments += reservation.payment.amount;
            totalPendingPaymentsDetails.push({
              reservationId: reservation._id,
              category : reservation.category,
              guestName : reservation.guestName,
              applicantEmail : reservation.guestEmail,
              applicantName : reservation.applicant.name,
              paymentAmount : reservation.payment.amount,
              paymentMode : reservation.payment.source
            });
            categoryData[category].pendingPayments += reservation.payment.amount;
            categoryData[category].pendingPaymentsDetails.push({
              reservationId: reservation._id,
              guestName : reservation.guestName,
              applicantEmail : reservation.guestEmail,
              applicantName : reservation.applicant.name,
              paymentAmount : reservation.payment.amount,
              paymentMode : reservation.payment.source
            });
          }
        }
      // );
    });

    // Convert category data into an array format
    const categories = Object.keys(categoryData).map((cat) => ({
      name: cat,
      totalBookings: categoryData[cat].totalBookings,
      revenue: categoryData[cat].revenue,
      checkedOut: categoryData[cat].checkedOut,
      pendingPayments: categoryData[cat].pendingPayments,
      pendingPaymentsDetails: categoryData[cat].pendingPaymentsDetails
    }));

    res.json({
      month,
      totalBookings,
      revenue: totalRevenue,
      checkedOut: totalCheckedOut,
      pendingPayments: totalPendingPayments,
      pendingPaymentsDetails: totalPendingPaymentsDetails,
      categories,
    });

  } catch (error) {
    console.error("Error generating monthly report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const getAllRooms = async (req, res) => {
  try {
    const currentDate = new Date();

    // Fetch all rooms
    const rooms = await Room.find();

    // Map through each room to filter and update booking data
    const updatedRooms = await Promise.all(rooms.map(async (room) => {
      // Filter future bookings based on endDate
      const futureBookings = room.bookings;

      // For each future booking, find the corresponding reservation
      const updatedBookings = await Promise.all(futureBookings.map(async (booking) => {
        const reservation = await Reservation.findById(booking.resid); // Assuming resid is the reservation's ID
        
        // If the reservation is found, add the purpose, otherwise default to 'No Purpose'
        return {
          ...booking._doc,
          purpose: reservation ? reservation.purpose : 'No Purpose',

          roomNumber: room.roomNumber
        };


      }));

      // Return room with updated bookings
      return {
        ...room._doc,
        bookings: updatedBookings
      };


    }));

    // console.log("Updated rooms with booking details:", updatedRooms);
    // Send the updated rooms with booking details back as response
    res.json(updatedRooms);

  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ message: "Error fetching rooms", error });
  }
};



export const addRoom = async (req, res) => {
  if (req.user?.role !== "ADMIN")
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  try {
    const roomNumber = req.body.roomNumber;
    const roomType = req.body.roomType;
    const newRoom = await Room.create({ roomNumber: roomNumber , roomType: roomType});
    res.status(200).json({ message: "Room added Successfully", room: newRoom });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};



export const deleteRoom = async (req, res) => {
  if (req.user?.role !== "ADMIN")
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });

  try {
    const { roomId } = req.body;

    const room = await Room.findById(roomId);
    // const deletedRoom = await Room.findByIdAndDelete(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.bookings?.length > 0)
      return res.status(400).json({ message: "Room is occupied" });

    await Room.findByIdAndDelete(roomId);
    res
      .status(200)
      .json({ message: "Room deleted successfully", room: room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



async function isDateRangeAvailable(room, startDate, endDate) {
  for (const booking of room.bookings) {
    const bookingStartDate = new Date(booking.startDate).toISOString();
    const bookingEndDate = new Date(booking.endDate).toISOString();

    if (room.roomNumber == 108) {
      console.log(bookingStartDate, bookingEndDate, startDate, endDate);
    }
    // Check for intersection
    if (bookingStartDate < endDate && bookingEndDate > startDate) {
      if (room.roomNumber == 108) console.log("Intersection");
      return false; // Date range intersects with existing booking
    }
  }

  if (room.roomNumber == 108) console.log("No intersection");

  return true; // Date range is available
}

// Function to update rooms and reservation
export const updateRooms = async (req, res) => {
  if (req.user?.role !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params; // Reservation ID
    //console.log("id", id);
    const allottedRooms = req.body; // Updated room assignments

    // Fetch the previous reservation details
    const prevReservation = await Reservation.findById(id);
    if (!prevReservation) {
      throw new Error("Reservation not found", 404);
    }
    
    const RoomsRequest = prevReservation.numberOfRooms;
    
    const prevAllottedRooms = prevReservation.bookings;

    // Step 1: Remove old room assignments no longer in the updated list
    // for (const prevRoom of prevAllottedRooms) {
    //   // Check if the room exists in the new allottedRooms; if not, unassign it
    //   const isStillAssigned = allottedRooms.some(
    //     (room) =>
    //       room.roomNumber === prevRoom.roomNumber &&
    //       room.startDate === prevRoom.startDate &&
    //       room.endDate === prevRoom.endDate
    //   );

    //   if (!isStillAssigned) {
    //     const room = await Room.findOne({ roomNumber: prevRoom.roomNumber });
    //     if (!room) {
    //       throw new Error(
    //         `Room with number ${prevRoom.roomNumber} not found`,
    //         400
    //       );
    //     }

    //     // Remove the booking for the specified date range
    //     const bookingIndex = room.bookings.findIndex(
    //       (booking) =>
    //         getDate(booking.startDate) === getDate(prevRoom.startDate) &&
    //         getDate(booking.endDate) === getDate(prevRoom.endDate)
    //     );

    //     if (bookingIndex !== -1) {
    //       room.bookings.splice(bookingIndex, 1); // Unassign the room
    //       await room.save();
    //     }
    //   }
    // }
    const resid = id;
    console.log("resid ", resid);
    // Step 2: Assign new rooms or update existing bookings
    for (const newRoom of allottedRooms) {
      const { roomNumber, startDate, endDate, user } = newRoom;

      const room = await Room.findOne({ roomNumber });
      if (!room) {
        throw new Error(`Room with number ${roomNumber} not found`, 400);
      }
      const alreadyAssigned = room.bookings.some(
        (booking) => booking.resid?.toString() === resid.toString()
      );
      // Check if the room is available for the specified date range
      if(!alreadyAssigned){
      const isAvailable = await isDateRangeAvailable(room, startDate, endDate);
      if (!isAvailable) {
        throw new Error(
          `Room ${roomNumber} is not available for the specified date range`,
          400
        );
      }
     
      // Add the new booking
      room.bookings.push({ startDate, endDate,resid, user });
      await room.save();
    }
    }

// const updatedBookings = [
  // Keep only the previous rooms that are NOT in the new allotment
  // ...prevReservation.bookings.filter(
//     (prevRoom) =>
//       !allottedRooms.some(
//         (newRoom) => newRoom.roomNumber === prevRoom.roomNumber
//       )
//   ),
//   ...allottedRooms, // Add the new/updated rooms
// ];

    // Step 3: Update the reservation document
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: { bookings: allottedRooms, stepsCompleted: 3 } },
      { new: true, session }
    );
    // const updatedReservation = await Reservation.findByIdAndUpdate(
    //   id,
    //   { $set: { bookings: updatedBookings, stepsCompleted: 3 } },  
    //   { new: true, session }
    // );

    if (!updatedReservation) {
      throw new Error("Failed to update reservation", 400);
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    if(req.method === "PUT" && RoomsRequest > allottedRooms.length){
      return res.status(400).json({
        success: false,
        message: `Insufficient rooms allotted. Guest requested ${RoomsRequest} rooms, but only ${allottedRooms.length} assigned.`,
      });
    }
    const roomNumbers = updatedReservation.bookings.map(booking => booking.roomNumber).join(", ");

    // sendVerificationEmail(
    //   [updatedReservation.guestEmail],
    //   "Room Assignment Updated",
    //   `<div>Your room assignment has been updated.</div><br><br>
    //   <div>Guest Name: ${updatedReservation.guestName}</div>
    //     <div>Guest Email: ${updatedReservation.guestEmail}</div>
    //     <div>Number of Guests: ${updatedReservation.numberOfGuests}</div>
    //     <div>Number of Rooms: ${updatedReservation.numberOfRooms}</div>
    //     <div>Room Type: ${updatedReservation.roomType}</div>
    //     <div>Purpose: ${updatedReservation.purpose}</div>
    //     <div>Arrival Date: ${new Date(updatedReservation.arrivalDate).toISOString().split("T")[0]}</div>
    //     <div>Departure Date: ${new Date(updatedReservation.departureDate).toISOString().split("T")[0]}</div>
    //     <div>Address: ${updatedReservation.address}</div>
    //     <div>Category: ${updatedReservation.category}</div>`
    //     `<div>Room Numbers: ${roomNumbers}</div>`
    // )
    sendVerificationEmail(
      [updatedReservation.guestEmail],
      "Room Assignment Updated",
      "<div>Your room assignment has been updated.</div><br><br><div>Guest Name: " +
        updatedReservation.guestName +
        "</div><br><div>Number of Guests: " +
        updatedReservation.numberOfGuests +
        "</div><br><div>Number of Rooms: " +
        updatedReservation.numberOfRooms +
        "</div><br><div>Room Type: " +
        updatedReservation.roomType +
        "</div><br><div>Purpose: " +
        updatedReservation.purpose +
        "</div><br><div>Arrival Date: " +
        getDate(updatedReservation.arrivalDate) +
        "</div><br><div>Departure Date: " +
        getDate(updatedReservation.departureDate) +
        "</div><br><div>Category: " +
        updatedReservation.category +
        "</div>" +
        "<br><div>Room Numbers: " +
        roomNumbers +
        "</div>"
    );
    res.status(200).json({
      message: "Rooms and reservation updated successfully",
      reservation: updatedReservation,
    });
  } catch (error) {
    // Rollback transaction in case of any error
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating rooms and reservation:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update rooms and reservation",
    });
  }
};




export const sendNotification = async (req, res) => {
  try {
    if (req.user.role === "USER") {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    const { message, sender, res_id } = req.body;
    sender = req.user.role;
    const user = await User.findById(req.params.id);
    user.notifications.push({ message, sender, res_id });
    await user.save();
    res.status(200).json({ message: "Notification sent" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const getCurrentReservations = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    const reservations = await Reservation.find({
      departureDate: { $gte: new Date() },
      status: "APPROVED",
    });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const getPaymentPendingReservations = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    const reservations = await Reservation.find({
      // departureDate: { $gte: new Date() },
      "payment.status": "PENDING",
      status: "APPROVED",
    });
    console.log(reservations);
    res.status(200).json(reservations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const getCheckedOutReservations = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    const reservations = await Reservation.find({
      checkOut: true,
    });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const getLateCheckoutReservations = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    const reservations = await Reservation.find({
      departureDate: { $lt: new Date() },
      status: "APPROVED",
      checkOut: false,
    });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const checkoutReservation = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });

    const { id } = req.params;
    // console.log("params", req.params);
    // console.log("id", id);
    const {departureDate} = req.body; // Get departureDate from request body
    console.log("departureDate", departureDate);
    const reservation = await Reservation.findById(id);
    // console.log("res:", reservation);
    if (reservation.payment.status !== "PAID") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const dinings = await Meal.find({ _id: { $in: reservation.diningIds } });

    let canCheckout = true;

    for (const dining of dinings) {
      console.log(dining);
      console.log(dining.status);
      if (dining.payment.status !== "PAID") {
        canCheckout = false;
        break;
      }
    }

    if (!canCheckout) {
      return res
        .status(400)
        .json({ message: "Payment of dinings not completed" });
    }

    reservation.checkOut = true;
    if(departureDate){

    reservation.departureDate = new Date(departureDate); // Important: Convert to Date type
    }
    const category = reservation.category;
    const roomType = reservation.roomType;
    const numberOfRooms = reservation.numberOfRooms;
    const arrivalDate = reservation.arrivalDate; // Get departureDate from request body
    const ms = Number(
      new Date(departureDate).getTime() - new Date(arrivalDate).getTime()
    );
    console.log("days", ms);
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    console.log("days", days);
    const room_cost = calculateRoomCost(category, roomType, numberOfRooms, days);
    reservation.payment.amount = room_cost; // Update the payment amount
    await appendReservationToSheetAfterCheckout(reservation);
    await reservation.save();
    console.log("check res:", reservation);
    res.status(200).json({ message: "Checkout successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const checkinReservation = async (req, res) => {
  try {
    if (req.user.role !== "CASHIER")
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    const { arrivalDate } = req.body; // Get arrivalDate from request body

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Update the arrivalDate if provided
    if (arrivalDate) {
      reservation.arrivalDate = new Date(arrivalDate); // Important: Convert to Date type
    }

    reservation.checkedIn = true; // Mark user as checked in
    const category = reservation.category;
    const roomType = reservation.roomType;
    const numberOfRooms = reservation.numberOfRooms;
    const departureDate = reservation.departureDate; // Get departureDate from request body
    const ms = Number(
      new Date(departureDate).getTime() - new Date(arrivalDate).getTime()
    );
    console.log("days", ms);
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    console.log("days", days);
    const room_cost = calculateRoomCost(category, roomType, numberOfRooms, days);
    reservation.payment.amount = room_cost; // Update the payment amount
    await reservation.save(); // Save the updated reservation

    res.status(200).json({ message: "User checked in successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const checkoutToday = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 for the start of today

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // Set hours, minutes, seconds, and milliseconds to the end of today

    const reservations = await Reservation.find({
      departureDate: { $gt: new Date(), $lte: todayEnd },
      status: "APPROVED",
      checkOut: false,
    });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const getDiningAmount = async (req, res) => {
  try {
    const { id } = req.body;
    const reservation = await Reservation.findById(id);
    const diningIds = reservation.diningIds;
    let totalAmount = 0;
    if (diningIds.length > 0) {
      const meals = await Meal.find({
        _id: { $in: diningIds },
      });
      totalAmount = meals.reduce((accumulator, currentObject) => {
        return accumulator + currentObject.amount;
      }, 0);
    }
    res.status(200).json({ totalAmount });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export async function editReservation(req, res) {
  try {
    const { id } = req.params;
    
    // Log incoming request for debugging
    console.log('Files received:', req.files);
    console.log('Body received:', req.body);
    
    // Get the existing reservation
    const existingReservation = await Reservation.findById(id);
    if (!existingReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    let applicantData = req.body.applicant;
    if (typeof applicantData === "string") {
      try {
        applicantData = JSON.parse(applicantData);
      } catch (err) {
        console.error("Error parsing applicant JSON:", err);
        return res.status(400).json({ message: "Invalid applicant JSON format" });
      }
    }

    // Handle file uploads with proper null checks
    let newFiles = [];
    if (req.files && req.files.files) {
      // Handle single file
      if (!Array.isArray(req.files.files)) {
        const file = req.files.files;
        if (file && file.id) {
          newFiles.push({
            refid: file.id,
            extension: file.originalname ? file.originalname.split('.').pop() : ''
          });
        }
      } 
      // Handle multiple files
      else {
        newFiles = req.files.files
          .filter(file => file && file.id) // Ensure file has an id
          .map(file => ({
            refid: file.id,
            extension: file.originalname ? file.originalname.split('.').pop() : ''
          }));
      }
    }

    // Handle receipt file if it exists
    let receiptId = existingReservation.receipt;
    if (req.files && req.files.receipt && req.files.receipt[0] && req.files.receipt[0].id) {
      receiptId = req.files.receipt[0].id;
    }

    // Calculate room cost
    const ms = Number(
      new Date(req.body.departureDate).getTime() - new Date(req.body.arrivalDate).getTime()
    );
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    
    // Use calculateRoomCost helper function
    const roomType = req.body.roomType || existingReservation.roomType;
    const category = req.body.category || existingReservation.category;
    const numberOfRooms = req.body.numberOfRooms || existingReservation.numberOfRooms;
    const arrivalDate = req.body.arrivalDate || existingReservation.arrivalDate;
    const arrivalTime = req.body.arrivalTime || existingReservation.arrivalTime;
    const departureDate = req.body.departureDate || existingReservation.departureDate;
    const departureTime = req.body.departureTime || existingReservation.departureTime;
    const signature = req.body.signature || existingReservation.signature;
    const room_cost = calculateRoomCost(category, roomType, numberOfRooms, days);

    console.log('Days:', days);
    console.log('Room type:', roomType);
    console.log('Category:', category);
    console.log('Number of rooms:', numberOfRooms);
    console.log('Room cost:', room_cost);

    // Validate files for categories ES-A and ES-B
    if ((req.body.category === 'ES-A' || req.body.category === 'ES-B') && 
        newFiles.length === 0 && 
        (!existingReservation.files || existingReservation.files.length === 0)) {
      return res.status(400).json({ 
        message: "Supporting documents are required for Executive Suite categories" 
      });
    }

    // Prepare reviewers array for edited reservation
    let reviewersArray = [];
    
    // Always add admin as a reviewer
    reviewersArray.push({ role: "ADMIN", comments: "Form edited by user", status: "PENDING" });
    
    // Add the user-selected reviewers from the form submission
    if (req.body.reviewers) {
      const reviewers = req.body.reviewers;
      const subroles = req.body.subroles || "";
      
      const subrolesArray = subroles ? subroles.split(",") : [];
      const userSelectedReviewers = reviewers ? reviewers.split(",").map((role, index) => ({
        role:
          role +
          (subrolesArray[index] && subrolesArray[index] !== "Select" ? " " + subrolesArray[index] : ""),
        comments: "Form edited by user",
        status: "PENDING",
      })) : [];
      
      // Add all user-selected reviewers
      reviewersArray.push(...userSelectedReviewers);
    } else {
      // If no new reviewers specified, preserve the existing ones (except ADMIN which we already added)
      const nonAdminReviewers = existingReservation.reviewers
        .filter(reviewer => reviewer.role !== "ADMIN")
        .map(reviewer => ({
          role: reviewer.role,
          comments: "Form edited by user",
          status: "PENDING"
        }));
      
      reviewersArray.push(...nonAdminReviewers);
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      applicant: applicantData,
      status: "PENDING",
      stepsCompleted: 1,
      reviewers: reviewersArray,
      files: [...(existingReservation.files || []), ...newFiles],
      receipt: receiptId,  // Use the updated receipt ID
      arrivalDate: new Date(arrivalDate + 'T' + (arrivalTime || "00:00")),
      departureDate: new Date(departureDate + 'T' + (departureTime || "00:00")),
      signature: signature,
      payment: {
        ...existingReservation.payment,
        sourceName: req.body.sourceName || existingReservation.payment.sourceName || "",
        amount: room_cost,
        status: "PENDING",
        source: req.body.source || existingReservation.payment.source
      }
    };



    // Update the reservation
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    console.log('Updated reservation:', updatedReservation);
    res.status(200).json({
      message: "Reservation updated successfully",
      reservation: updatedReservation
    });

  } catch (error) {
    console.error("Error updating reservation:", error);
    res.status(400).json({ message: error.message });
  }
};



// Add admin annotations to a reservation
export const updateAdminAnnotations = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      approvalAttached,
      confirmedRoomNo,
      entrySerialNo,
      entryPageNo,
      entryDate,
      bookingDate,
      checkInTime,
      checkOutTime,
      remarks 
    } = req.body;

    // Validate reservation exists
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Update admin annotation fields
    const annotationUpdate = {
      adminAnnotation: {
        approvalAttached: approvalAttached || reservation.adminAnnotation?.approvalAttached || "",
        confirmedRoomNo: confirmedRoomNo || reservation.adminAnnotation?.confirmedRoomNo || "",
        entrySerialNo: entrySerialNo || reservation.adminAnnotation?.entrySerialNo || "",
        entryPageNo: entryPageNo || reservation.adminAnnotation?.entryPageNo || "",
        entryDate: entryDate || reservation.adminAnnotation?.entryDate,
        bookingDate: bookingDate || reservation.adminAnnotation?.bookingDate,
        checkInTime: checkInTime || reservation.adminAnnotation?.checkInTime || "",
        checkOutTime: checkOutTime || reservation.adminAnnotation?.checkOutTime || "",
        remarks: remarks || reservation.adminAnnotation?.remarks || "",
        updatedAt: new Date(),
        updatedBy: req.user.name || req.user.email || "Admin"
      }
    };

    // Update the reservation with admin annotations
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      annotationUpdate,
      { new: true }
    );

    console.log('Updated admin annotations:', updatedReservation.adminAnnotation);
    res.status(200).json({
      message: "Admin annotations updated successfully",
      reservation: updatedReservation
    });

  } catch (error) {
    console.error("Error updating admin annotations:", error);
    res.status(400).json({ message: error.message });
  }
};

// Helper function to calculate room cost
function calculateRoomCost(category, roomType, numberOfRooms, days) {
  let baseCost = 0;
  
  // Set base cost according to category
  switch(category) {
    case "ES-A":
      baseCost = 0; // Free
      break;
    case "ES-B":
      baseCost = 3500;
      break;
    case "BR-A":
      baseCost = 0; // Free
      break;
    case "BR-B1":
      baseCost = 2000;
      break;
    case "BR-B2":
      baseCost = 1200;
      break;
    default:
      baseCost = 0;
  }
  const totalDays = Math.ceil(days);
  // Calculate total cost
  return baseCost * numberOfRooms * totalDays;
}

// Update receipt file for an existing reservation
export const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate reservation exists
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Check if receipt file was uploaded
    if (!req.files || !req.files.receipt || !req.files.receipt[0]) {
      return res.status(400).json({ message: "Receipt file is required" });
    }

    // Get the new receipt file ID
    const newReceiptId = req.files.receipt[0].id;

    // Update the reservation with the new receipt
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { receipt: newReceiptId },
      { new: true }
    );

    console.log('Updated receipt for reservation:', id);
    res.status(200).json({
      message: "Receipt updated successfully",
      reservation: updatedReservation
    });

  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(400).json({ message: error.message });
  }
};
