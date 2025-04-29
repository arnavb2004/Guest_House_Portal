import React, { useEffect, useState } from "react";
import "./RoomBooking.css";
import { toast } from "react-toastify";
import { privateRequest } from "../utils/useFetch";
import { useSelector } from "react-redux";
import { getDate } from "../utils/handleDate";
import { useLocation, useParams } from "react-router-dom";
import RoomList from "../components/RoomList";

const RoomBooking = () => {
  const params = useParams();
  const id = params.id;
  const userRecord = useLocation().state.userRecord;
  const guestName = userRecord.guestName;
  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);
  const room_allot = userRecord.numberOfRooms;
  const category = userRecord.category;
  const room_type = userRecord.roomType;
  const [roomsData, setRoomsData] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomList, setRoomList] = useState([]);
  const [counter, setCounter] = useState(0);
  const [startDate, setStartDate] = useState(new Date(userRecord.arrivalDate).toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(userRecord.departureDate).toISOString().substring(0, 10));

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    setCounter(roomList.length);
  }, [roomList]);

  useEffect(() => {
    handleFilter();
  }, [startDate, endDate, roomsData]);

  const fetchRooms = async () => {
    try {
      const res = await http.get("/reservation/rooms");
      const reservation = await http.get("/reservation/details/" + id);
      setRoomsData(res.data);
      setRoomList(reservation.data.reservation.bookings);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error(error.response?.data?.message || "Failed to fetch rooms");
    }
  };

  const convertToDate = (date) => new Date(new Date(date).toISOString());

  const handleFilter = () => {
    if (endDate < startDate || !startDate || !endDate) {
      toast.error("Enter valid start and end dates");
      return;
    }

    const updatedRooms = roomsData.map((room) => {
      const filteredBookings = room.bookings.filter((booking) =>
        convertToDate(booking.startDate) < convertToDate(endDate) &&
        convertToDate(booking.endDate) > convertToDate(startDate)
      );
      return { ...room, bookings: filteredBookings };
    });

    setRooms(updatedRooms);
  };

  const groupedRooms = rooms.reduce((acc, room) => {
    if (!acc[room.roomType]) acc[room.roomType] = [];
    acc[room.roomType].push(room);
    return acc;
  }, {});

  const addRoom = (room) => {
    if (startDate && endDate) {
      let tempRoomList = [...roomList];
      let temp = tempRoomList.some(
        (currRoom) => room.roomNumber === currRoom.roomNumber &&
          convertToDate(currRoom.startDate) < convertToDate(endDate) &&
          convertToDate(currRoom.endDate) > convertToDate(startDate)
      );

      if (temp) {
        toast.error("Room already added for this period");
        return;
      }

      const newRoom = { user: guestName, startDate, endDate, roomNumber: room.roomNumber };
      console.log("New Room:", newRoom);
      setRoomList((prev) => [...prev, newRoom]);
    } else {
      toast.error("Select Start and End Date");
    }
  };

  return (
    <div className="room-booking h-fit">
      <h2 className="room-heading text-4xl font-bold">Room Booking</h2>
      <h3 className="text-lg font-semibold">Room Type : {category.includes("BR")? "Executive Room" : "Suite" } </h3>
      <h3 className="text-lg font-semibold">Number of rooms requested : {room_allot}</h3>
      <h3 className="text-lg font-semibold mg-4 mb-4">Room Type requested : {room_type}</h3>
      <div className="filter-container">
        <label className="filter-label">Start Date:</label>
        <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="filter-input" />
        <label className="filter-label">End Date:</label>
        <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="filter-input" />
      </div>
      {Object.keys(groupedRooms).map((type) => (
        <div key={type} className="mb-6">
          <h2 className="text-xl font-semibold text-center mb-4">{type}</h2>
          <div className="room-grid">
            {groupedRooms[type].map((room) => (
              <div key={room.id} className={`room ${room.bookings.length > 0 ? "booked-during-range cursor-not-allowed bg-gray-400 text-white rounded-lg" : "available cursor-pointer border-[3px] border-green-500  rounded-lg"}`}>
                <div className="room-info" onClick={() => {                                                                                                                                                                                                     
                  if (counter < room_allot) {
                    setCounter((prev) => {
                      const newCounter = prev + 1;
                      if (newCounter <= room_allot) {
                        addRoom(room);
                        toast.success("Room added successfully");
                      } else {
                        toast.error("Allotting more rooms than allowed");
                      }
                      return newCounter;
                    });
                  } else {
                    toast.error("Allotting more rooms than allowed");
                  }
                }}>
                  <h3>{room.roomNumber}</h3>
                  {room.bookings.length > 0 && (
                    <div className="booking-info">
                      {room.bookings.toReversed().map((booking) => (
                        <div key={"info-" + room.roomNumber} className="py-1">
                          <p>Booked from: {getDate(booking.startDate)} to {getDate(booking.endDate)}</p>
                          <p>User: {booking.user}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <RoomList roomList={roomList} counter={counter} setCounter={setCounter} setRoomList={setRoomList} id={id} />
    </div>
  );
};

export default RoomBooking;
