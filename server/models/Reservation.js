import mongoose from "mongoose";
import Counter from "./Counter.js";
const reservationSchema = new mongoose.Schema(
  {
    srno: {
      type: Number,
      // required: true,
      unique: true,
    },
    byAdmin: {
      type: Boolean,
      default: false,
    },
    guestEmail: {
      type: String,
      // required: true,
      trim: true,
    },
    guestName: {
      type: String,
      // required: true,
    },
    guestGender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: "MALE",
    },
    numberOfGuests: {
      type: Number,
      // required: true,
    },
    numberOfRooms: {
      type: Number,
      // required: true,
    },
    roomType: {
      type: String,

      enum: ["Single Occupancy", "Double Occupancy"], // Assuming only two types for simplicity
    },
    arrivalDate: {
      type: Date,
    },
    arrivalTime: {
      type: String,
      default: "",
    },
    departureDate: {
      type: Date,
    },
    departureTime: {
      type: String,
      default: "",
    },
    purpose: {
      type: String,
    },
    category: {
      type: String,
      enum: ["ES-A", "ES-B", "BR-A", "BR-B1", "BR-B2"],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "HOLD"],
      default: "PENDING",
    },
    stepsCompleted: {
      type: Number,
      required: true,
      default: 0,
    },
    reviewers: [
      {
        role: {
          type: String,
        },
        comments: {
          type: String,
        },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "HOLD"],
          default: "PENDING",
        },
      },
    ],
    address: {
      type: String,
      // required: true,
    },
    receipt: {
      type: String,
      required: true,
    },
    files: [
      {
        refid: {
          type: String,
          required: true,
        },
        extension: {
          type: String,
          required: true,
        },
      },
    ],
    bookings: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        roomNumber: {
          type: Number,
          required: true,
        },
        user: {
          type: String,
          required: true,
        },
      },
    ],
    payment: {
      source: {
        type: String,
        enum: ["GUEST", "DEPARTMENT", "OTHERS"],
        required: true,
        default: "GUEST",
      },
      sourceName: {
        type: String,
        trim: true,
        default: "", // optional: only used when source != "GUEST"
      },
      status: {
        type: String,
        enum: ["PENDING", "PAID"],
        default: "PENDING",
      },
      billRaised: {
        type: Boolean,
        default: true,
      },
      amount: {
        type: Number,
        // required:true,
      },
      paymentId: {
        type: String,
      },
    },
    checkOut: {
      type: Boolean,
      default: false,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    applicant: {
      name: {
        type: String,
        // required: true,
      },
      designation: {
        type: String,
        // required: true,
      },
      department: {
        type: String,
        // required: true,
      },
      code: {
        type: String,
        // required: true,
      },
      mobile: {
        type: String,
        // required: true,
      },
      email: {
        type: String,
        // required: true,
      },
    },
    diningIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Meal",
        },
      ],
      default: [],
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    signature: {
      type: {
        type: String,
        enum: ["text", "image", ""],
        default: ""
      },
      data: {
        type: String,
        default: ""
      }
    },
    // Admin annotations for PDF updates
    adminAnnotation: {
      approvalAttached: {
        type: String,
        enum: ["YES", "NO", ""],
        default: ""
      },
      confirmedRoomNo: {
        type: String,
        default: ""
      },
      entrySerialNo: {
        type: String,
        default: ""
      },
      entryPageNo: {
        type: String,
        default: ""
      },
      entryDate: {
        type: Date,
        default: null
      },
      bookingDate: {
        type: Date,
        default: null
      },
      checkInTime: {
        type: String,
        default: ""
      },
      checkOutTime: {
        type: String,
        default: ""
      },
      remarks: {
        type: String,
        default: ""
      },
      updatedAt: {
        type: Date,
        default: null
      },
      updatedBy: {
        type: String,
        default: ""
      }
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// reservationSchema.post("save", async function (doc) {
//   if (doc.status === "APPROVED") {
//     // Send notification to guest
//     //change the number of pending requests for the user
//     // sendNotification(doc.guestEmail, "Your reservation has been approved");
//   }
//   console.log(doc.srno);
// });

//another one when we create a new object
reservationSchema.pre("save", async function (next) {
  // Get the next sequence value
  try {
    if (this.isNew) {
      const nextSequence = await Counter.getNextSequence("reservation");
      this.srno = nextSequence;
      console.log("Got the next sequence value: ", this.srno);
    }
    console.log("saving the reservation");
    next();
  } catch (e) {
    next(e);
    console.log(e);
  }
  // Send notification to admin
  // sendNotification(ADMIN_EMAIL, "A new reservation has been created");
});
// reservationSchema.plugin(autoIncrement.plugin, {
//   model: "Reservation",
//   field: "srno",
//   startAt: 1,
//   incrementBy: 1,
// });

reservationSchema.statics.aggregateReservations = async function (
  matchCriteria,
  groupFields,
  sortCriteria
) {
  try {
    // Build the $match stage from the matchCriteria array.
    let matchStage = {};
    if (Array.isArray(matchCriteria) && matchCriteria.length > 0) {
      matchCriteria.forEach(condition => {
        // Example: { field: "status", value: "REJECTED" }
        matchStage[condition.field] = condition.value;
      });
    }

    // Build the $group stage.
    // Create a composite _id using the groupFields array.
    let groupId = {};
    if (Array.isArray(groupFields) && groupFields.length > 0) {
      groupFields.forEach(field => {
        groupId[field] = `$${field}`;
      });
    } else {
      // Group all documents together if no group fields are provided.
      groupId = null;
    }
    const groupStage = {
      _id: groupId,
      count: { $sum: 1 },
    };

    // Build the $sort stage.
    let sortStage = {};
    if (Array.isArray(sortCriteria) && sortCriteria.length > 0) {
      sortCriteria.forEach(sortCondition => {
        // Example: { field: "count", order: "asc" }
        const order = sortCondition.order.toLowerCase() === "asc" ? 1 : -1;
        sortStage[sortCondition.field] = order;
      });
    }

    // Assemble the aggregation pipeline.
    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    pipeline.push({ $group: groupStage });
    if (Object.keys(sortStage).length > 0) {
      pipeline.push({ $sort: sortStage });
    }

    // Execute the aggregation pipeline using Mongoose's built-in aggregate method.
    return await this.aggregate(pipeline);
  } catch (error) {
    console.error("Aggregation error:", error);
    throw error;
  }
};
const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
