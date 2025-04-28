import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { privateRequest } from "../utils/useFetch";

const RoomDataList = () => {
  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(startDate.getDate() + 9)));
  const [occupancyFilter, setOccupancyFilter] = useState("all");
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await http.get("/reservation/room-details");
        setRooms(response.data);
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };
    fetchRooms();
  }, []);

  const generateDates = () => {
    const dates = [];
    let current = new Date(startDate);
    
    while (current.getTime() <= endDate.getTime()) {  // Ensure inclusion of endDate
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    // console.log("dates" , dates);
    const formattedEndDate = endDate.toISOString().split("T")[0];
    if (!dates.includes(formattedEndDate)) {
      dates.push(formattedEndDate);
    }    return dates;
  };
  

  const dates = generateDates();

  const filteredRooms = rooms.filter((room) => {
    if (occupancyFilter !== "all") {
      const roomTypeLower = room.roomType?.toLowerCase();
      if (occupancyFilter === "single" && !roomTypeLower.includes("single")) return false;
      if (occupancyFilter === "double" && !roomTypeLower.includes("double")) return false;
      if (occupancyFilter === "suite" && !roomTypeLower.includes("suite")) return false;
      if (occupancyFilter === "executive" && !roomTypeLower.includes("executive")) return false;
      if (occupancyFilter === "single suite" && !roomTypeLower.includes("single suite")) return false;
        if (occupancyFilter === "double suite" && !roomTypeLower.includes("double suite")) return false;
        if (occupancyFilter === "single executive" && !roomTypeLower.includes("single executive")) return false;
        if (occupancyFilter === "double executive" && !roomTypeLower.includes("double executive")) return false;

        
    }
    if (searchQuery && !room.roomNumber.toString().toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const reservationColors = {};
  const generateRandomColor = () => `hsl(${Math.random() * 360}, 70%, 70%)`;

  const getBookingCellData = (room, date) => {
    const booking = room.bookings.find(
      (booking) =>
        new Date(booking.startDate) <= new Date(date) &&
        new Date(booking.endDate) >= new Date(date)
    );

    if (booking) {
      if (!reservationColors[booking.purpose]) {
        reservationColors[booking.purpose] = generateRandomColor();
      }
      return {
        purpose: booking.purpose,
        color: reservationColors[booking.purpose],
      };
    }
    return null;
  };

  return (
    <div className="w-full px-9 overflow-y-auto">
      <h1 className="text-3xl font-bold text-center my-6">Room Booking Details</h1>
      <div className="flex flex-wrap gap-4 justify-between mb-6">
        <input
          type="text"
          placeholder="Search by Room Number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded-lg p-2 w-1/4"
        />
        <button
          onClick={() => {
            const today = new Date();
            setStartDate(today);
            setEndDate(new Date(today.getTime()));
            setClicked(true);
          }}
          className={`${
            clicked
              ? "bg-green-600"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white px-4 py-2 rounded-lg transition-colors duration-200`}        >
          Current Date
        </button>
        <select
          value={occupancyFilter}
          onChange={(e) => setOccupancyFilter(e.target.value)}
          className="border rounded-lg p-2 w-1/4"
        >
          <option value="all">All Rooms</option>
          <option value="suite">Suite Room</option>
          <option value="executive">Executive Room</option>
          <option value="single">Single Occupancy</option>
          <option value="double">Double Occupancy</option>
          <option value="single suite">Single Suite</option>
            <option value="double suite">Double Suite</option>
            <option value="single executive">Single Executive</option>
            <option value="double executive">Double Executive</option>

        </select>
        <input
          type="date"
          value={startDate.toISOString().split("T")[0]}
          onChange={(e) => setStartDate(new Date(e.target.value))}
          className="border rounded-lg p-2"
        />
        <input
          type="date"
          value={endDate.toISOString().split("T")[0]}
          onChange={(e) => setEndDate(new Date(e.target.value))}
          className="border rounded-lg p-2"
        />
      </div>
      <div className="overflow-auto">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="border p-2">Date</th>
              {filteredRooms.map((room) => (
                <th key={room._id} className="border p-2">Room {room.roomNumber}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date, dateIndex) => {
              return (
                <tr key={date}>
                  <td className="border p-2 font-bold">{date}</td>
                  {filteredRooms.map((room) => {
                    if (dateIndex > 0) {
                      const prevBooking = getBookingCellData(room, dates[dateIndex - 1]);
                      const currentBooking = getBookingCellData(room, date);
                      if (
                        prevBooking &&
                        currentBooking &&
                        prevBooking.purpose === currentBooking.purpose
                      ) {
                        return null; // Skip merging duplicate consecutive bookings
                      }
                    }
                    let span = 1;
                    while (
                      dateIndex + span < dates.length &&
                      getBookingCellData(room, dates[dateIndex + span])?.purpose ===
                        getBookingCellData(room, date)?.purpose
                    ) {
                      span++;
                    }
                    const bookingData = getBookingCellData(room, date);
                    return bookingData ? (
                      <td
                        key={room._id + date}
                        className="border p-2 text-center"
                        style={{ backgroundColor: bookingData.color }}
                        rowSpan={span}
                      >
                        {bookingData.purpose}
                      </td>
                    ) : (
                      <td key={room._id + date} className="border p-2"></td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-4 my-6">
        <button
          onClick={() => {
            const newStart = new Date(startDate);
            newStart.setDate(startDate.getDate() - 10);
            setStartDate(newStart);
            setEndDate(new Date(newStart.getTime() + 9 * 24 * 60 * 60 * 1000));
          }}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          Previous 10 Days
        </button>

        <button
          onClick={() => {
            const today = new Date();
            setStartDate(today);
            setEndDate(new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000));
            setClicked(false);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Reset to Current 10 Days
        </button>

        <button
          onClick={() => {
            const newStart = new Date(startDate);
            newStart.setDate(startDate.getDate() + 10);
            setStartDate(newStart);
            setEndDate(new Date(newStart.getTime() + 9 * 24 * 60 * 60 * 1000));
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Next 10 Days
        </button>
      </div>
    </div>
  );
};

export default RoomDataList;
