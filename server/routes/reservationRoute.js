import express from "express";
import { upload, checkFileSize } from "../middlewares/fileStore.js";
import { checkAuth } from '../middlewares/tokens.js'

import {getAggregatedData} from "../controllers/aggregator.js"
import {
  createReservation,
  getReservationDetails,
  approveReservation,
  getAllReservationDetails,
  rejectReservation,
  holdReservation,
  getPendingReservations,
  getApprovedReservations,
  getRejectedReservations,
  getReservationDocuments,
  updateReservation,
  getRooms,
  addRoom,
  deleteRoom,
  updateRooms,
  sendNotification,
  updatePaymentStatus,
  getCurrentReservations,
  getPaymentPendingReservations,
  getCheckedOutReservations,
  getLateCheckoutReservations,
  checkoutReservation,
  checkoutToday,
  getDiningAmount,
  deleteReservations,
  editReservation,
  getAllRooms,
  monthlyReport,
  sendReminder,
  sendReminderAll,
  removeFromList,
  updateRoomBookings,
  withdrawApplication,
  checkinReservation,
  updateAdminAnnotations,
  updateReceipt,
} from "../controllers/reservation.js";

const Router = express.Router();

Router.post(
  "/",
  checkFileSize,
  upload.fields([
    { name: "files", maxCount: 5 },
    { name: "receipt", maxCount: 1 },
  ]),
  createReservation
);

Router.get("/all", getAllReservationDetails);
Router.get("/aggregated-data", async (req, res) => {
  if (!["ADMIN", "CHAIRMAN"].includes(req.user?.role)) {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }

  try {
    // Parse criteria from query parameters if provided; otherwise, use defaults.
    const matchCriteria = req.query.matchCriteria
      ? JSON.parse(req.query.matchCriteria)
      : [{ field: "status", value: "" }];
    const groupFields = req.query.groupFields
      ? JSON.parse(req.query.groupFields)
      : ["category"];
    const sortCriteria = req.query.sortCriteria
      ? JSON.parse(req.query.sortCriteria)
      : [{ field: "count", order: "asc" }];

    const data = await getAggregatedData(matchCriteria, groupFields, sortCriteria);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching aggregated data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching aggregated data",
      error: error.message,
    });
  }
});
Router.delete("/withdraw/:id", withdrawApplication);
Router.put("/rooms/:id/update", updateRoomBookings);
Router.put("/rooms/:id/remove", removeFromList);
Router.post("/send-reminder-all", sendReminderAll);
Router.post("/send-reminder", sendReminder);
Router.get("/reports/monthly/:month", monthlyReport);
Router.get("/room-details", getAllRooms);
Router.get("/current", getCurrentReservations);
Router.get("/late", getLateCheckoutReservations);
Router.get("/checkedout", getCheckedOutReservations);
Router.get("/pending", getPendingReservations);
Router.get("/approved", getApprovedReservations);
Router.get("/rejected", getRejectedReservations);
Router.get("/documents/:id", getReservationDocuments);
Router.get("/rooms", getRooms);
Router.get("/payment/pending", getPaymentPendingReservations);
Router.get("/checkout/today", checkoutToday);
Router.get("/details/:id", checkAuth, getReservationDetails);

// Admin annotations route - only ADMIN users can update these fields
Router.put("/admin-annotations/:id", checkAuth, (req, res, next) => {
  // Only allow ADMIN users to update annotations
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Unauthorized. Admin access required." });
  }
  next();
}, updateAdminAnnotations);

// Update receipt for an existing reservation
Router.put("/update-receipt/:id", 
  checkAuth,
  checkFileSize, 
  upload.fields([
    { name: "receipt", maxCount: 1 },
  ]), 
  updateReceipt
);

Router.put("/checkin/:id", checkinReservation);
Router.put("/checkout/:id", checkoutReservation);
Router.put("/rooms/:id", updateRooms);
Router.put("/approve/:id", approveReservation);
Router.put("/reject/:id", rejectReservation); 
Router.put("/hold/:id", holdReservation);
Router.put("/payment/:id", updatePaymentStatus);
Router.put("/:id", updateReservation);
Router.put('/edit/:id', 
  checkAuth,
  checkFileSize,
  upload.fields([
    { name: "files", maxCount: 7 },
  ]), 
  editReservation
);

Router.post("/rooms", addRoom);
Router.post("/:id", getDiningAmount);

Router.delete("/rooms", deleteRoom);
Router.delete("/", deleteReservations);

export default Router;
