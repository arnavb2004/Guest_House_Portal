import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useParams } from "react-router-dom";
import Workflow from "../components/Workflow";
import { privateRequest } from "../utils/useFetch";
import { getDate, getTime } from "../utils/handleDate";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import InputLabel from '@mui/material/InputLabel';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
export default function AdminRecordPage() {
  const { id } = useParams();

  const user = useSelector((state) => state.user);

  const http = privateRequest(user.accessToken, user.refreshToken);

  const [status, setStatus] = useState("Loading");

  const [totalDiningFare, setTotalDiningFare] = useState(0);
  const [totalRoomFare, setTotalRoomFare] = useState(0);
  const [totalFare, setTotalFare] = useState(0);
  const [isEdit, setIsEdit] = useState(false);
  
  // States for admin annotation dialog
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    approvalAttached: "",
    confirmedRoomNo: "",
    entrySerialNo: "",
    entryPageNo: "",
    entryDate: "",
    bookingDate: "",
    checkInTime: "",
    checkOutTime: "",
    remarks: ""
  });
  const [adminFormSubmitting, setAdminFormSubmitting] = useState(false);

  const color = {
    PENDING: "bg-gray-400",
    APPROVED: "bg-green-400",
    REJECTED: "bg-red-400",
    HOLD: "bg-yellow-400",
  };

  const [reviewers, setReviewers] = useState([]);

  const [userRecord, setUserRecord] = useState({
    guestName: "",
    address: "",
    numberOfGuests: "",
    numberOfRooms: "",
    roomType: "",
    arrivalDate: "",
    departureDate: "",
    purpose: "",
    category: "",
  });
  const [checkedValues, setCheckedValues] = useState([]);

  const roles = [
    "DIRECTOR",
    "HOD",
    "DEAN",
    "REGISTRAR",
    "CHAIRMAN",
    "ASSOCIATE DEAN",
  ];

  const roomPricesB = { "Single Occupancy": 600, "Double Occupancy": 850 };
  const roomPricesC = { "Single Occupancy": 900, "Double Occupancy": 1250 };
  const roomPricesD = { "Single Occupancy": 1300, "Double Occupancy": 1800 };

  useEffect(() => {
    if (id) {
      http
        .get("/reservation/details/" + id)
        .then((res) => {
          if (res.status === 200) {
            setUserRecord(res.data.reservation);
            setReviewers(res.data.reservation.reviewers);
            
            // Initialize admin form data if available
            if (res.data.reservation.adminAnnotation) {
              const annotations = res.data.reservation.adminAnnotation;
              setAdminFormData({
                approvalAttached: annotations.approvalAttached || "",
                confirmedRoomNo: annotations.confirmedRoomNo || "",
                entrySerialNo: annotations.entrySerialNo || "",
                entryPageNo: annotations.entryPageNo || "",
                entryDate: annotations.entryDate
                ? new Date(annotations.entryDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : "",
                bookingDate: annotations.bookingDate
                ? new Date(annotations.bookingDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : "",
                checkInTime: annotations.checkInTime || "",
                checkOutTime: annotations.checkOutTime || "",
                remarks: annotations.remarks || ""
              });
            }
            
            setStatus("Success");
          }
        })
        .catch((err) => {});
    }
  }, [id]);

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setCheckedValues((prevCheckedValues) => [...prevCheckedValues, value]);
    } else {
      setCheckedValues((prevCheckedValues) =>
        prevCheckedValues.filter((item) => item !== value)
      );
    }
  };

  if (status === "Error") return <Navigate to="/404" />;
  else if (status === "Loading")
    return (
      <div className="flex h-full w-full text-xl font-semibold items-center justify-center">
        Loading...
      </div>
    );

  // Handle opening the admin annotation form
  const handleOpenAdminForm = () => {
    setAdminFormOpen(true);
  };

  // Handle closing the admin annotation form
  const handleCloseAdminForm = () => {
    setAdminFormOpen(false);
  };

  // Handle admin form field changes
  const handleAdminFormChange = (e) => {
    const { name, value } = e.target;
    setAdminFormData({
      ...adminFormData,
      [name]: value
    });
  };

  // Handle admin form submission
  const handleAdminFormSubmit = async () => {
    try {
      setAdminFormSubmitting(true);
      
      // Send the updated admin annotations to the server
      const response = await http.put(`/reservation/admin-annotations/${id}`, adminFormData);
      
      if (response.status === 200) {
        // Update the local state with the new data
        setUserRecord(prev => ({
          ...prev,
          adminAnnotation: response.data.reservation.adminAnnotation
        }));
        
        // Regenerate the PDF with updated annotations
        try {
          // Get fresh reservation data to ensure we have all fields including annotations
          const updatedReservationResponse = await http.get(`/reservation/details/${id}`);
          if (updatedReservationResponse.status === 200) {
            const reservationData = updatedReservationResponse.data.reservation;
            
            // Generate new PDF with updated data
            const { updateFilledPDF } = await import('../utils/generatePDF');
            const newPdfBlob = await updateFilledPDF(reservationData);
            
            if (newPdfBlob) {
              // Create FormData to upload the new PDF
              const formData = new FormData();
              formData.append('receipt', new File([newPdfBlob], `receipt_${id}_updated.pdf`, { type: 'application/pdf' }));
              
              // Update the receipt file on the server
              await http.put(`/reservation/update-receipt/${id}`, formData);
              
              // Success notification
              toast.success("Annotations saved and PDF updated successfully!");
            }
          }
        } catch (pdfError) {
          console.error("Error regenerating PDF:", pdfError);
          toast.warning("Annotations saved but there was an issue updating the PDF.");
        }
        
        setAdminFormOpen(false);
      }
    } catch (error) {
      console.error("Error saving admin annotations:", error);
      toast.error("Failed to save annotations: " + (error.response?.data?.message || error.message));
    } finally {
      setAdminFormSubmitting(false);
    }
  };

  const handleChange = (e) => {
    console.log(e.target.name, e.target.value);
    setUserRecord({ ...userRecord, [e.target.name]: e.target.value });
  };
  const getTime2 = (dateString) => {
    const date = new Date(dateString);

    // Extracting hours, minutes, and seconds
    const hours24 = date.getHours();
    const minutes = ("0" + date.getMinutes()).slice(-2); // Add leading zero if needed

    // Converting to 12-hour format
    const hours12 = ("0" + hours24).slice(-2);

    // Formatting time in 12-hour clock format
    const time = `${hours12}:${minutes}`;

    return time;
  };

  return (
    <>
      <div className="mx-9 mt-9 flex gap-5">
        {user.role === "ADMIN" && (
          <Link
            state={{ userRecord: userRecord }}
            className="p-2 bg-[rgb(54,88,153)] rounded-lg text-white"
            to={"rooms"}
          >
            Room Booking
          </Link>
        )}
        {user.role === "ADMIN" && userRecord.byAdmin && (
          <div
            className="p-2 px-4 bg-[rgb(54,88,153)] rounded-lg text-white cursor-pointer"
            onClick={() => setIsEdit(!isEdit)}
          >
            {isEdit ? (
              <div className="flex items-center">
                <SaveIcon
                  fontSize="small"
                  onClick={async () => {
                    try {
                      const response = await http.put(
                        `/reservation/${id}`,
                        userRecord
                      );
                      console.log(response.data);
                      setIsEdit(false);
                    } catch (error) {}
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center">
                <EditIcon fontSize="small" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-8 m-9 gap-4">
        <Workflow
          id={id}
          userRecord={userRecord}
          setUserRecord={setUserRecord}
          reviewers={reviewers}
          setReviewers={setReviewers}
        />

        {userRecord.byAdmin && isEdit ? (
          <div className='col-span-5 shadow-lg flex flex-col overflow-auto justify-center gap-4 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg pt-4'>
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Guest Name:</p>
              <input
                name="guestName"
                className="px-2 border-gray-700 rounded-md"
                value={userRecord.guestName}
                onChange={handleChange}
              ></input>
              {/* <p className="p-2 text-lg">{userRecord.guestName}</p> */}
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Number Of Guests:</p>
              <input
                name="numberOfGuests"
                className="px-2 border-gray-700 rounded-md"
                value={userRecord.numberOfGuests}
                onChange={handleChange}
              ></input>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Number Of Rooms:</p>
              <input
                name="numberOfRooms"
                className="px-2 border-gray-700 rounded-md"
                value={userRecord.numberOfRooms}
                onChange={handleChange}
              ></input>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Room Type</p>
              <select
                name="roomType"
                className=" h-12 border-2 rounded-md border-gray-700 p-2 whitespace-pre"
                onChange={handleChange}
                value={userRecord.roomType}
              >
                <option className="" value="Single Occupancy">
                  Single Occupancy
                </option>
                <option className="" value="Double Occupancy">
                  Double Occupancy
                </option>
              </select>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Arrival Date</p>
              <input
                type="date"
                name="arrivalDate"
                value={userRecord.arrivalDate.split("T")[0]}
                className="border-gray-700 rounded-md px-2"
                onChange={(e) =>
                  setUserRecord((prev) => ({
                    ...prev,
                    arrivalDate:
                      e.target.value + "T" + prev.arrivalDate.split("T")[1],
                  }))
                }
              />
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Arrival Time:</p>
              <input
                type="time"
                name="arrivalTime"
                className="px-2 border-gray-700 rounded-md"
                value={getTime2(userRecord.arrivalDate)}
                onChange={(e) =>
                  setUserRecord((prev) => ({
                    ...prev,
                    arrivalDate:
                      prev.arrivalDate.split("T")[0] + "T" + e.target.value,
                  }))
                }
              ></input>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Departure Date:</p>
              <input
                type="date"
                name="departureDate"
                className="border-gray-700 rounded-md px-2"
                value={userRecord.departureDate.split("T")[0]}
                onChange={(e) =>
                  setUserRecord((prev) => ({
                    ...prev,
                    departureDate:
                      e.target.value + "T" + prev.departureDate.split("T")[1],
                  }))
                }
              />
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Departure Time:</p>
              <input
                type="time"
                name="departureTime"
                className="px-2 border-gray-700 rounded-md"
                value={getTime2(userRecord.departureDate)}
                onChange={(e) =>
                  setUserRecord((prev) => ({
                    ...prev,
                    departureDate:
                      prev.departureDate.split("T")[0] + "T" + e.target.value,
                  }))
                }
              ></input>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Purpose:</p>
              <input
                name="purpose"
                className="px-2 border-gray-700 rounded-md"
                value={userRecord.purpose}
                onChange={handleChange}
              ></input>
            </div>
            <hr />
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Category:</p>
              <p className="p-2 text-lg">{userRecord.category}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Room Fare:</p>
              <p className="p-2 text-lg">
                Rs. {userRecord.payment.amount || 0}/- only
              </p>
            </div>
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Dining Fare:</p>
              <p className="p-2 text-lg">Rs. {totalDiningFare}/- only</p>
            </div>
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Total Amount:</p>
              <p className="p-2 text-lg">
                Rs. {totalDiningFare + (userRecord.payment.amount || 0)}/- only
              </p>
            </div>
          </div>
        ) : (
          <div className='col-span-5 shadow-lg flex flex-col overflow-auto justify-center gap-4 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg pt-4'>
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Guest Name:</p>
              <p className="p-2 text-lg">{userRecord.guestName}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Address:</p>
              <p className="p-2 text-lg">{userRecord.address}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Number Of Guests:</p>
              <p className="p-2 text-lg">{userRecord.numberOfGuests}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Number Of Rooms:</p>
              <p className="p-2 text-lg">{userRecord.numberOfRooms}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Room Type</p>
              <p className="p-2 text-lg">{userRecord.roomType}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Arrival Date</p>
              <p className="p-2 text-lg">{getDate(userRecord.arrivalDate)}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Arrival Time:</p>

              <p className="p-2 text-lg">{getTime(userRecord.arrivalDate)}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Departure Date:</p>
              <p className="p-2 text-lg">{getDate(userRecord.departureDate)}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Departure Time:</p>
              <p className="p-2 text-lg">{getTime(userRecord.departureDate)}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32">
              <p className="p-2 text-xl font-semibold">Purpose:</p>
              <p className="p-2 text-lg">{userRecord.purpose}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Category:</p>
              <p className="p-2 text-lg">{userRecord.category}</p>
            </div>
            <hr />
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Room Fare:</p>
              <p className="p-2 text-lg">
                Rs. {userRecord.payment.amount || 0}/- only
              </p>
            </div>
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Dining Fare:</p>
              <p className="p-2 text-lg">Rs. {totalDiningFare}/- only</p>
            </div>
            <div className="flex justify-between px-32 pb-5">
              <p className="p-2 text-xl font-semibold">Total Amount:</p>
              <p className="p-2 text-lg">
                Rs. {(userRecord.payment.amount || 0) + totalDiningFare}/- only
              </p>
            </div>
          </div>
        )}
      </div>
      <div className='col-span-5 md:flex-col overflow-auto shadow-lg flex justify-between p-5  gap-4 m-9 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg'>
        <div>
          <div className="flex justify-between items-center">
            <div className="text-2xl font-semibold font-['Dosis'] px-5">
              Status
            </div>
            {user.role === "ADMIN" && (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleOpenAdminForm}
                className="mr-5"
              >
                Update Reservation Form
              </Button>
            )}
          </div>
          <div className="p-5 flex flex-col gap-4 ">
            {reviewers.map((reviewer) => (
              <div className="flex gap-4 w-max">
                <div className="w-56">{reviewer.role}</div>
                <div
                  className={
                    "border rounded-full relative top-1 w-5 h-5 " +
                    color[reviewer.status]
                  }
                ></div>
                <div className="w-72">{reviewer.comments}</div>
              </div>
            ))}
          </div>
        </div>
        {userRecord.bookings?.length > 0 && (
          <div>
            <div className="text-2xl text-center font-semibold font-['Dosis'] px-5">
              Rooms Assigned
            </div>
            <div className="p-5 flex flex-col gap-4 ">
              <div className="flex gap-4 font-semibold text-center">
                <div className="w-24">Start Date</div>
                <div className="w-24">End Date</div>
                <div className="w-24">Room Number</div>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-28">
                {userRecord.bookings.map((booking) => (
                  <div className="flex gap-4 text-center">
                    <div className="w-24">{getDate(booking.startDate)}</div>
                    <div className="w-24">{getDate(booking.endDate)}</div>
                    <div className="w-20">{booking.roomNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Admin Annotation Dialog */}
      <Dialog 
        open={adminFormOpen} 
        onClose={handleCloseAdminForm}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Update Reservation Form</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide additional information to update the reservation PDF form.
          </DialogContentText>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Question 1 */}
            <FormControl component="fieldset" className="mb-4">
              <FormLabel>1. Approval from competent authority is attached</FormLabel>
              <RadioGroup
                name="approvalAttached"
                value={adminFormData.approvalAttached}
                onChange={handleAdminFormChange}
                row
              >
                <FormControlLabel value="YES" control={<Radio />} label="YES" />
                <FormControlLabel value="NO" control={<Radio />} label="NO" />
              </RadioGroup>
            </FormControl>
            
            {/* Question 2 */}
            <TextField
              label="2. Confirmed Room No"
              name="confirmedRoomNo"
              value={adminFormData.confirmedRoomNo}
              onChange={handleAdminFormChange}
              fullWidth
              margin="normal"
            />
            
            {/* Question 3 */}
            <div className="flex gap-4">
              <TextField
                label="3. Entered at Sr. No"
                name="entrySerialNo"
                value={adminFormData.entrySerialNo}
                onChange={handleAdminFormChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="and Page No"
                name="entryPageNo"
                value={adminFormData.entryPageNo}
                onChange={handleAdminFormChange}
                fullWidth
                margin="normal"
              />
            </div>
            
            {/* Question 4 */}
            <TextField
              label="4. Date of Entry"
              name="entryDate"
              type="date"
              value={adminFormData.entryDate}
              onChange={handleAdminFormChange}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            {/* Question 5 */}
            <div className="col-span-2">
              <div className="flex gap-4">
                <TextField
                  label="5. Date of Booking"
                  name="bookingDate"
                  type="date"
                  value={adminFormData.bookingDate}
                  onChange={handleAdminFormChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Check-in Time"
                  name="checkInTime"
                  type="time"
                  value={adminFormData.checkInTime}
                  onChange={handleAdminFormChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Check-out Time"
                  name="checkOutTime"
                  type="time"
                  value={adminFormData.checkOutTime}
                  onChange={handleAdminFormChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </div>
            </div>
            
            {/* Question 6 */}
            <TextField
              label="6. Remarks"
              name="remarks"
              value={adminFormData.remarks}
              onChange={handleAdminFormChange}
              fullWidth
              margin="normal"
              multiline
              rows={3}
              className="col-span-2"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdminForm}>Cancel</Button>
          <Button 
            onClick={handleAdminFormSubmit} 
            variant="contained" 
            disabled={adminFormSubmitting}
          >
            {adminFormSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* <div className='col-span-5 md:flex-col overflow-auto shadow-lg flex justify-between  p-5  gap-4 m-9 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg'>
        
      </div> */}
    </>
  );
}
