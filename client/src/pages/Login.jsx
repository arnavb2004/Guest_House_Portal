import React, { useEffect, useRef, useState } from "react";

import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

import { GoogleLogin } from "@react-oauth/google";
import { BASE_URL } from "../constants";

import logo from "./../images/IIT_Ropar_logo.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import "./Login.css";
import HomeIcon from "@mui/icons-material/Home";
import { useDispatch, useSelector } from "react-redux";
import { setUserSlice } from "../redux/userSlice";
import { setCredentialSlice } from "../redux/credentialSlice";

const OTP_RESEND_TIME = 60;

const Login = ({ isRegister }) => {
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const navigate = useNavigate();

  const [showOtp, setShowOtp] = useState(false);
  const [isLogin, setIsLogin] = useState(isRegister ? false : true);

  const [isDisabled, setIsDisabled] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [isError, setIsError] = useState({
    email: false,
    name: false,
    contact: false,
  });

  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);

  useEffect(() => {
    const interval = setInterval(() => {
      if (seconds > 0) setSeconds(seconds - 1);
      if (seconds === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  useEffect(() => {
    // Focus on the input field when the component mounts
    if (inputRef1.current && !showOtp) inputRef1.current.focus();
    if (inputRef2.current && showOtp) inputRef2.current.focus();
  }, [showOtp]);

  const [credentials, setCredentials] = useState({
    email: "",
    otp: "",
    name: "",
    contact: "",
  });

  if (user.email) {
    return <Navigate to="/" />;
  }

  const handleOtp = (e) => {
    let val = e.target.value;
    val = val.replace(/\D/g, "");
    if (val.length > 6) val = val.substring(0, 6);
    setCredentials((prev) => ({ ...prev, otp: val }));
  };

  const handleChange = (e) => {
    setCredentials((user) => ({ ...user, [e.target.name]: e.target.value }));
  };

  const sendOtp = async () => {
    const toast_id = toast.loading("Sending OTP");
    try {
      setIsDisabled(true);

      const response = await axios.post(BASE_URL + "/auth/otp", {
        email: credentials.email,
      });
      
      toast.update(toast_id, {
        render: "OTP sent successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      setIsDisabled(false);
      return true;
    } catch (error) {
      setIsDisabled(false);
      console.error("OTP error:", error);
      
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      
      if (error.response?.data?.message) {
        toast.update(toast_id, {
          render: error.response.data.message,
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
      } else if (error.response?.data?.error) {
        toast.update(toast_id, {
          render: error.response.data.error,
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
      } else {
        toast.update(toast_id, {
          render: "Error sending OTP. Please try again later.",
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      credentials.email.match("[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,}$") === null
    ) {
      toast.error("Invalid Email");
      return;
    }

    if (!showOtp) {
      try {
        setIsDisabled(true);
        
        const success = await sendOtp();
        if (success) {
          setShowOtp(true);
          setSeconds(OTP_RESEND_TIME);
        }
        
        setIsDisabled(false);
      } catch (error) {
        console.error("Submit error:", error);
        setIsDisabled(false);
      }
    } else {
      try {
        const res = await axios.post(BASE_URL + "/auth/login", {
          ...credentials,
        });

        if (res.data.user) {
          dispatch(
            setUserSlice({
              user: res.data.user,
              accessToken: res.data.accessToken,
              refreshToken: res.data.refreshToken,
            })
          );
          navigate(-1);
        } else {
          dispatch(setCredentialSlice({
            ...credentials,
            department: "",
            designation: "",
            ecode: ""
          }));
          // setIsLogin(false);
          navigate("/register");
        }
      } catch (error) {
        if (error.response?.data?.message)
          toast.error(error.response.data.message);
        else toast.error("Something went wrong");
      }
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
            <div className="font-semibold text-2xl">LOG IN</div>

            <div className="w-full p-5 flex flex-col gap-5 items-center">
              <input
                placeholder="Email"
                pattern="[0-9]+"
                className="p-2 border rounded-md text-sm h-12 w-full "
                onChange={handleChange}
                name="email"
                value={credentials.email}
                ref={inputRef1}
              />
              {showOtp && (
                <div className="w-full flex flex-col">
                  <div className="flex w-full justify-between gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      name="otp"
                      value={credentials.otp}
                      onChange={handleOtp}
                      placeholder="OTP"
                      className="p-2 border rounded-md text-sm h-12 w-full "
                      ref={inputRef2}
                    />
                    <button
                      className="border bg-[#212529] disabled:cursor-not-allowed disabled:opacity-70 text-white w-full p-2 lg"
                      onClick={() => sendOtp()}
                      disabled={seconds > 0 || isDisabled}
                    >
                      Resend OTP
                    </button>
                  </div>
                  {seconds > 0 && (
                    <div className="text-sm mt-2">
                      Time Remaining: {Math.floor(seconds / 60) < 10 && "0"}
                      {Math.floor(seconds / 60)}:{seconds % 60 < 10 && "0"}
                      {seconds % 60}
                    </div>
                  )}
                </div>
              )}
              <button
                className="border bg-[#212529] text-white w-full p-2 lg disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleSubmit}
                disabled={isDisabled}
              >
                {showOtp ? "Log In" : "Send OTP"}
              </button>

              <div className="text-center">OR</div>

              <GoogleLogin
                className="w-full"
                onSuccess={async (res) => {
                  const credential = res.credential;
                  try {
                    const res = await axios.post(
                      BASE_URL + "/auth/googleLogin",
                      {
                        credential,
                      }
                    );
                    if (res.data.user) {
                      dispatch(setUserSlice(res.data));
                      navigate(-1);
                    } else {
                      dispatch(setCredentialSlice({ 
                        email: res.data.email,
                        department: "",
                        designation: "",
                        ecode: "" 
                      }));
                      navigate("/register");
                    }
                  } catch (error) {
                    if (error.response?.data?.message) {
                      toast.error(error.response.data);
                    } else {
                      toast.error("An error occurred");
                    }
                  }
                }}
                onError={() => {
                  toast.error("Login failed");
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
