import React, { useState } from "react";
import { useSelector } from "react-redux";
import { privateRequest } from "../utils/useFetch";
import StepperComponent from "./Stepper";
import { toast } from "react-toastify";

const Workflow = ({ id, userRecord, reviewers, setReviewers }) => {
  const steps = ["Reservation Form", "Approval", "Room allocation", "Payment"];
  const [paymentId, setPaymentId] = useState({
    id: userRecord.payment.paymentId,
    confirmId: "",
  });
  console.log(userRecord);

  const { stepsCompleted } = userRecord;
  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);
  const reviewer = reviewers.find((reviewer) => reviewer.role === user.role);
  const comments = reviewer?.comments;
  // const stepsCompleted = 2;
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRejectReason, setSelectedRejectReason] = useState("0");
  const [showCustomReasonField, setShowCustomReasonField] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [checked, setChecked] = useState([]);
  const handleRejectClick = (recordId) => {
    setSelectedRecordId(recordId);
    setRejectReason("");
    setSelectedRejectReason("0");
    setShowCustomReasonField(false);
    setOpenRejectDialog(true);
  };

  const rejectionReasons = [
    { id: "0", reason: "Select a Reason" },
    { id: "1", reason: "Room is not available" },
    { id: "2", reason: "Document uploaded is blurred, please re-upload" },
    { id: "3", reason: "Document uploaded does not match the provided category" },
    { id: "4", reason: "Requested dates are not available" },
    { id: "5", reason: "Incomplete information provided" },
    { id: "6", reason: "Booking policy violation" },
    { id: "7", reason: "Duplicate booking request" },
    { id: "8", reason: "Other" }
  ];

  const handleReasonChange = (event) => {
      const value = event.target.value;
      setSelectedRejectReason(value);
      
      if (value === "8") { 
        setShowCustomReasonField(true);
        setRejectReason("");
      } else if (value !== "0") {
        const selectedReason = rejectionReasons.find(item => item.id === value);
        setRejectReason(selectedReason.reason);
        setShowCustomReasonField(false);
      } else {
        setRejectReason("");
        setShowCustomReasonField(false);
      }
    };
  
    const handleRejectConfirm = async () => {
      if (selectedRejectReason === "0") {
        toast.error("Please select a reason for rejection");
        return;
      }
      
      if (selectedRejectReason === "8" && !rejectReason.trim()) {
        toast.error("Please provide a custom reason for rejection");
        return;
      }
  
      try {
        if (selectedRecordId === null) {
          // Handle bulk rejection
          for (const record of checked) {
            if (record !== "#") {
              await http.put(`/reservation/reject/${record}`, { reason: rejectReason });
            }
          }
          toast.success("Requests Rejected");
        } else {
          // Handle single rejection
          await http.put(`/reservation/reject/${selectedRecordId}`, { reason: rejectReason });
          toast.success("Request Rejected");
        }
        window.location.reload();
      } catch (error) {
        if (error.response?.data?.message) {
          toast.error(error.response.data);
        } else {
          toast.error("An error occurred");
        }
      }
      setOpenRejectDialog(false);
      setRejectReason("");
      setSelectedRejectReason("0");
      setShowCustomReasonField(false);
      setSelectedRecordId(null);
    };
  
  return (
    <div className=" flex flex-col bg-[rgba(255,255,255,0.5)] rounded-lg items-center overflow-x-auto justify-center col-span-3 shadow-lg p-8 gap-10">
      <StepperComponent steps={steps} stepsCompleted={stepsCompleted || 0} />
      <div className="w-full mt-10 flex gap-3 lg:flex-col justify-around pr-3">
        {user.role === "CASHIER" && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-baseline justify-between w-full">
              <div> Payment ID:</div>
              <div>
                <input
                  onChange={(e) =>
                    setPaymentId((prev) => ({ ...prev, id: e.target.value }))
                  }
                  value={paymentId.id}
                  className="p-2 rounded-lg"
                ></input>
              </div>
            </div>
            <div className="flex items-baseline justify-between w-full">
              <div>Confirm Payment ID:</div>
              <div>
                <input
                  onChange={(e) =>
                    setPaymentId((prev) => ({
                      ...prev,
                      confirmId: e.target.value,
                    }))
                  }
                  value={paymentId.confirmId}
                  className="p-2 rounded-lg"
                ></input>
              </div>
            </div>
            <div className="justify-center flex w-full">
              <button
                className="p-3 px-4  mt-8 bg-[rgb(54,88,153)] rounded-lg text-white"
                onClick={() => {
                  if (paymentId.id !== paymentId.confirmId) {
                    toast.error("Payment ID does not match Confirm Payment ID");
                    return;
                  }
                  userRecord.payment.paymentId = paymentId.id;
                  userRecord.payment.status = "PAID";
                  console.log(userRecord);
                  try {
                    http.put("/reservation/" + id, userRecord);
                    toast.success("Payment Confirmed");
                    window.location.reload();
                  } catch (error) {
                    if (error.response?.data?.message)
                      toast.error(error.response.data.message);
                    else toast.error("Something went wrong");
                  }
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}
        {user.role !== "USER" &&
          // user.role !== "ADMIN" &&
          user.role !== "CASHIER" && (
            <>
              <button
                onClick={async () => {
                  try {
                    await http.put("/reservation/approve/" + id, {
                      comments,
                    });
                    toast.success("Reservation Approved");
                    window.location.reload();
                  } catch (error) {
                    if (error.response?.data?.message) {
                      toast.error(error.response.data);
                    } else {
                      toast.error("An error occurred");
                    }
                  }
                }}
                className="border rounded-lg p-3 px-4 bg-green-400 hover:bg-green-500"
              >
                Approve
              </button>
              <button
                // onClick={async () => {
                //   try {
                //     await http.put("/reservation/reject/" + id, {
                //       comments,
                //     });
                //     toast.success("Reservation Rejected");
                //     window.location.reload();
                //   } catch (error) {
                //     if (error.response?.data?.message) {
                //       toast.error(error.response.data);
                //     } else {
                //       toast.error("An error occurred");
                //     }
                //   }
                // }}
                onClick={async () => {
                  const trimmedComment = (comments || "").trim();
                  const lowerComment = trimmedComment.toLowerCase();
                
                  const isPlaceholderComment = 
                    lowerComment === "form edited by user" || 
                    lowerComment === "write any review or comments" || 
                    lowerComment === "";
                
                  if (!isPlaceholderComment) {
                    // If meaningful comment, reject directly
                    try {
                      await http.put(`/reservation/reject/${id}`, { reason: trimmedComment });
                      toast.success("Reservation Rejected");
                      window.location.reload();
                    } catch (error) {
                      if (error.response?.data?.message) {
                        toast.error(error.response.data.message);
                      } else {
                        toast.error("An error occurred");
                      }
                    }
                  } else {
                    // If placeholder comment, open the reject popup
                    handleRejectClick(id);
                  }
                }}
                
                className="border rounded-lg p-3 px-4 bg-red-400 hover:bg-red-500"
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  try {
                    await http.put("/reservation/hold/" + id, {
                      comments,
                    });
                    toast.success("Reservation put on hold");
                    window.location.reload();
                  } catch (error) {
                    if (error.response?.data?.message) {
                      toast.error(error.response.data);
                    } else {
                      toast.error("An error occurred");
                    }
                  }
                }}
                className="border rounded-lg p-3 px-4 bg-yellow-400 hover:bg-yellow-500"
              >
                Review
              </button>
            </>
          )}
      </div>
      <div className="w-full">
        {user.role !== "USER" &&
          // user.role !== "ADMIN" &&
          user.role !== "CASHIER" && (
            <textarea
              // disabled={user.role !== "ADMIN"}
              className="w-full p-2 bg-white border-gray-500 rounded-lg"
              rows={5}
              value={comments || ""}
              onChange={(e) =>
                setReviewers((prev) =>
                  prev.map((r) =>
                    r.role === user.role
                      ? { ...r, comments: e.target.value }
                      : r
                  )
                )
              }
              placeholder={"Write any review or comments"}
            ></textarea>
          )}
      </div>
      {openRejectDialog && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white p-6 rounded-lg w-[90%] md:w-[30rem] flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Reject Reason</h2>

      <select
        value={selectedRejectReason}
        onChange={handleReasonChange}
        className="p-2 border rounded-lg"
      >
        {rejectionReasons.map((reason) => (
          <option key={reason.id} value={reason.id}>
            {reason.reason}
          </option>
        ))}
      </select>

      {showCustomReasonField && (
        <textarea
          placeholder="Enter custom reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="p-2 border rounded-lg"
          rows={4}
        ></textarea>
      )}

      <div className="flex justify-end gap-4 mt-4">
        <button
          onClick={() => {
            setOpenRejectDialog(false);
            setSelectedRecordId(null);
            setSelectedRejectReason("0");
            setRejectReason("");
            setShowCustomReasonField(false);
          }}
          className="px-4 py-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleRejectConfirm}
          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
        >
          Confirm Reject
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Workflow;
