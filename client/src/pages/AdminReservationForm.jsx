import React, { useState, useEffect, useRef } from "react";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

import {
  FormControl,
  Select,
  Radio,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Typography,
  MenuItem,
  ListSubheader,
  InputLabel,
  FormHelperText
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
  const [openSourceDialog, setOpenSourceDialog] = useState(false);
  const [tempSourceName, setTempSourceName] = useState("");


  const [formData, setFormData] = useState({
    guestName: "",
    guestGender: "MALE",
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
    sourceName: "",
    applicant: {
      name: "",
      designation: "",
      department: "",
      code: "",
      mobile: "",
      email: "",
    },
    signature: null, // Add signature property
    primaryAuthority: "Select",
    secondaryAuthority: "Select",
    selectedReviewers: []
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
    guestName: true,
    address: true,
    numberOfGuests: true,
    numberOfRooms: true,
    roomType: true,
    arrivalDate: true,
    arrivalTime: true,
    departureDate: true,
    departureTime: true,
    purpose: true,
    category: true,
    source: true,
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
    mobile: /^\d{10}$/,
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

  const roomFare = {
    "ES-A": roomFareESA,
    "ES-B": roomFareESB,
    "BR-A": roomFareBRA,
    "BR-B1": roomFareBRB1,
    "BR-B2": roomFareBRB2,
  };

  const [checkedValues, setCheckedValues] = useState([]);
  const [selectedPrimaryReviewer, setSelectedPrimaryReviewer] = useState("Select");
  const [selectedSecondaryReviewer, setSelectedSecondaryReviewer] = useState("Select");
  const [validationError, setValidationError] = useState("");

  console.log(checkedValues);
  console.log(subRole);

  // Effect to handle category changes and auto-select appropriate authorities
  useEffect(() => {
    // Auto-select authorities based on category
    switch(formData.category) {
      case "ES-B":
        // Chairman only - automatically selected
        setCheckedValues(["CHAIRMAN"]);
        setFormData(prev => ({
          ...prev,
          primaryAuthority: "CHAIRMAN",
          secondaryAuthority: "Select"
        }));
        break;
        
      case "BR-B2":
        // Chairman only - automatically selected
        setCheckedValues(["CHAIRMAN"]);
        setFormData(prev => ({
          ...prev,
          primaryAuthority: "CHAIRMAN",
          secondaryAuthority: "Select"
        }));
        break;
        
      default:
        // Reset for other categories unless values are already set
        if (formData.category === "ES-A" || formData.category === "BR-A" || formData.category === "BR-B1") {
          // Only reset if we're switching to a new category
          if (!checkedValues.length) {
            setFormData(prev => ({
              ...prev,
              primaryAuthority: "Select",
              secondaryAuthority: "Select"
            }));
          }
        }
        break;
    }
  }, [formData.category]);

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setFormData({
      ...formData,
      category: newCategory,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    if (name === "category") {
      // Reset reviewers when changing category - don't auto-select any
      setCheckedValues([]);
      setSubRole([]);
    }
    if (name === "source" && (value === "DEPARTMENT" || value === "OTHERS")) {
      setTempSourceName("");            // clear out any old text
      setOpenSourceDialog(true);        // <— open the popup
    }
  
      
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    
    if (checked) {
      // If checking, handle appropriately based on category:
      if (formData.category === "ES-A") {
        // Only allow one authority for ES-A
        setCheckedValues([value]);
        setFormData({...formData, primaryAuthority: value});
      } 
      else if (formData.category === "BR-A" && value === "DIRECTOR") {
        // If selecting Director for BR-A, clear any other selections
        setCheckedValues([value]);
        setFormData({...formData, primaryAuthority: value, secondaryAuthority: "Select"});
      }
      else if (formData.category === "BR-A" && value === "REGISTRAR") {
        // If selecting Registrar for BR-A, set as primary and reset secondary
        setCheckedValues([value]);
        setFormData({...formData, primaryAuthority: value, secondaryAuthority: "Select"});
      }
      else if (formData.category === "BR-A" && (Deans.includes(value) || AssociateDeans.includes(value))) {
        // For BR-A, ensure Registrar is still included if selecting a secondary authority
        if (checkedValues.includes("REGISTRAR")) {
          setCheckedValues(["REGISTRAR", value]);
          setFormData({...formData, secondaryAuthority: value});
        } else {
          // If no primary yet, treat this as a single selection
          setCheckedValues([value]);
          setFormData({...formData, primaryAuthority: value, secondaryAuthority: "Select"});
        }
      }
      else if (formData.category === "BR-B1") {
        // For BR-B1, handle Dean + secondary authority
        if (Deans.includes(value)) {
          // If selecting a Dean, keep it as primary and clear secondary
          setCheckedValues([value]);
          setFormData({...formData, primaryAuthority: value, secondaryAuthority: "Select"});
        } 
        else if (AssociateDeans.includes(value) || Hods.includes(value) || value === "REGISTRAR") {
          // If selecting a secondary authority, ensure a Dean is still primary
          const existingDean = checkedValues.find(val => Deans.includes(val));
          if (existingDean) {
            setCheckedValues([existingDean, value]);
            setFormData({...formData, secondaryAuthority: value});
          } else {
            // If no Dean selected yet, just keep the current selection
            setCheckedValues([value]);
            setFormData({...formData, primaryAuthority: value, secondaryAuthority: "Select"});
          }
        }
      }
      else {
        // Default case: add to checked values
        setCheckedValues([...checkedValues, value]);
      }
    } else {
      // If unchecking (shouldn't happen with radio buttons but keeping as safeguard)
      setCheckedValues([]);
      setSubRole([]);
    }
  };

  // Function to handle subrole selection
  const handleSubRoleChange = (event, roleType) => {
    const selectedSubRole = event.target.value;
    const roleIndex = checkedValues.indexOf(roleType);
    
    if (roleIndex !== -1) {
      setSubRole((prev) => {
        const newSubRoles = [...prev];
        newSubRoles[roleIndex] = selectedSubRole;
        return newSubRoles;
      });
    }
  };

  const handleFileUpload = (files) => {
    setFiles(files);
  };

  const buildReviewersList = () => {
    switch(formData.category) {
      case "ES-A":
        // Return the single selected reviewer
        return checkedValues;
        
      case "ES-B":
      case "BR-B2":
        // Always Chairman
        return ["CHAIRMAN"];
        
      case "BR-A":
        if (checkedValues.includes("DIRECTOR")) {
          // If Director is selected, only Director approves
          return ["DIRECTOR"];
        } else if (checkedValues.length > 0 && formData.secondaryAuthority) {
          // Primary + Secondary authorities
          return [checkedValues[0], formData.secondaryAuthority];
        }
        return checkedValues; // Fallback
        
      case "BR-B1":
        if (checkedValues.length > 0 && formData.secondaryAuthority) {
          // Dean + Secondary authority
          return [checkedValues[0], formData.secondaryAuthority];
        }
        return checkedValues; // Fallback
        
      default:
        return checkedValues;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    //Handle form validation
    let passed = true;

    // Validate mobile number
    if (!formData.applicant.mobile.match(/^\d{10}$/)) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }

    // Calculate max allowed arrival date (today + 3 months)
    const maxArrivalDate = new Date();
    maxArrivalDate.setMonth(maxArrivalDate.getMonth() + 3);

    // Get arrival and departure dates
    const arrivalDateTime = new Date(`${formData.arrivalDate}T${formData.arrivalTime}`);
    const departureDateTime = new Date(`${formData.departureDate}T${formData.departureTime}`);

    // Check if arrival date is within allowed range
    if (arrivalDateTime > maxArrivalDate) {
      toast.error("Booking can only be made up to 3 months in advance");
      return;
    }

    // Calculate stay duration in days
    const stayDuration = (departureDateTime - arrivalDateTime) / (1000 * 60 * 60 * 24);
    if (stayDuration > 10) {
      toast.error("Maximum booking duration is 10 days");
      return;
    }

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
      } else if (patterns[key] && !value.match(patterns[key])) {
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

    // Check if no of rooms are Sufficient for Double occupancy
    if (formData.roomType === "Double Occupancy") {
      const numberOfGuests = parseInt(formData.numberOfGuests);
      const numberOfRooms = parseInt(formData.numberOfRooms);
      if (2 * numberOfRooms < numberOfGuests) {
        setErrorText((prev) => ({
          ...prev,
          numberOfRooms:
            "Number of rooms are not sufficient as per number of guests and room type",
        }));
        passed = false;
        toast.error(
          "Number of rooms are not sufficient as per number of guests and room type"
        );
        return;
      }
    }

    // Check if no of rooms are Sufficient for Single occupancy
    if (formData.roomType === "Single Occupancy") {
      const numberOfGuests = parseInt(formData.numberOfGuests);
      const numberOfRooms = parseInt(formData.numberOfRooms);
      if (numberOfRooms < numberOfGuests) {
        setErrorText((prev) => ({
          ...prev,
          numberOfRooms:
            "Number of rooms are not sufficient as per number of guests and room type",
        }));
        passed = false;
        toast.error(
          "Number of rooms are not sufficient as per number of guests and room type"
        );
        return;
      }
    }

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

    // if (formData.arrivalTime < "13:00") {
    //   toast.error("Arrival time should be after 01:00 PM");
    //   return;
    // }

    if (formData.departureTime > "11:00") {
      toast.error("Departure time should be before 11:00 AM");
      return;
    }

    for (let [key, value] of Object.entries(formData.applicant)) {
      if (value === "") {
        passed = false;
      }
    }
    if (checkedValues.length === 0) {
      toast.error("Please add a reviewer/reviewers");
      return;
    }

    console.log(checkedValues);
    console.log(subRole);

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

    if (
      formData.applicant.email.match("[a-z0-9._%+-]+@iitrpr.ac.in$") === null
    ) {
      toast.error("Please enter a valid IIT Ropar email address for applicant");
      return;
    }
    // —————— NEW: require sourceName when source is DEPARTMENT or OTHERS ——————
    if (
      (formData.source === "DEPARTMENT" || formData.source === "OTHERS") &&
      !formData.sourceName.trim()
    ) {
      toast.error(
        `Please specify the ${
          formData.source === "DEPARTMENT" ? "department" : "other source"
        }`
      );
      // if you want inline helper text:
      setErrorText((prev) => ({
        ...prev,
        sourceName: "This field is required",
      }));
      return;
    }
    // ————————————————————————————————————————————————————————————————

    if (!passed) {
      toast.error("Please Fill All Necessary Fields Correctly.");
      return;
    }

    if (
      (formData.category === "ES-A" || formData.category === "ES-B") &&
      Array.from(files).length === 0
    ) {
      toast.error("Uploading files is mandatory for category ES-A and ES-B");
      return;
    }

    // Handle form submission
    setLoading(true);
    
    try {
      // Generate PDF receipt with better error handling
      console.log("Attempting to generate receipt...");
      const receipt = await updateFilledPDF(formData);
      
      if (!receipt) {
        toast.error("Failed to generate receipt. Please ensure all fields are filled correctly.");
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
        } else if (fieldName === "signature" && fieldValue) {
          // Signature needs to be stringified just like applicant data
          formDataToSend.append(fieldName, JSON.stringify(fieldValue));
        } else if (fieldName === "sourceName") {
          // Skip sourceName here - we'll handle it separately
          // This prevents duplicate sourceName entries
        } else {
          // Use the original category value (no mapping)
          formDataToSend.append(fieldName, fieldValue);
        }
      });
      // Add the free-text sourceName only if source is not GUEST
      if(formData.source !== "GUEST" && formData.sourceName) {
        formDataToSend.append("sourceName", formData.sourceName);
      }
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
      
      // Add reviewers and subroles
      let formattedReviewers = [];
      
      // Handle specific reviewer cases based on category
      if (formData.category === "ES-B" || formData.category === "BR-B2") {
        // Chairman is always the only reviewer for these categories
        formattedReviewers = ["CHAIRMAN"];
      }
      else if (formData.category === "BR-A") {
        // BR-A has three cases: Director alone, Registrar alone, or Dean + Associate Dean
        if (checkedValues.includes("DIRECTOR")) {
          formattedReviewers = ["DIRECTOR"];
        } 
        else if (checkedValues.includes("REGISTRAR")) {
          formattedReviewers = ["REGISTRAR"];
        }
        else if (checkedValues.length === 2) {
          // Dean + Associate Dean case
          formattedReviewers = [...checkedValues];
        }
        else if (checkedValues.length === 1 && Deans.includes(checkedValues[0])) {
          // Only Dean selected without Associate Dean (incomplete)
          toast.error("For BR-A with Dean, you must also select an Associate Dean as secondary authority");
          setLoading(false);
          return;
        }
      }
      else if (formData.category === "BR-B1" && checkedValues.length === 2) {
        // For BR-B1, add the primary and secondary authorities
        formattedReviewers = [...checkedValues];
      }
      else {
        // For other cases, use the checked values directly
        formattedReviewers = [...checkedValues];
      }
      
      // Make sure we have at least one reviewer
      if (formattedReviewers.length === 0) {
        toast.error("No approving authorities selected. Please select the required authorities.");
        setLoading(false);
        return;
      }
      
      console.log("Final reviewers to be submitted:", formattedReviewers);
      
      // Add reviewers to formData
      formDataToSend.append('reviewers', formattedReviewers.join(','));
      
      // Add empty subroles for compatibility
      const subrolesArray = new Array(formattedReviewers.length).fill("Select");
      formDataToSend.append('subroles', subrolesArray.join(','));
      
      // Add receipt file (REQUIRED by server)
      if (!receiptFile) {
        // Create a dummy receipt file if none is provided
        const dummyBlob = new Blob(['Receipt placeholder'], { type: 'application/pdf' });
        const dummyFile = new File([dummyBlob], 'receipt.pdf', { type: 'application/pdf' });
        formDataToSend.append('receipt', dummyFile);
      } else {
        formDataToSend.append('receipt', receiptFile);
      }
      
      // Show loading toast
      const toast_id = toast.loading("Submitting reservation...");
      
      // Submit the form
      console.log("Submitting form data to server...", [...formDataToSend.entries()].map(([key, value]) => 
        key === 'receipt' ? `${key}: [File]` : `${key}: ${value instanceof File ? value.name : value}`
      ));
      
      try {
        // Set a timeout to handle hanging requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        );
        
        // Race between actual request and timeout
        const res = await Promise.race([
          http.post("reservation/", formDataToSend, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }),
          timeoutPromise
        ]);
        
        // Handle response
        console.log("Server response:", res.status, res.data);
        if (res.status === 200) {
          toast.update(toast_id, {
            render: "Reservation submitted successfully!",
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
          setLoading(false);
          navigate("..");
        } else {
          toast.update(toast_id, {
            render: `Reservation submission failed: ${res.status}`,
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Form submission network error:", error);
        toast.update(toast_id, {
          render: error.message || "Network error. Please try again.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setLoading(false);
      toast.error(error.response?.data?.message || "Form submission failed. Please try again.");
    }
  };

  const [showCheckbox, setShowCheckbox] = useState(true);

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
        code: userData.employeeId || userData.studentId || prev.applicant.code || userData.ecode || "",
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

  // First, add a helper function to parse and display secondary authority values
  const getSecondaryAuthorityDisplayValue = (value) => {
    if (!value || value === "Select") return "Select Secondary Authority";
    
    if (value === "REGISTRAR") return "Registrar";
    
    // Handle Associate Deans
    if (value.startsWith("")) {
      return `Associate Dean - ${value.replace("ASSOCIATE DEAN ", "")}`;
    }
    
    // Handle HODs
    if (value.startsWith("HOD ")) {
      return `HoD - ${value.replace("HOD ", "")}`;
    }
    
    return value;
  };

  // Function to validate category-specific approval requirements
  const validateCategoryApproval = () => {
    const { category, primaryAuthority, secondaryAuthority } = formData;
    let isValid = true;
    let errorMessage = "";
    
    switch (category) {
      case "ES-A":
        // Any one from Director or any Dean
        if (checkedValues.length === 0 || !catESAReviewers.includes(checkedValues[0])) {
          errorMessage = "For category ES-A, please select Director or any Dean as approving authority";
          isValid = false;
        }
        break;
        
      case "ES-B":
        // Chairman only - automatically selected, so should always be valid
        if (checkedValues.length !== 1 || checkedValues[0] !== "CHAIRMAN") {
          // Auto-select if not already selected
          setCheckedValues(["CHAIRMAN"]);
        }
        break;
        
      case "BR-A":
        // Either Director alone OR Registrar alone OR Dean + Associate Dean
        if (checkedValues.includes("DIRECTOR")) {
          // Director only case - valid
          if (checkedValues.length !== 1) {
            errorMessage = "For BR-A with Director, only Director should be selected";
            isValid = false;
          }
        } else if (checkedValues.includes("REGISTRAR")) {
          // Registrar alone - valid
          if (checkedValues.length !== 1) {
            errorMessage = "For BR-A with Registrar, no secondary authority should be selected";
            isValid = false;
          }
        } else if (checkedValues.length > 0 && Deans.includes(checkedValues[0])) {
          // Dean + Associate Dean case
          if (checkedValues.length !== 2) {
            errorMessage = "For BR-A with Dean, you must also select an Associate Dean as secondary authority";
            isValid = false;
          } else {
            const secondAuthority = checkedValues.find(val => val !== checkedValues[0]);
            if (!secondAuthority || !AssociateDeans.includes(secondAuthority)) {
              errorMessage = "For category BR-A with Dean, secondary authority must be an Associate Dean";
              isValid = false;
            }
          }
        } else {
          errorMessage = "For category BR-A, select either Director alone, Registrar alone, or a Dean with an Associate Dean";
          isValid = false;
        }
        break;
        
      case "BR-B1":
        // Any Dean + (any Associate Dean OR any HOD OR Registrar)
        if (checkedValues.length !== 2) {
          errorMessage = "For category BR-B1, you must select both a Dean and a secondary authority";
          isValid = false;
        } else {
          // Check if a Dean is selected
          const selectedDean = checkedValues.find(val => Deans.includes(val));
          if (!selectedDean) {
            errorMessage = "For category BR-B1, primary authority must be a Dean";
            isValid = false;
          }
          
          // Check if secondary authority is valid
          const secondAuthority = checkedValues.find(val => !Deans.includes(val));
          if (!secondAuthority || 
              (!AssociateDeans.includes(secondAuthority) && 
               !Hods.includes(secondAuthority) && 
               secondAuthority !== "REGISTRAR")) {
            errorMessage = "For category BR-B1, secondary authority must be an Associate Dean, HOD, or Registrar";
            isValid = false;
          }
        }
        break;
        
      case "BR-B2":
        // Chairman only - automatically selected, so should always be valid
        if (checkedValues.length !== 1 || checkedValues[0] !== "CHAIRMAN") {
          // Auto-select if not already selected
          setCheckedValues(["CHAIRMAN"]);
        }
        break;
        
      default:
        errorMessage = "Please select a valid category";
        isValid = false;
    }
    
    if (!isValid) {
      toast.error(errorMessage);
      setValidationError(errorMessage);
    } else {
      setValidationError("");
    }
    
    return isValid;
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
            <FormControl fullWidth className="bg-white mb-4">
              <InputLabel id="gender-label">Guest Gender*</InputLabel>
              <Select
                labelId="gender-label"
                name="guestGender"
                value={formData.guestGender}
                onChange={handleChange}
                label="Guest Gender"
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
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
              max={new Date(2999, 11, 31).toISOString().split("T")[0]}
            />
          </div>

          <div className="form-group">
            <label>Arrival Time:* </label>
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
              max={new Date(2999, 11, 31).toISOString().split("T")[0]}
            />
          </div>
          <div className="form-group">
            <label>
              Departure Time*: (Departure time must be before 11:00 AM)
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
              onChange={handleCategoryChange}
              value={formData.category}
            >
              {Object.entries(categoryInfo).map(([categoryCode, categoryName]) => (
                <option key={categoryCode} value={categoryCode}>
                  {categoryName}
                </option>
              ))}
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
        {validationError && <div className="text-red-500 text-sm mb-2">{validationError}</div>}
        
        {/* Category-specific instructions */}
        <div className="text-sm text-gray-600 mb-3 whitespace-normal overflow-visible">
          {formData.category === "ES-A" && "Select one authority: Director or any Dean"}
          {formData.category === "ES-B" && "Chairman is automatically selected"}
          {formData.category === "BR-A" && "Select one: Director OR Registrar OR any Dean (with Associate/Concerned Dean)"}
          {formData.category === "BR-B1" && "Select a Dean as primary plus a secondary authority"}
          {formData.category === "BR-B2" && "Chairman is automatically selected"}
        </div>
        
        {/* ES-A: Using Clean Dropdown */}
        {formData.category === "ES-A" && (
          <FormControl fullWidth variant="outlined" className="mb-4">
            <InputLabel>Select Approving Authority</InputLabel>
            <Select
              value={checkedValues.length > 0 ? checkedValues[0] : ""}
              onChange={(e) => {
                setCheckedValues([e.target.value]);
                setFormData({...formData, primaryAuthority: e.target.value});
              }}
              label="Select Approving Authority"
            >
              <MenuItem value="DIRECTOR">DIRECTOR</MenuItem>
              <ListSubheader>Deans</ListSubheader>
              {Deans.map(dean => (
                <MenuItem key={dean} value={dean}>{dean}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        {/* ES-B: Using Clean Dropdown (disabled) */}
        {formData.category === "ES-B" && (
          <FormControl fullWidth variant="outlined" className="mb-4">
            <InputLabel>Approving Authority</InputLabel>
            <Select
              value="CHAIRMAN"
              label="Approving Authority"
              disabled
            >
              <MenuItem value="CHAIRMAN">CHAIRMAN</MenuItem>
            </Select>
            <div className="mt-2 text-sm text-blue-600">
              <i className="fas fa-info-circle"></i> Request will be sent to the Chairman
            </div>
          </FormControl>
        )}
        
        {/* BR-A: Primary Authority Dropdown with Conditional Secondary */}
        {formData.category === "BR-A" && (
          <>
            <FormControl fullWidth variant="outlined" className="mb-3">
              <InputLabel>Primary Authority</InputLabel>
              <Select
                value={formData.primaryAuthority !== "Select" ? formData.primaryAuthority : ""}
                onChange={(e) => {
                  if (e.target.value === "DIRECTOR") {
                    // Director only
                    setCheckedValues(["DIRECTOR"]);
                    setFormData({...formData, primaryAuthority: e.target.value, secondaryAuthority: "Select"});
                  } else if (e.target.value === "REGISTRAR") {
                    // Registrar only
                    setCheckedValues(["REGISTRAR"]);
                    setFormData({...formData, primaryAuthority: e.target.value, secondaryAuthority: "Select"});
                  } else if (Deans.includes(e.target.value)) {
                    // Dean selected, will need a secondary authority
                    setCheckedValues([e.target.value]);
                    setFormData({...formData, primaryAuthority: e.target.value, secondaryAuthority: "Select"});
                  }
                }}
                label="Primary Authority"
                MenuProps={{
                  PaperProps: { style: { maxHeight: 300 } }
                }}
              >
                <MenuItem value="DIRECTOR">DIRECTOR</MenuItem>
                <MenuItem value="REGISTRAR">REGISTRAR</MenuItem>
                <ListSubheader style={{ lineHeight: '30px', backgroundColor: '#f5f5f5' }}>Deans</ListSubheader>
                {Deans.map(dean => (
                  <MenuItem key={dean} value={dean}>
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{dean}</div>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Secondary Dropdown (only shows if Dean is selected) */}
            {formData.primaryAuthority !== "Select" && 
             formData.primaryAuthority !== "DIRECTOR" && 
             formData.primaryAuthority !== "REGISTRAR" && 
             Deans.includes(formData.primaryAuthority) && (
              <FormControl fullWidth variant="outlined" className="mb-3">
                <InputLabel>Secondary Authority</InputLabel>
                <Select
                  value={formData.secondaryAuthority !== "Select" ? formData.secondaryAuthority : ""}
                  onChange={(e) => {
                    setFormData({...formData, secondaryAuthority: e.target.value});
                    setCheckedValues([formData.primaryAuthority, e.target.value]);
                  }}
                  label="Secondary Authority"
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 300 } }
                  }}
                >
                  <ListSubheader style={{ lineHeight: '30px', backgroundColor: '#f5f5f5' }}>Associate Deans</ListSubheader>
                  {AssociateDeans.map(assocDean => (
                    <MenuItem key={assocDean} value={assocDean}>
                      <div style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{assocDean}</div>
                    </MenuItem>
                  ))}
                </Select>
                {formData.secondaryAuthority !== "Select" && (
                  <div className="mt-2 text-sm text-blue-600 whitespace-normal">
                    <i className="fas fa-info-circle mr-1"></i>
                    Request will be sent to both {formData.primaryAuthority} and {formData.secondaryAuthority}
                  </div>
                )}
              </FormControl>
            )}
            
            {/* Info for single authority selections */}
            {(formData.primaryAuthority === "DIRECTOR" || formData.primaryAuthority === "REGISTRAR") && (
              <div className="mt-2 text-sm text-blue-600 whitespace-normal">
                <i className="fas fa-info-circle mr-1"></i>
                Request will be sent to the {formData.primaryAuthority}
              </div>
            )}
          </>
        )}
        
        {/* BR-B1: Primary and Secondary Dropdowns */}
        {formData.category === "BR-B1" && (
          <>
            <FormControl fullWidth variant="outlined" className="mb-3">
              <InputLabel>Primary Authority (Dean)</InputLabel>
              <Select
                value={formData.primaryAuthority !== "Select" ? formData.primaryAuthority : ""}
                onChange={(e) => {
                  setCheckedValues([e.target.value]);
                  setFormData({...formData, primaryAuthority: e.target.value, secondaryAuthority: "Select"});
                }}
                label="Primary Authority (Dean)"
              >
                {Deans.map(dean => (
                  <MenuItem key={dean} value={dean}>{dean}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth variant="outlined" className="mb-3" 
              disabled={formData.primaryAuthority === "Select"}
            >
              <InputLabel>Secondary Authority</InputLabel>
              <Select
                value={formData.secondaryAuthority !== "Select" ? formData.secondaryAuthority : ""}
                onChange={(e) => {
                  setFormData({...formData, secondaryAuthority: e.target.value});
                  if (formData.primaryAuthority !== "Select") {
                    setCheckedValues([formData.primaryAuthority, e.target.value]);
                  }
                }}
                label="Secondary Authority"
              >
                <MenuItem value="REGISTRAR">REGISTRAR</MenuItem>
                <ListSubheader>Associate Deans</ListSubheader>
                {AssociateDeans.map(assocDean => (
                  <MenuItem key={assocDean} value={assocDean}>{assocDean}</MenuItem>
                ))}
                <ListSubheader>Heads of Departments</ListSubheader>
                {Hods.map(hod => (
                  <MenuItem key={hod} value={hod}>
                  <div style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{hod}</div>
                </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {formData.primaryAuthority !== "Select" && formData.secondaryAuthority !== "Select" && (
              <div className="mt-2 text-sm text-blue-600">
                <i className="fas fa-info-circle"></i> Request will be sent to both {formData.primaryAuthority} and {formData.secondaryAuthority}
              </div>
            )}
          </>
        )}
        
        {/* BR-B2: Using Clean Dropdown (disabled) */}
        {formData.category === "BR-B2" && (
          <FormControl fullWidth variant="outlined" className="mb-4">
            <InputLabel>Approving Authority</InputLabel>
            <Select
              value="CHAIRMAN"
              label="Approving Authority"
              disabled
            >
              <MenuItem value="CHAIRMAN">CHAIRMAN</MenuItem>
            </Select>
            <div className="mt-2 text-sm text-blue-600">
              <i className="fas fa-info-circle"></i> Request will be sent to the Chairman
            </div>
          </FormControl>
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
                  {/* ————————————————————————————— Popup for Department/Other ————————————————————————————— */}
                  {openSourceDialog && (
                    <Dialog open onClose={() => setOpenSourceDialog(false)}>
                      <DialogTitle>
                        {formData.source === "DEPARTMENT"
                          ? "Enter Department Name"
                          : "Specify Other Source"}
                      </DialogTitle>
                      <DialogContent>
                        <TextField
                          autoFocus
                          margin="dense"
                          fullWidth
                          label={formData.source === "DEPARTMENT" ? "Department" : "Source"}
                          value={tempSourceName}
                          onChange={e => {
                            setTempSourceName(e.target.value);
                            setErrorText((p) => ({ ...p, sourceName: "" })); 
                          }}      
                          error={!!errorText.sourceName}
                          helperText={errorText.sourceName}                                          
                        />
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={() => setOpenSourceDialog(false)}>Cancel</Button>
                        <Button
                          onClick={() => {
                            if (!tempSourceName.trim()) {
                              setErrorText((p) => ({ ...p, sourceName: "This field is required" }));
                              return;
                            }                        
                            setFormData(prev => ({ ...prev, sourceName: tempSourceName }));
                            setOpenSourceDialog(false);
                            setErrorText((p) => ({ ...p, sourceName: "" })); 
                          }}
                          variant="contained"
                        >
                          Save
                        </Button>
                      </DialogActions>
                    </Dialog>
                  )}

                  {/* show compact chip once saved */}
                  {formData.sourceName && (
                    <Chip
                      label={formData.sourceName}
                      size="small"
                      sx={{ mt: 1, mb: 2 }}
                    />
                  )}
                  {/* —————————————————————————————————————————————————————————————————————————————— */}

                </>
              )}

            Add attachements for proof of category (if any):
            <div className="flex mt-2 gap-10">
              <div>
                <InputFileUpload className="" onFileUpload={handleFileUpload} />
              </div>

              {Array.from(files).length > 0 ? (
                <div className="flex flex-col  overflow-y-auto max-w-[30rem] h-16 gap-2 pr-2">
                  {Array.from(files).map((file, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-md bg-gray-100 flex gap-2 items-center"
                    >
                      <div className="w-8 h-8">
                          <FileIcon
                          extension={file.name.split(".").pop()}
                          {...defaultStyles[file.name.split(".").pop()]}
                          />
                        </div>
                      <span className="text-sm truncate max-w-[150px]">
                          {file.name}
                      </span>
                        </div>
                  ))}
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
