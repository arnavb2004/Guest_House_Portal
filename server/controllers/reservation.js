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
      from: "dep.test.p04@gmail.com",
      to: to.length > 0 ? to : "dep.test.p04@gmail.com", // list of receivers
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
    } = req.body;

    // Validate required fields
    if (!guestName || !arrivalDate || !departureDate || !category) {
      return res.status(400).json({ message: "Missing required fields" });
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
    let reviewersArray = reviewers ? reviewers.split(",").map((role, index) => ({
      role:
        role +
        (subrolesArray[index] && subrolesArray[index] !== "Select" ? " " + subrolesArray[index] : ""),
      comments: "",
      status: "PENDING",
    })) : [];

    if (req.user.role === "ADMIN") {
      // First, add ADMIN as a reviewer
      reviewersArray = [{ role: "ADMIN", comments: "", status: "PENDING" }];
      
      // For specific categories, add CHAIRMAN as a reviewer too
      if (category === "ES-B" || category === "BR-A" || category === "BR-B1" || 
          category === "BR-B2") {
        reviewersArray.push({ role: "CHAIRMAN", comments: "", status: "PENDING" });
      }
    }
   
    const reservation = await Reservation.create({
      srno: 1,
      guestEmail: email,
      byAdmin: req.user.role === "ADMIN",
      guestName,
      address,
      purpose,
      numberOfGuests,
      numberOfRooms,
      roomType,
      arrivalDate: new Date(`${arrivalDate}T${arrivalTime || "13:00"}`),
      departureDate: new Date(`${departureDate}T${departureTime || "11:00"}`),
      category,
      stepsCompleted: 1,
      files: fileids,
      payment: { source: source, amount: room_cost, paymentId: "" },
      applicant: applicantData,
      reviewers: reviewersArray,
      receipt: receiptid,
    });

    let revArray = reviewersArray.map((reviewer) => reviewer.role);

    
    sendVerificationEmail(
      email,
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
      !reservation.reviewers.find((r) => r.role === req.user.role)
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
      if (reviewer.role === req.user.role) {
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
    // const body =
    //   "<div>Your reservation has been approved</div><br><div>Comments: " +
    //   req.body.comments +
    //   "</div>";
    // sendVerificationEmail(
    //   reservation.guestEmail,
    //   "Reservation status updated",
    //   body
    // );
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
      !reservation.reviewers.find((r) => r.role === req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    let found = false;
    reservation.reviewers = reservation.reviewers.map((reviewer) => {
      if (reviewer.role === req.user.role) {
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
      !reservation.reviewers.find((r) => r.role === req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }
    reservation.reviewers = reservation.reviewers.map((reviewer) => {
      if (reviewer.role === req.user.role) {
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
      // For Chairman or other roles, don't show forms where any reviewer has rejected
      const reservations = await Reservation.find({
        reviewers: {
          $elemMatch: {
            role: req.user.role,
            status: "PENDING",
          },
        },
        // Don't show forms where any reviewer has rejected it
        "reviewers.status": { $nin: ["REJECTED"] }
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    } else {
      // For ADMIN, don't show forms that have been rejected by Chairman
      const reservations = await Reservation.find({ 
        status: "PENDING",
        // Don't show forms where chairman has rejected
        reviewers: {
          $not: {
            $elemMatch: {
              role: "CHAIRMAN",
              status: "REJECTED"
            }
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
      const reservations = await Reservation.find({
        status: "APPROVED",
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    } else {
      const reservations = await Reservation.find({
        reviewers: {
          $elemMatch: {
            role: req.user.role,
            status: "APPROVED",
          },
        },
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getRejectedReservations = async (req, res) => {
  console.log("Getting rejected reservations...");
  try {
    if (req.user.role === "USER") {
      // For users, show all rejected reservations
      const reservations = await Reservation.find({
        guestEmail: req.user.email,
        status: "REJECTED",
      }).sort({
        createdAt: -1,
      });
      return res.status(200).json(reservations);
    } else if (req.user.role === "ADMIN") {
      // For admin, show reservations that are rejected (either by admin or by other reviewers)
      const reservations = await Reservation.find({
        status: "REJECTED",
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    } else if (req.user.role === "CHAIRMAN") {
      // For chairman, show reservations where either:
      // 1. The chairman personally rejected it (so they can revert/accept again)
      // 2. The reservation's overall status is REJECTED but not rejected by admin
      const reservations = await Reservation.find({
        $or: [
          // Chairman personally rejected it
          {
            reviewers: {
              $elemMatch: {
                role: "CHAIRMAN",
                status: "REJECTED",
              },
            },
          },
          // Overall status is REJECTED but not rejected by admin
          {
            status: "REJECTED",
            reviewers: {
              $not: {
                $elemMatch: {
                  role: "ADMIN",
                  status: "REJECTED",
                },
              },
            },
          },
        ],
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
    } else {
      // For other roles, show reservations they personally rejected
      const reservations = await Reservation.find({
        reviewers: {
          $elemMatch: {
            role: req.user.role,
            status: "REJECTED",
          },
        },
      }).sort({
        createdAt: -1,
      });
      res.status(200).json(reservations);
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
  let reviewers = reservation.reviewers;
  const userEmail = reservation.guestEmail;

  let isApproved = false;
  let isRejected = false;
  let adminStatus;
  reviewers.forEach((reviewer) => {
    if (reviewer.role === "ADMIN") {
      adminStatus = reviewer.status;
    } else {
      if (reviewer.status === "APPROVED") {
        isApproved = true;
      }
      if (reviewer.status === "REJECTED") {
        isRejected = true;
      }
    }
  });
  if (adminStatus === "APPROVED") {
    isApproved = true;
  } else if (adminStatus === "REJECTED") {
    isRejected = true;
  }

  if (isRejected) {
    reservation.status = "REJECTED";
  } else if (isApproved) {
    reservation.status = "APPROVED";
  } else {
    reservation.status = "PENDING";
  }
  if (reservation.status === "APPROVED") {
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
  if (req.user?.role !== "ADMIN")
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    console.log("Rooms", rooms);
    res.status(200).json(rooms);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const addRoom = async (req, res) => {
  if (req.user?.role !== "ADMIN")
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  try {
    const roomNumber = req.body.roomNumber;
    const newRoom = await Room.create({ roomNumber: roomNumber });
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

    const deletedRoom = await Room.findByIdAndDelete(roomId);

    if (!deletedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (deletedRoom.bookings?.length > 0)
      return res.status(404).json({ message: "Room is occupied" });

    res
      .status(200)
      .json({ message: "Room deleted successfully", room: deletedRoom });
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
    const allottedRooms = req.body; // Updated room assignments

    // Fetch the previous reservation details
    const prevReservation = await Reservation.findById(id);
    if (!prevReservation) {
      throw new Error("Reservation not found", 404);
    }

    const prevAllottedRooms = prevReservation.bookings;

    // Step 1: Remove old room assignments no longer in the updated list
    for (const prevRoom of prevAllottedRooms) {
      // Check if the room exists in the new allottedRooms; if not, unassign it
      const isStillAssigned = allottedRooms.some(
        (room) =>
          room.roomNumber === prevRoom.roomNumber &&
          room.startDate === prevRoom.startDate &&
          room.endDate === prevRoom.endDate
      );

      if (!isStillAssigned) {
        const room = await Room.findOne({ roomNumber: prevRoom.roomNumber });
        if (!room) {
          throw new Error(
            `Room with number ${prevRoom.roomNumber} not found`,
            400
          );
        }

        // Remove the booking for the specified date range
        const bookingIndex = room.bookings.findIndex(
          (booking) =>
            getDate(booking.startDate) === getDate(prevRoom.startDate) &&
            getDate(booking.endDate) === getDate(prevRoom.endDate)
        );

        if (bookingIndex !== -1) {
          room.bookings.splice(bookingIndex, 1); // Unassign the room
          await room.save();
        }
      }
    }

    // Step 2: Assign new rooms or update existing bookings
    for (const newRoom of allottedRooms) {
      const { roomNumber, startDate, endDate, user } = newRoom;

      const room = await Room.findOne({ roomNumber });
      if (!room) {
        throw new Error(`Room with number ${roomNumber} not found`, 400);
      }

      // Check if the room is available for the specified date range
      const isAvailable = await isDateRangeAvailable(room, startDate, endDate);
      if (!isAvailable) {
        throw new Error(
          `Room ${roomNumber} is not available for the specified date range`,
          400
        );
      }

      // Add the new booking
      room.bookings.push({ startDate, endDate, user });
      await room.save();
    }

    // Step 3: Update the reservation document
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: { bookings: allottedRooms, stepsCompleted: 3 } },
      { new: true, session }
    );

    if (!updatedReservation) {
      throw new Error("Failed to update reservation", 400);
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

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
    const reservation = await Reservation.findById(id);
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
    await appendReservationToSheetAfterCheckout(reservation);
    await reservation.save();
    console.log("check res:", reservation);
    res.status(200).json({ message: "Checkout successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
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

export const editReservation = async (req, res) => {
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

    // Determine reviewers based on category
    let reviewersArray = [];
    
    // Ensure both admin and chairman are added as reviewers when form is edited
    reviewersArray.push({ role: "ADMIN", comments: "Form edited by user", status: "PENDING" });
    
    // For specific categories, always add chairman
    if (req.body.category === 'BR-A' || req.body.category === 'BR-B1' || 
        req.body.category === 'BR-B2' || req.body.category === 'ES-B') {
      reviewersArray.push({ role: "CHAIRMAN", comments: "Form edited by user", status: "PENDING" });
    } else {
      // For category ES-A, check if chairman was previously a reviewer
      const wasChairmanReviewer = existingReservation.reviewers.some(
        reviewer => reviewer.role === "CHAIRMAN" || reviewer.role.startsWith("CHAIRMAN ")
      );
      
      if (wasChairmanReviewer) {
        reviewersArray.push({ role: "CHAIRMAN", comments: "Form edited by user", status: "PENDING" });
      }
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
      payment: {
        ...existingReservation.payment,
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
  
  // Calculate total cost
  return baseCost * numberOfRooms * days;
}
