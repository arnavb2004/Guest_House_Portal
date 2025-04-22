import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios"; // Assuming you use axios for API requests
import Workflow from "../components/Workflow";
import { privateRequest } from "../utils/useFetch";
import { getDate, getTime } from "../utils/handleDate";
import LogoutIcon from "@mui/icons-material/Logout";
import { IconButton } from "@mui/material";
import { toast } from "react-toastify";



export default function RecordPage() {
  const { id } = useParams();

  const user = useSelector((state) => state.user);
  const [reviewers, setReviewers] = useState([]);
  const navigate = useNavigate();
  const color = {
    PENDING: "bg-gray-400",
    APPROVED: "bg-green-400",
    REJECTED: "bg-red-400",
    HOLD: "bg-yellow-400",
  };

  const http = privateRequest(user.accessToken, user.refreshToken);

  const [status, setStatus] = useState("Loading");

  const [totalDiningFare, setTotalDiningFare] = useState(0);

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


  const roomPricesB = { 'Single Occupancy': 600, 'Double Occupancy': 850 }
  const roomPricesC = { 'Single Occupancy': 900, 'Double Occupancy': 1250 }
  const roomPricesD = { 'Single Occupancy': 1300, 'Double Occupancy': 1800 }



  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await http.get(`/reservation/${id}`);
        console.log("I am response:");
        console.log(response.data.reservation);
        setStatus("Success");
        setUserRecord(response.data.reservation);
        setReviewers(response.data.reservation.reviewers);

      } catch (error) {
        setStatus("Error");
        console.error("Error fetching user data:", error);
      }
    };

    const getDiningAmount = async () => {
      try {
        const response = await http.post(`/reservation/${id}`, {
          id: id
        });
        setTotalDiningFare(response.data.totalAmount)
      }
      catch (error) {
        setStatus("Error");
        console.error("Error total Dining Amount:", error);
      }
    }

    getDiningAmount();

    fetchRecord();
  }, [id]);


  if (status === "Error") return <Navigate to="/404" />;
  else if (status === "Loading")
    return (
      <div className="flex h-full w-full text-xl font-semibold items-center justify-center">
        Loading...
      </div>
    );

  return (
    <>
    {userRecord && (

<div className="flex justify-center py-5">

  <button

    className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"

    onClick={async () => {

      if (userRecord.bookings?.length > 0) {

        return toast.error("Cannot withdraw after booking a room.");

      }

    

      try {

        console.log("id ", userRecord._id);

        const response = await http.delete(`/reservation/withdraw/${userRecord._id}`);

        

        toast.success("Application withdrawn successfully!");

        navigate("..");

      } catch (error) {

        console.error("Error withdrawing application:", error);

        toast.error(error.message);

      }

    }}            

  >

    Withdraw Application

  </button>

</div>

)}


      <div className="grid grid-cols-8 m-9 gap-4 md:flex">
        <Workflow
          id={id}
          userRecord={userRecord}
          setUserRecord={setUserRecord}
          reviewers={reviewers}
          setReviewers={setReviewers}
        />
        {/* <h1>{id}</h1> */}

        <div className='col-span-5 shadow-lg flex flex-col overflow-x-auto justify-center gap-4 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg pt-4'>
          <div className="flex justify-between px-32">
            <p className="p-1 text-xl font-semibold">Guest Name:</p>
            <p className="p-1 text-lg">{userRecord.guestName}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Address:</p>
            <p className="p-0 text-lg">{userRecord.address}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Number Of Guests:</p>
            <p className="p-0 text-lg">{userRecord.numberOfGuests}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Number Of Rooms:</p>
            <p className="p-0 text-lg">{userRecord.numberOfRooms}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Room Type</p>
            <p className="p-0 text-lg">{userRecord.roomType}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Arrival Date</p>
            <p className="p-0 text-lg">{getDate(userRecord.arrivalDate)}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Arrival Time:</p>
            <p className="p-0 text-lg">{getTime(userRecord.arrivalDate)}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Departure Date:</p>
            <p className="p-0 text-lg">{getDate(userRecord.departureDate)}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Departure Time:</p>
            <p className="p-0 text-lg">{getTime(userRecord.departureDate)}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32">
            <p className="p-0 text-xl font-semibold">Purpose:</p>
            <p className="p-0 text-lg">{userRecord.purpose}</p>
          </div>
          <hr />
          <div className="flex justify-between px-32 ">
            <p className="p-0 text-xl font-semibold">Category:</p>
            <p className="p-0 text-lg">{userRecord.category}</p>
          </div>

          <hr />
          <div className="flex justify-between px-32 pb-5">
            <p className="p-0 text-xl font-semibold">Room Fare:</p>
            <p className="p-0 text-lg">Rs. {userRecord.payment.amount}/- only</p>
          </div>
          <div className="flex justify-between px-32 pb-5">
            <p className="p-0 text-xl font-semibold">Dining Fare:</p>
            <p className="p-0 text-lg">Rs. {totalDiningFare}/- only</p>
          </div>
          <div className="flex justify-between px-32 pb-5">
            <p className="p-0 text-xl font-semibold">Total Amount:</p>
            <p className="p-0 text-lg">Rs. {userRecord.payment.amount + totalDiningFare}/- only</p>
          </div>
          <div className="flex justify-between px-32 pb-5">
          {user.role === "CASHIER" &&
              userRecord.payment.status === "PAID" &&
              !userRecord.checkOut && <p className="p-0 text-xl font-semibold">checkout user:</p> }
            {user.role === "CASHIER" &&
              userRecord.payment.status === "PAID" &&
              !userRecord.checkOut && (
                <IconButton>
                  <LogoutIcon
                    onClick={async () => {
                      try {
                        const res = await http.put(
                          "/reservation/checkout/" + userRecord._id
                        );
                        toast.success("Checked out successfully");
                        window.location.reload();
                      } catch (error) {
                        console.log(error);
                        toast.error(error.response?.data?.message);
                      }
                    }}
                    color="black"
                  />
                </IconButton>
              )}
          </div>
        </div>
      </div>
      <div className='col-span-5 md:flex-col overflow-auto md:gap-8 shadow-lg flex p-5 justify-betrween m-9 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg'>
        <div>
          <div className="text-2xl font-semibold font-['Dosis'] px-5">
            Status
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
      {/* <div className='col-span-5 md:flex-col overflow-auto md:gap-8 shadow-lg flex p-5 gap-2 m-9 font-["Dosis"] bg-[rgba(255,255,255,0.5)] rounded-lg'>
        <div>
          <div className="text-2xl font-semibold font-['Dosis'] px-5">
            Payment
          </div>


        </div>
      </div> */}
    </>
  );
}
