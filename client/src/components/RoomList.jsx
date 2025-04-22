import React, { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getDate } from "../utils/handleDate";
import { privateRequest } from "../utils/useFetch";
import "react-toastify/dist/ReactToastify.min.css";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export default function RoomList({ roomList, setRoomList, id, counter, setCounter }) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  console.log("RoomList", roomList);
  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);
  const navigate = useNavigate();
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // Adjust for timezone
    return date.toISOString().split("T")[0]; // Keep only YYYY-MM-DD
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // Adjust for timezone
    return date.toISOString().split("T")[1].slice(0, 5); // Extract HH:MM
  };
  
  const deleteRoom = async (room) => {
    try {
      const updatedRoomList = roomList.filter((currRoom) => currRoom !== room);
      await http.put(`/reservation/rooms/${id}/remove`, { roomNumber: room.roomNumber });

      setRoomList(updatedRoomList);
      setCounter((counter) => counter - 1);
      toast.success(`Room ${room.roomNumber} unassigned successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unassign room. Please try again.");
    }
  };

  const handleEditClick = (room) => {
    // console.log("Edit room",)
    setEditData({ ...room });
    setOpen(true);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    try {
      console.log("editdata ", editData);
      await http.put(`/reservation/rooms/${id}/update`, editData);
      
      setRoomList((prevList) =>
        prevList.map((room) => (room.roomNumber === editData.roomNumber ? editData : room))
      );

      toast.success(`Room ${editData.roomNumber} updated successfully`);
      setOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update room. Please try again.");
    }
  };

  return (
    <>
      <div className="room-list flex flex-col gap-4 m-4 p-2 h-1/8 overflow-y-auto">
        {roomList.length > 0 && (
          <>
            <div className="flex justify-center text-3xl font-bold">Room List</div>
            <div className="grid grid-cols-12 font-semibold text-xl">
              <div className="col-span-2">Guest Name</div>
              <div className="col-span-3">Arrival Date</div>
              <div className="col-span-3">Departure Date</div>
              <div className="col-span-2">Room Number</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
            {roomList.map((room) => (
              <div className="grid grid-cols-12 items-center border-b p-2" key={room.roomNumber}>
                <div className="col-span-2">{room.user}</div>
                <div className="col-span-3">{getDate(room.startDate)}</div>
                <div className="col-span-3">{getDate(room.endDate)}</div>
                <div className="col-span-2">{room.roomNumber}</div>
                <div className="col-span-1">
                  <DeleteIcon className="text-gray-700 cursor-pointer" onClick={() => deleteRoom(room)} />
                </div>
                <div className="col-span-1">
                  <EditIcon className="text-gray-700 cursor-pointer" onClick={() => handleEditClick(room)} />
                </div>
              </div>
            ))}
          </>
        )}

        <div className="flex justify-center">
          <button
            className="p-2 w-fit bg-[rgb(54,88,153)] rounded-lg text-white mr-16"
            onClick={async () => {
              try {
                toast.success("Room assigned Successfully");
                await http.put("/reservation/rooms/" + id, roomList);
                window.location.reload();
              } catch (err) {
                toast.error(err.response?.data?.message || "Something went wrong. Please try again later.");
              }
            }}
          >
            Assign Rooms
          </button>
        </div>
      </div>

      {/* Edit Room Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box className="bg-white p-6 rounded-lg shadow-lg w-1/3 mx-auto mt-20">
          <h2 className="text-center text-xl font-bold mb-4">Edit Room</h2>
          <TextField
            label="Guest Name"
            name="user"
            value={editData?.user || ""}
            onChange={handleEditChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Arrival Date"
            name="startDate"
            type="date"
            value={formatDate(editData?.startDate) || ""}
            onChange={handleEditChange}
            fullWidth
            margin="normal"
          />
         
          <TextField
            label="Departure Date"
            name="endDate"
            type="date"
            value={formatDate(editData?.endDate) || ""}
            onChange={handleEditChange}
            fullWidth
            margin="normal"
          />
         
          <div className="flex justify-between mt-4">
            <Button variant="contained" color="primary" onClick={saveEdit}>
              Save Changes
            </Button>
            <Button variant="outlined" color="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Box>
      </Modal>
    </>
  );
}
