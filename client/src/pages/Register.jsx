import React, { useEffect, useRef, useState } from "react";

import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

import { BASE_URL } from "../constants";

import logo from "./../images/IIT_Ropar_logo.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import "./Login.css";
import HomeIcon from "@mui/icons-material/Home";
import { useDispatch, useSelector } from "react-redux";
import { setUserSlice } from "../redux/userSlice";

const OTP_RESEND_TIME = 60;

const Register = () => {
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const navigate = useNavigate();

  const credentialSlice = useSelector((state) => state.credentials);
  const [credentials, setCredentials] = useState(credentialSlice);
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user);
  if (user.email) {
    return <Navigate to="/" />;
  }

  if (!credentialSlice || !credentialSlice.email) {
    // navigate("/login");
    return <Navigate to="/login" />;
  }

  const handleChange = (e) => {
    if (e.target.name === "contact") {
      if (e.target.value.length > 10) return;
      if (isNaN(e.target.value) || isNaN(parseFloat(e.target.value))) return;
    }
    setCredentials((user) => ({ ...user, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.name || !credentials.contact) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const res = await axios.post(BASE_URL + "/auth/register", {
        ...credentials,
      });

      if (res.data.user) {
        dispatch(setUserSlice(res.data));
        navigate("/", { replace: true });
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      if (error.response?.data?.message)
        toast.error(error.response.data.message);
      else toast.error("Something went wrong");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen ">
      <div className="flex  items-center justify-center gap-5 bg-[#365899] text-white p-2 h-36">
        <Link
          to="/"
          className="left-20 absolute p-2 rounded-md cursor-pointer hover:bg-[#294476] "
        >
          <HomeIcon />
        </Link>
        <img className="h-24 " src={logo} />
        <div className="">
          <div className="text-3xl font-semibold p-2 text-gg ">
            Welcome to Guest House Portal
          </div>
          <div className="font-medium pl-3 ">
            Indian Institute of Technology, Ropar
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center h-full border bg-[#f4f4f4] login-container">
        <div className="flex flex-col justify-center items-center w-[29%] bg-white rounded-lg overflow-hidden shadow-2xl opacity-90">
          <div className="p-2 text-3xl font-semibold bg-[#3498db] text-white w-full text-center">
            Welcome
          </div>

          <div className="m-5 flex flex-col items-center w-full ">
            <div className=" font-semibold text-2xl">REGISTER</div>

            <div className="w-full p-5 flex flex-col gap-5 items-center">
              <form className="flex flex-col gap-5 items-center w-full">
                <input
                  placeholder="Email"
                  disabled
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="email"
                  value={credentials.email}
                />
                <input
                  placeholder="Name"
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="name"
                  value={credentials.name}
                />
                <input
                  placeholder="Contact"
                  pattern="[0-9]+"
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="contact"
                  value={credentials.contact}
                />
                <input
                  placeholder="Department"
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="department"
                  value={credentials.department}
                />
                <input
                  placeholder="Designation"
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="designation"
                  value={credentials.designation}
                />
                <input
                  placeholder="Employee Code/ Entry Number"
                  className="p-2 border rounded-md text-sm h-12 w-full"
                  onChange={handleChange}
                  name="ecode"
                  value={credentials.ecode}
                />
                <button
                  className="border bg-black text-white w-full p-2 lg"
                  onClick={handleSubmit}
                >
                  Register
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
