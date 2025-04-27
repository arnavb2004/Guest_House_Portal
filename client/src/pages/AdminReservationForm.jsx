import React, { useState, useEffect, useRef } from "react";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

import {
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  ListSubheader
} from "@mui/material";
import "./Reservation_Form.css";
import { updateFilledPDF } from "../utils/generatePDF";
import InputFileUpload from "../components/uploadFile";
import { useSelector } from "react-redux";
import { privateRequest } from "../utils/useFetch";
import { FileIcon, defaultStyles } from "react-file-icon";
import { useNavigate } from "react-router-dom";
import ApplicantTable from "../components/ApplicantTable";
import NewWindow from "../components/NewWindow";

function AdminReservationForm() {
  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [showTC, setShowTC] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [subRole, setSubRole] = useState([]);

  useEffect(() => {
    setShowCat(false);
    setShowTC(false);
  }, [showTC, showCat]);

  const [files, setFiles] = useState([]);
  const [signatureMethod, setSignatureMethod] = useState('none'); // 'none', 'type', 'upload'
  const [signatureText, setSignatureText] = useState('');
  const [signatureImage, setSignatureImage] = useState(null);

  const [formData, setFormData] = useState({
    guestName: "",
    address: "",
    numberOfGuests: "",
    numberOfRooms: "",
    roomType: "Single Occupancy",
    arrivalDate: "",
    arrivalTime: "",
    departureDate: "",
    departureTime: "",
    purpose: "",
    category: "ES-A",
    source: "GUEST",
    applicant: {
      name: "",
      designation: "",
      department: "",
      code: "",
      mobile: "",
      email: "",
    },
    signature: null, // Add signature property
  });

  const [errorText, setErrorText] = useState({
    guestName: "",
    address: "",
    numberOfGuests: "",
    numberOfRooms: "",
    roomType: "",
    arrivalDate: "",
    arrivalTime: "",
    departureDate: "",
    departureTime: "",
    purpose: "",
    category: "",
  });

  const requiredFields = {
    guestName: false,
    address: false,
    numberOfGuests: false,
    numberOfRooms: true,
    roomType: true,
    arrivalDate: true,
    arrivalTime: false,
    departureDate: true,
    departureTime: false,
    purpose: true,
    category: true,
    source: false,
    applicant: true,
  };

  const patterns = {
    guestName: /[a-zA-Z]+/,
    address: /[\s\S]*/,
    numberOfGuests: /[0-9]+/,
    numberOfRooms: /[0-9]+/,
    roomType: /[\s\S]*/,
    arrivalDate: /[\s\S]*/,
    arrivalTime: /[\s\S]*/,
    departureDate: /[\s\S]*/,
    departureTime: /[\s\S]*/,
    purpose: /[\s\S]*/,
    category: /[\s\S]*/,
  };

  const categoryInfo = {
    "ES-A": "Executive Suite - Category A (Free)",
    "ES-B": "Executive Suite - Category B (₹3500)",
    "BR-A": "Business Room - Category A (Free)",
    "BR-B1": "Business Room - Category B1 (₹2000)",
    "BR-B2": "Business Room - Category B2 (₹1200)",
  };

  const catESAReviewers = ["DIRECTOR", "DEAN RESEARCH AND DEVELOPMENT", "DEAN STUDENT AFFAIRS", "DEAN FACULTY AFFAIRS AND ADMINISTRATION", "DEAN UNDER GRADUATE STUDIES", "DEAN POST GRADUATE STUDIES"];
  const catESBReviewers = ["CHAIRMAN"];
  const catBRAReviewers = ["REGISTRAR", "DIRECTOR","DEAN RESEARCH AND DEVELOPMENT", "DEAN STUDENT AFFAIRS", "DEAN FACULTY AFFAIRS AND ADMINISTRATION", "DEAN UNDER GRADUATE STUDIES", "DEAN POST GRADUATE STUDIES", "ASSOCIATE DEAN HOSTEL MANAGEMENT", "ASSOCIATE DEAN INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS", "ASSOCIATE DEAN CONTINUING EDUCATION AND OUTREACH ACTIVITIES", "ASSOCIATE DEAN INFRASTRUCTURE"];
  const catBRB1Reviewers = ["DEAN RESEARCH AND DEVELOPMENT", "DEAN STUDENT AFFAIRS", "DEAN FACULTY AFFAIRS AND ADMINISTRATION", "DEAN UNDER GRADUATE STUDIES", "DEAN POST GRADUATE STUDIES","ASSOCIATE DEAN HOSTEL MANAGEMENT", "ASSOCIATE DEAN INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS", "ASSOCIATE DEAN CONTINUING EDUCATION AND OUTREACH ACTIVITIES", "ASSOCIATE DEAN INFRASTRUCTURE", "REGISTRAR","HOD COMPUTER SCIENCE", "HOD ELECTRICAL ENGINEERING", "HOD MECHANICAL ENGINEERING", "HOD CHEMISTRY", "HOD MATHEMATICS", "HOD PHYSICS", "HOD HUMANITIES AND SOCIAL SCIENCES", "HOD BIOMEDICAL ENGINEERING", "HOD CHEMICAL ENGINEERING", "HOD METALLURGICAL AND MATERIALS ENGINEERING", "HOD CIVIL ENGINEERING"];
  const catBRB2Reviewers = ["CHAIRMAN"];

  const Hods = [
    "HOD COMPUTER SCIENCE",
    "HOD ELECTRICAL ENGINEERING",
    "HOD MECHANICAL ENGINEERING",
    "HOD CHEMISTRY",
    "HOD MATHEMATICS",
    "HOD PHYSICS",
    "HOD HUMANITIES AND SOCIAL SCIENCES",
    "HOD BIOMEDICAL ENGINEERING",
    "HOD CHEMICAL ENGINEERING",
    "HOD METALLURGICAL AND MATERIALS ENGINEERING",
  ];

  const AssociateDeans = [
    "ASSOCIATE DEAN HOSTEL MANAGEMENT",
    "ASSOCIATE DEAN INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS",
    "ASSOCIATE DEAN CONTINUING EDUCATION AND OUTREACH ACTIVITIES",
    "ASSOCIATE DEAN INFRASTRUCTURE",
  ];

  const Deans = [
    "DEAN RESEARCH AND DEVELOPMENT",
    "DEAN STUDENT AFFAIRS",
    "DEAN FACULTY AFFAIRS AND ADMINISTRATION",
    "DEAN UNDER GRADUATE STUDIES",
    "DEAN POST GRADUATE STUDIES",
  ];

  const subroles = {
    HOD: Hods,
    "ASSOCIATE DEAN": AssociateDeans,
    DEAN: Deans,
  };

  const roomFareESA = {
    "Single Occupancy": 0,
    "Double Occupancy": 0,
  };
  const roomFareESB = {
    "Single Occupancy": 3500,
    "Double Occupancy": 3500,
  };
  const roomFareBRA = {
    "Single Occupancy": 0,
    "Double Occupancy": 0,
  };
  const roomFareBRB1 = {
    "Single Occupancy": 2000,
    "Double Occupancy": 2000,
  };
  const roomFareBRB2 = {
    "Single Occupancy": 1200,
    "Double Occupancy": 1200,
  };

  const catReviewers = {
    "ES-A": catESAReviewers,
    "ES-B": catESBReviewers,
    "BR-A": catBRAReviewers,
    "BR-B1": catBRB1Reviewers,
    "BR-B2": catBRB2Reviewers,
  };

  const roomFare = {
    "ES-A": roomFareESA,
    "ES-B": roomFareESB,
    "BR-A": roomFareBRA,
    "BR-B1": roomFareBRB1,
    "BR-B2": roomFareBRB2,
  };

  const [checkedValues, setCheckedValues] = useState([]);

  console.log(checkedValues);
  console.log(subRole);
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    if (name === "category") {
      const reviewers =  [];
      setCheckedValues(reviewers);
      setSubRole(Array(reviewers.length).fill("Select"));
    }
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setCheckedValues([value]); // Only keep the selected reviewer
      setSubRole([ "Select" ]); // Reset subRole to "Select" for the newly selected reviewer
      } else {
      setCheckedValues([]);
      setSubRole([]);

    }
  };

  console.log(checkedValues);

  const handleSubRoleChange = (event, reviewer) => {
    const index = checkedValues.indexOf(reviewer);
    const temp = [...subRole];
    temp[index] = event.target.value;
    setSubRole(temp);
  };

  const handleFileUpload = (files) => {
    setFiles(files);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    let passed = true;
    
    for (let [key, value] of Object.entries(formData)) {
      if (key === "files" || key === "receipt") {
        continue;
      }
      if (requiredFields[key] && value === "") {
        setErrorText((prev) => ({
          ...prev,
          [key]: "This field is required",
        }));
        passed = false;
      } else if (value !== "" && patterns[key] && !value.match(patterns[key])) {
        setErrorText((prev) => ({
          ...prev,
          [key]: "Invalid input",
        }));
        passed = false;
      } else {
        setErrorText((prev) => ({
          ...prev,
          [key]: "",
        }));
      }
    }
    
    const arrivalDateTime = new Date(
      `${formData.arrivalDate}T${formData.arrivalTime || "13:00"}`
    );
    const departureDateTime = new Date(
      `${formData.departureDate}T${formData.departureTime || "11:00"}`
    );
    
    // Check if departure is after arrival
    if (departureDateTime <= arrivalDateTime) {
      passed = false;
      setErrorText((prev) => ({
        ...prev,
        departureDate: "Departure date must be after arrival date",
        departureTime: "Departure time must be after arrival time",
      }));
      toast.error("Departure should be After Arrival");
      return;
    }
    
    for (let [index, reviewer] of checkedValues.entries()) {
      console.log(subroles[reviewer]);
      console.log(subRole[index]);
      if (
        subroles[reviewer] &&
        (subRole[index] === "" ||
          !subRole[index] ||
          subRole[index] === "Select")
      ) {
        toast.error("Please select subrole for each reviewer");
        return;
      }
    }
    
    if (!passed) {
      toast.error("Please Fill All Necessary Fields Correctly.");
      return;
    }
    
    // Handle form submission
    setLoading(true);
    
    // Show loading toast
    const toast_id = toast.loading("Submitting reservation...");

    try {
      // Generate PDF receipt with better error handling
      console.log("Attempting to generate receipt...");
      const receipt = await updateFilledPDF(formData);
      
      if (!receipt) {
        toast.update(toast_id, {
          render: "Failed to generate receipt. Please ensure all fields are filled correctly.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        setLoading(false);
        return;
      }
      
      console.log("Receipt generated successfully, creating file object...");
      
      // Create a File object from the receipt Blob with a unique filename
      const timestamp = new Date().getTime();
      const receiptFile = new File(
        [receipt], 
        `receipt_${timestamp}.pdf`, 
        { type: "application/pdf" }
      );
      
      console.log("Creating FormData for submission...");
      const formDataToSend = new FormData();
      
      // Add form fields WITHOUT category mapping
      Object.entries(formData).forEach(([fieldName, fieldValue]) => {
        if (fieldName === "applicant") {
          formDataToSend.append(fieldName, JSON.stringify(fieldValue));
        } else {
          // Use the original category value (no mapping)
          formDataToSend.append(fieldName, fieldValue);
        }
      });
      
      // Calculate total amount based on room type, number of rooms, and duration
      const arrivalDateTime = new Date(
        `${formData.arrivalDate}T${formData.arrivalTime || "13:00"}`
      );
      const departureDateTime = new Date(
        `${formData.departureDate}T${formData.departureTime || "11:00"}`
      );
      
      // Calculate duration in days
      const durationMs = departureDateTime - arrivalDateTime;
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      
      // Calculate room cost
      const roomRate = roomFare[formData.category][formData.roomType];
      const numberOfRooms = parseInt(formData.numberOfRooms) || 1;
      const totalAmount = roomRate * numberOfRooms * durationDays;
      
      // Add the amount to form data
      formDataToSend.append("amount", totalAmount);
      
      console.log("Room rate:", roomRate, "Number of rooms:", numberOfRooms, "Duration:", durationDays, "Total amount:", totalAmount);
      
      // Add uploaded files
      if (files.length > 0) {
        console.log(`Adding ${files.length} attachment files`);
        for (const file of files) {
          formDataToSend.append("files", file);
        }
      }
      
      // Add reviewers and subroles based on category-specific requirements
      let formattedReviewers = [];
      
      // Handle specific reviewer categories based on requirements
      switch(formData.category) {
        case "ES-A":
          // ES-A: Director or any Dean
          formattedReviewers = [...checkedValues];
          break;
          
        case "ES-B":
          // ES-B: Chairman only
          formattedReviewers = ["CHAIRMAN"];
          break;
          
        case "BR-A":
          // BR-A: Either Director alone OR Registrar + (Dean/Associate Dean)
          if (checkedValues.includes("DIRECTOR")) {
            formattedReviewers = ["DIRECTOR"];
          } else if (checkedValues.includes("REGISTRAR") && formData.secondaryAuthority) {
            formattedReviewers = ["REGISTRAR", formData.secondaryAuthority];
          }
          break;
          
        case "BR-B1":
          // BR-B1: Dean + (Associate Dean, HOD, or Registrar)
          if (checkedValues.length > 0 && formData.secondaryAuthority) {
            const primaryDean = checkedValues.find(val => Deans.includes(val));
            if (primaryDean) {
              formattedReviewers = [primaryDean, formData.secondaryAuthority];
            }
          }
          break;
          
        case "BR-B2":
          // BR-B2: Chairman only
          formattedReviewers = ["CHAIRMAN"];
          break;
          
        default:
          // Fallback to checked values for any other category
          formattedReviewers = [...checkedValues];
      }
      
      // Make sure we have at least one reviewer
      if (formattedReviewers.length === 0 && checkedValues.length > 0) {
        // Fallback to the checked values if something went wrong
        formattedReviewers = [...checkedValues];
      }
      
      console.log("Sending reviewers:", formattedReviewers);
      formDataToSend.append("reviewers", formattedReviewers.join(','));
      formDataToSend.append("subroles", new Array(formattedReviewers.length).fill("Select").join(',')); // For compatibility
      
      // Add receipt file
      formDataToSend.append("receipt", receiptFile);

      console.log("Submitting form data to server...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const res = await http.post("/reservation/", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log("Server response:", res.status, res.data);
        toast.update(toast_id, {
          render: "Reservation submitted successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setLoading(false);
        navigate("..");
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Form submission error:", error);
        
        if (error.name === 'AbortError') {
          toast.update(toast_id, {
            render: "Request timed out. Please try again later.",
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
        } else {
          toast.update(toast_id, {
            render: error.response?.data?.message || "Network error. Please try again.",
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.update(toast_id, {
        render: "Failed to prepare form. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      setLoading(false);
    }
  };

  const [showCheckbox, setShowCheckbox] = useState(false);

  useEffect(() => {
    // setShowCheckbox(false);
    setShowCheckbox(true);
  }, [formData.category]);

  // Enhanced autofill handler function
  const handleAutofill = () => {
    // Get current user data from Redux store
    const userData = user;
    
    // Determine department from role if possible
    let department = "";
    if (userData.role && userData.role.startsWith("HOD ")) {
      // Extract department from HOD role (e.g., HOD COMPUTER_SCIENCE)
      department = userData.role.replace("HOD ", "").replace(/_/g, " ");
    } else if (userData.department) {
      department = userData.department;
    }
    
    // Determine designation from role if possible
    let designation = "";
    if (userData.role) {
      if (userData.role.startsWith("HOD ")) {
        designation = "HOD";
      } else if (userData.role === "DEAN") {
        designation = "DEAN";
      } else if (userData.role === "DIRECTOR") {
        designation = "DIRECTOR";
      } else if (userData.role === "REGISTRAR") {
        designation = "REGISTRAR";
      } else if (userData.designation) {
        designation = userData.designation;
      }
    }
    
    // Update applicant data with user information
    setFormData(prev => ({
      ...prev,
      applicant: {
        name: userData.name || "",
        email: userData.email || "",
        mobile: userData.contact || "",
        department: department || prev.applicant.department || "",
        designation: designation || prev.applicant.designation || "",
        code: userData.employeeId || userData.studentId || userData.ecode || prev.applicant.code || "",
      }
    }));
    
    toast.info("Details autofilled from your profile");
  };

  // Function to handle text signature
  const saveTextSignature = () => {
    if (signatureText.trim()) {
      setFormData(prevData => ({
        ...prevData,
        signature: {
          type: 'text',
          data: signatureText
        }
      }));
      toast.success("Signature saved");
    } else {
      toast.error("Please enter your name for the signature");
    }
  };
  
  // Function to handle signature image upload
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        toast.error("Please upload an image file");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setSignatureImage(e.target.result);
          setFormData(prevData => ({
            ...prevData,
            signature: {
              type: 'image',
              data: e.target.result
            }
          }));
          toast.success("Signature uploaded");
        };
        img.onerror = () => {
          toast.error("Invalid image file");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to parse and display secondary authority values
  const getSecondaryAuthorityDisplayValue = (value) => {
    if (!value || value === "Select") return "Select Secondary Authority";
    
    if (value === "REGISTRAR") return "Registrar";
    
    // Handle Associate Deans
    if (value.startsWith("ASSOCIATE DEAN ")) {
      return `Associate Dean - ${value.replace("ASSOCIATE DEAN ", "")}`;
    }
    
    // Handle HODs
    if (value.startsWith("HOD ")) {
      return `HoD - ${value.replace("HOD ", "")}`;
    }
    
    return value;
  };

  return (
    <div className="w-full">
      <div className="reservation-container border shadow-xl rounded-lg  bg-white">
        <h2 className="py-2 mb-5">Guest House Reservation Form</h2>
        <FormControl className="w-full flex gap-4">
          <div>
            <TextField
              label="Name of Guest"
              error={errorText.guestName !== ""}
              required={requiredFields.guestName}
              helperText={errorText.guestName && errorText.guestName}
              fullWidth
              variant="outlined"
              name="guestName"
              value={formData.guestName}
              onChange={handleChange}
            />
          </div>

          <div>
            <TextField
              label="Address"
              error={errorText.address !== ""}
              helperText={errorText.address && errorText.address}
              fullWidth
              required={requiredFields.address}
              className="bg-white"
              variant="outlined"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <TextField
            label="Number of Guests"
            fullWidth
            error={errorText.numberOfGuests !== ""}
            required={requiredFields.numberOfGuests}
            helperText={errorText.numberOfGuests && errorText.numberOfGuests}
            className="bg-white"
            variant="outlined"
            name="numberOfGuests"
            value={formData.numberOfGuests}
            onChange={handleChange}
          />
          <TextField
            label="Number of Rooms Required"
            fullWidth
            error={errorText.numberOfRooms !== ""}
            required={requiredFields.numberOfRooms}
            helperText={errorText.numberOfRooms && errorText.numberOfRooms}
            className="bg-white"
            variant="outlined"
            name="numberOfRooms"
            value={formData.numberOfRooms}
            onChange={handleChange}
          />

          <div className="form-group">
            <label>Arrival Date*:</label>
            <input
              type="date"
              name="arrivalDate"
              value={formData.arrivalDate}
              onChange={handleChange}
              min={new Date(Date.now()).toISOString().split("T")[0]}
            />
          </div>

          <div className="form-group">
            <label>Arrival Time:</label>
            <input
              type="time"
              name="arrivalTime"
              value={formData.arrivalTime}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Departure Date*:</label>
            <input
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              min={new Date(Date.now()).toISOString().split("T")[0]}
            />
          </div>
          <div className="form-group">
            <label>
              Departure Time: (Departure time must be before 11:00 AM)
            </label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
            />
          </div>

          {showCat && <NewWindow link="/forms/categories.pdf" />}
          {showTC && <NewWindow link="/forms/TermsAndConditions.pdf" />}

          <TextField
            label="Purpose of Booking"
            error={errorText.purpose !== ""}
            helperText={errorText.purpose && errorText.purpose}
            required={requiredFields.purpose}
            fullWidth
            className=""
            variant="outlined"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
          />

          <div className="form-group">
            <label>
              Category*: (Refer to{" "}
              <span
                className="underline cursor-pointer text-blue-800"
                onClick={() => {
                  setShowCat(true);
                }}
              >
                this
              </span>{" "}
              page for details of categories and tariff)
            </label>
            <select
              name="category"
              className="w-full h-12 border rounded-md border-gray-300 p-2 mb-5 whitespace-pre"
              onChange={handleChange}
              value={formData.category}
            >
              {Object.entries(categoryInfo).map(
                ([categoryCode, categoryName]) => (
                  <option key={categoryCode} value={categoryCode}>
                    {categoryName}
                  </option>
                )
              )}
            </select>
            <div className="form-group">
              <label>Room Type*</label>

              <select
                name="roomType"
                className="w-full h-12 border rounded-md border-gray-300 p-2 whitespace-pre"
                onChange={handleChange}
                value={formData.roomType}
              >
                <option value="Single Occupancy">
                  {formData.category === "ES-A" || formData.category === "BR-A" ? (
                    <span>Single Occupancy (Free)</span>
                  ) : (
                    <span>
                      Single Occupancy (₹
                      {roomFare[formData.category]["Single Occupancy"]}/- only)
                    </span>
                  )}
                </option>
                <option value="Double Occupancy">
                  {formData.category === "ES-A" || formData.category === "BR-A" ? (
                    <span>Double Occupancy (Free)</span>
                  ) : (
                    <span>
                      Double Occupancy (₹
                      {roomFare[formData.category]["Double Occupancy"]}/- only)
                    </span>
                  )}
                </option>
              </select>

              </div>
            {showCheckbox && (
                <div className="w-full p-2 mb-5">
                <label className="font-semibold mb-2 block">Approving Authority*:</label>
                
                {formData.category === "ES-A" && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Select one of the following options:</p>
                    <FormControl fullWidth className="mb-3">
                      <Select
                        multiple
                        value={checkedValues}
                        onChange={(e) => {
                          setCheckedValues(e.target.value);
                        }}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300
                            }
                          }
                        }}
                      >
                        <MenuItem value="DIRECTOR">Director</MenuItem>
                        <ListSubheader>Deans</ListSubheader>
                        {Deans.map(dean => (
                          <MenuItem key={dean} value={dean}>
                            {dean.replace("DEAN ", "")}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                )}
                
                {formData.category === "ES-B" && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Chairman is the approving authority:</p>
                    <FormControl fullWidth className="mb-3">
                      <Select
                        value={checkedValues.length > 0 ? checkedValues[0] : "CHAIRMAN"}
                        onChange={(e) => {
                          setCheckedValues([e.target.value]);
                        }}
                        displayEmpty
                      >
                        <MenuItem value="CHAIRMAN">Chairman</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                )}
                
                {formData.category === "BR-A" && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Select approving authority:</p>
                    <FormControl fullWidth className="mb-3">
                      <Select
                        value={checkedValues.length > 0 ? checkedValues[0] : ""}
                        onChange={(e) => {
                          setCheckedValues([e.target.value]);
                          // If Director is selected, clear secondaryAuthority
                          if (e.target.value === "DIRECTOR") {
                            setFormData({...formData, secondaryAuthority: ""});
                          }
                        }}
                        displayEmpty
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300
                            }
                          }
                        }}
                      >
                        <MenuItem value="" disabled>Select primary authority</MenuItem>
                        <MenuItem value="REGISTRAR">Registrar</MenuItem>
                        <MenuItem value="DIRECTOR">Director</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Show secondary authority field only if Registrar is selected */}
                    {checkedValues.includes("REGISTRAR") && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Select a Dean or Associate Dean (Required):</p>
                        <FormControl fullWidth>
                          <Select
                            value={formData.secondaryAuthority || "Select"}
                            onChange={(e) => {
                              setFormData({ ...formData, secondaryAuthority: e.target.value });
                            }}
                            displayEmpty
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 300
                                }
                              }
                            }}
                          >
                            <MenuItem value="Select" disabled>Select secondary authority</MenuItem>
                            <ListSubheader>Deans</ListSubheader>
                            {Deans.map((dean) => (
                              <MenuItem key={dean} value={dean}>
                                {dean.replace("DEAN ", "")}
                              </MenuItem>
                            ))}
                            <ListSubheader>Associate Deans</ListSubheader>
                            {AssociateDeans.map((dean) => (
                              <MenuItem key={dean} value={dean}>
                                {dean.replace("ASSOCIATE DEAN ", "")}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                    )}
                  </div>
                )}
                
                {formData.category === "BR-B1" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Select Primary Authority (Dean):</p>
                    <FormControl fullWidth className="mb-3">
                      <Select
                        multiple
                        value={checkedValues}
                        onChange={(e) => {
                          // Filter to only keep Dean roles
                          const deanValues = e.target.value.filter(value => 
                            Deans.includes(value)
                          );
                          setCheckedValues(deanValues);
                        }}
                        renderValue={(selected) => selected.join(', ')}
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300
                            }
                          }
                        }}
                      >
                        {Deans.map(dean => (
                          <MenuItem key={dean} value={dean}>
                            {dean.replace("DEAN ", "")}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <p className="text-sm text-gray-600 mb-1">Secondary Authority (Required):</p>
                    <FormControl fullWidth>
                      <Select
                        value={formData.secondaryAuthority || "Select"}
                        onChange={(e) => {
                          setFormData({ ...formData, secondaryAuthority: e.target.value });
                        }}
                        displayEmpty
                        MenuProps={{
                          PaperProps: {
                            style: {
                              maxHeight: 300
                            }
                          }
                        }}
                      >
                        <MenuItem value="Select" disabled>Select Secondary Authority</MenuItem>
                        <MenuItem value="REGISTRAR">Registrar</MenuItem>
                        
                        <ListSubheader>Associate Deans</ListSubheader>
                        {AssociateDeans.map((dean) => (
                          <MenuItem key={dean} value={dean}>
                            {dean.replace("ASSOCIATE DEAN ", "")}
                          </MenuItem>
                        ))}
                        
                        <ListSubheader>Heads of Departments</ListSubheader>
                        {Hods.map((dept) => (
                          <MenuItem key={dept} value={dept}>
                            {dept.replace("HOD ", "")}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                )}
                
                {formData.category === "BR-B2" && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Chairman is the approving authority:</p>
                    <FormControl fullWidth className="mb-3">
                      <Select
                        value={checkedValues.length > 0 ? checkedValues[0] : "CHAIRMAN"}
                        onChange={(e) => {
                          setCheckedValues([e.target.value]);
                        }}
                        displayEmpty
                      >
                        <MenuItem value="CHAIRMAN">Chairman</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                )}
                </div>
              )}
            {(formData.category === "ES-B" ||
              formData.category === "BR-B1" ||
              formData.category === "BR-B2") && (
              <>
                <label>Payment*:</label>

                <select
                  name="source"
                  className="w-full h-12 border rounded-md border-gray-300 p-2 mb-5 whitespace-pre"
                  onChange={handleChange}
                  value={formData.source}
                >
                  <option value="GUEST">Paid by guest</option>
                  <option value="DEPARTMENT">Paid by department</option>
                  <option value="OTHERS">Paid by other sources</option>
                </select>
              </>
            )}
            Add attachements for proof of category (if any):
            <div className="flex mt-2 gap-10">
              <div>
                <InputFileUpload className="" onFileUpload={handleFileUpload} />
              </div>


              {Array.from(files).length > 0 ? (
                <div className="flex flex-col  overflow-y-auto max-w-[30rem] h-16 gap-2 pr-2">
                  {Array.from(files).map((file, index) => {
                    const arr = file.name.split(".");
                    const ext = arr[arr.length - 1];
                    return (
                      <div className="flex gap-4 items-center">
                        <div className="w-7">
                          <FileIcon
                            className=""
                            extension={ext}
                            {...defaultStyles}
                          />
                        </div>
                        <div
                          onClick={() => {
                            window.open(window.URL.createObjectURL(file));
                          }}
                          className="text-sm text-gray-500 hover:text-blue-500 cursor-pointer"
                        >
                          {file.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : formData.category === "ES-A" || formData.category === "ES-B" ? (
                <div className="flex items-center text-gray-500">
                  *Uploading attachments is mandatory for category ES-A and ES-B (size
                  limit: 2MB)
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  File size limit: 2MB
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>Applicant/Proposer Details:</div>
                <button 
                  type="button"
                  onClick={handleAutofill}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
                >
                  <span>Autofill My Details</span> 
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
                  </svg>
                </button>
              </div>
              <div>
                <ApplicantTable
                  entry={formData.applicant}
                  setEntry={(entry) =>
                    setFormData((prev) => ({ ...prev, applicant: entry }))
                  }
                />
              </div>
            </div>
          </div>
          
          {/* Signature Section */}
          <div className="mt-5 border p-4 rounded-md">
            <h3 className="font-semibold mb-3">Applicant Signature*:</h3>
            
            <div className="flex gap-4 mb-4">
              <button 
                type="button"
                onClick={() => setSignatureMethod('type')}
                className={`px-3 py-2 rounded-md ${signatureMethod === 'type' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Type Signature
              </button>
              
              <button 
                type="button"
                onClick={() => setSignatureMethod('upload')}
                className={`px-3 py-2 rounded-md ${signatureMethod === 'upload' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Upload Signature
              </button>
            </div>
            
            {signatureMethod === 'type' && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Type your name"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full p-2 border rounded-md mb-2 font-signature text-xl"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveTextSignature}
                    className="bg-green-500 text-white px-4 py-2 rounded-md"
                  >
                    Save Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureText('')}
                    className="bg-red-500 text-white px-4 py-2 rounded-md"
                  >
                    Clear
                  </button>
                </div>
                {signatureText && (
                  <div className="mt-3 p-3 border rounded-md">
                    <p className="font-signature text-xl">{signatureText}</p>
                  </div>
                )}
              </div>
            )}
            
            {signatureMethod === 'upload' && (
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                  className="w-full p-2 border rounded-md mb-2"
                />
                <p className="text-gray-500 text-sm">
                  Please upload a clear image of your signature (JPG, PNG or GIF format)
                </p>
              </div>
            )}
            
            {formData.signature && (
              <div className="mt-3 p-3 border rounded-md">
                <p className="font-semibold mb-2">Your saved signature:</p>
                {formData.signature.type === 'image' ? (
                  <img 
                    src={formData.signature.data} 
                    alt="Signature" 
                    className="max-h-20" 
                  />
                ) : (
                  <p className="font-signature text-xl">{formData.signature.data}</p>
                )}
              </div>
            )}
          </div>
          
          <div>
            By clicking on Submit, you hereby agree to the{" "}
            <span
              className="underline cursor-pointer text-blue-800"
              onClick={() => {
                setShowTC(true);
              }}
            >
              Terms and Conditions
            </span>
          </div>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="submit-btn"
          >
            Submit
          </button>
          <button
            onClick={async () => {
              const blob = await updateFilledPDF(formData);
              const pdfUrl = URL.createObjectURL(blob);
              window.open(pdfUrl);
            }}
            className="convert-to-pdf-btn"
          >
            See Preview - PDF
          </button>
        </FormControl>
      </div>
    </div>
  );
}

export default AdminReservationForm;
