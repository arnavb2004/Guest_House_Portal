import React, { useEffect, useState } from "react";
import { privateRequest } from "../utils/useFetch";
import "./AddRoom.css";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getDate } from "../utils/handleDate";

import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import { useNavigate } from "react-router-dom"

const style = {
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	width: 400,
	bgcolor: "background.paper",
	boxShadow: 24,
	p: 4,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 2,
};

export default function AddRoom() {
	const [rooms, setRooms] = useState([]);
	const [hoverOverRoom, setHoverOverRoom] = useState();
	const [open, setOpen] = useState(false);
	const [roomNumber, setRoomNumber] = useState("");
	const [roomType, setRoomType] = useState("");

	const user = useSelector((state) => state.user);
	const http = privateRequest(user.accessToken, user.refreshToken);
	const navigate = useNavigate();

	const fetchRooms = async () => {
		try {
			const res = await http.get("/reservation/rooms");
			const updatedRooms = res.data.map((room) => {
				const currentDate = new Date();
				if (room.bookings.length > 0) {
					room.bookings.sort(
						(a, b) => new Date(a.endDate) - new Date(b.endDate)
					);
					const lastBooking = room.bookings[room.bookings.length - 1];
					if (new Date(lastBooking.endDate) < currentDate) {
						room.bookings = []; // Mark room as available
					}
				}
				return room;
			});
			setRooms(updatedRooms);
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to fetch rooms");
		}
	};

	const addRoom = async () => {
		const roomExists = rooms.some((room) => room.roomNumber === parseInt(roomNumber));
		if (roomExists) {
			toast.error("Room with this number already exists");
			return;
		}
		try {
			const response = await http.post("/reservation/rooms", {
				roomNumber,
				roomType
			});
			const newRoom = response.data.room;
			const updatedRooms = [...rooms, newRoom].sort((a, b) => a.roomNumber - b.roomNumber);
			setRooms(updatedRooms);
			toast.success(response.data.message);
			setRoomNumber("");
			setOpen(false);
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to add room");
		}
	};

	const deleteRoom = async (roomId) => {
		try {
			const response = await http.delete("/reservation/rooms", {
				data: { roomId }
			});
			setRooms(rooms.filter((room) => room._id !== roomId));
			toast.success(response.data.message);
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to delete room");
		}
	};

	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	useEffect(() => {
		fetchRooms();
	}, []);

	useEffect(() => {
		setHoverOverRoom(Array(rooms.length).fill(false));
	}, [rooms]);

	const groupedRooms = rooms.reduce((acc, room) => {
		if (!acc[room.roomType]) acc[room.roomType] = [];
		acc[room.roomType].push(room);
		return acc;
	}, {});

	return (
		<div className="flex flex-col mt-5 gap-6">
			{Object.keys(groupedRooms).length > 0 ? (
				Object.keys(groupedRooms).map((type) => (
					<div key={type} className="mb-6">
						<h2 className="text-xl font-semibold text-center mb-4">{type}</h2>
						<div className="grid grid-cols-5 gap-4">
							{groupedRooms[type].map((room, index) => (
								<div
									key={room._id}
									className={`relative p-5 rounded-lg ${
										room.bookings.some(
											(booking) => new Date(booking.startDate) <= new Date() && new Date(booking.endDate) >= new Date()
										) 
											  ? "booked-during-range rounded-lg bg-[rgb(191,190,190)] text-white"
                            : "available border-[3px] border-green-500 rounded-lg"
									}`}
									
									onMouseOver={() => setHoverOverRoom(room._id)}
									onMouseOut={() => setHoverOverRoom(false)}
								>
									<h3>Room {room.roomNumber}</h3>
									{room.bookings.some(
											(booking) => new Date(booking.startDate) <= new Date() && new Date(booking.endDate) >= new Date()
										)  && (
											<div className="booking-info">
												{room.bookings
													.filter(
														(booking) =>
															new Date(booking.startDate) <= new Date() &&
															new Date(booking.endDate) >= new Date()
													)
													.toReversed()
													.map((booking) => (
														<div key={"info-" + room.roomNumber} className="py-1">
															<p>
																Booked from: {getDate(booking.startDate)} to{" "}
																{getDate(booking.endDate)}
															</p>
															<p>User: {booking.user}</p>
														</div>
													))}
											</div>
										)}
									{hoverOverRoom === room._id&& (
										<div className="absolute inset-0 bg-white bg-opacity-5 backdrop-blur-sm flex items-center justify-center">
											<IconButton aria-label="delete room" onClick={() => deleteRoom(room._id)}>
												<DeleteIcon />
											</IconButton>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				))
			) : (
				<div className="text-center text-lg font-semibold">Loading...</div>
			)}

			{rooms.length >= 0 && (
				<div className="flex flex-col items-center gap-4">
					<button
						className="bg-blue-500 text-white text-lg font-semibold rounded-lg w-32 p-2 hover:bg-blue-600"
						onClick={handleOpen}
					>
						Add Room
					</button>

					<button
						className="px-4 py-2 bg-blue-500 text-white text-lg font-semibold rounded-lg w-32 hover:bg-blue-600"
						onClick={() => navigate("/admin/reservation/room-details")}
					>
						Room Details
					</button>
				</div>
			)}

			<Modal open={open} onClose={handleClose}>
				<Box sx={style}>
					<div className="flex justify-between w-full">
						<h3 className="text-lg font-semibold">Room Details</h3>
						<CloseIcon onClick={handleClose} style={{ cursor: "pointer" }} />
					</div>
					<TextField
						label="Room Number"
						value={roomNumber}
						onChange={(e) => setRoomNumber(e.target.value)}
						className="w-full"
					/>
					<FormControl className="w-full">
						<TextField
							select
							label="Room Type"
							value={roomType}
							onChange={(e) => setRoomType(e.target.value)}
							className="w-full"
						>
							<MenuItem value="" disabled>Select Room Type</MenuItem>
							<MenuItem value="Suite Room">Suite Room</MenuItem>
							<MenuItem value="executive Room">Executive Room</MenuItem>
						</TextField>
					</FormControl>
					<Button variant="contained" onClick={addRoom}>Add Room</Button>
				</Box>
			</Modal>
		</div>
	);
}
