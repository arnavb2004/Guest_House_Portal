import React, { useEffect, useState } from "react";

import Checkbox from "@mui/material/Checkbox";
import { useSelector, useDispatch } from "react-redux";
import { privateRequest } from "../utils/useFetch";
import { useLocation, useNavigate } from "react-router-dom";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import Button from "@mui/material/Button";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import TextField from "@mui/material/TextField";
import { getDate } from "../utils/handleDate";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, CircularProgress, List, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import httpService from "../utils/httpService";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import JSZip from 'jszip';
import { Stack } from "@mui/material";

import { 
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import InputFileUpload from "../components/uploadFile";
import { FileIcon, defaultStyles } from "react-file-icon";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function RecordList({ status = "pending", desc }) {
  const [checked, setChecked] = useState([]);
  const [values, setValues] = useState([]);
  const user = useSelector((state) => state.user);
  const [records, setRecords] = useState([]);
  const [newRecords, setNewRecords] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState("Loading");
  const [sortType, setSortType] = useState("");
  const [sortToggle, setSortToggle] = useState(false);
  const location = useLocation();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [files, setFiles] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [zipContents, setZipContents] = useState([]);
  const [isZipFile, setIsZipFile] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);
  const [selectedZipContent, setSelectedZipContent] = useState(null);
  const [selectedContentData, setSelectedContentData] = useState(null);

  const filterMap = {
    "Guest Name": "guestName",
    "#Rooms": "numberOfRooms",
    "#Guests": "numberOfGuests",
    Category: "category",
    "Arrival Date": "arrivalDate",
    "Departure Date": "departureDate",
    "Room Type": "roomType",
  };
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
  const navigate = useNavigate();
  const isAdminOrChairman = user.role === "ADMIN" || user.role === "CHAIRMAN";

  const http = privateRequest(user.accessToken, user.refreshToken);

  const fetchRecords = async () => {
    try {
      let res;
      switch (desc) {
        case "current-requests":
          res = await http.get("/reservation/current");
          break;

        case "payment-pending":
          res = await http.get("/reservation/payment/pending");
          break;

        case "late-checkout":
          res = await http.get("/reservation/late");
          break;

        case "checked-out":
          res = await http.get("/reservation/checkedout");
          break;

        case "checkout-today":
          res = await http.get("/reservation/checkout/today");
          break;

        default:
          res = await http.get("/reservation/" + status);
          break;
      }
      const reservations = res.data;
      console.log(reservations);
      setValues(reservations.map((res) => res._id));
      setRecords(reservations);
      setNewRecords(reservations);
      setLoadingStatus("Success");
    } catch (err) {
      if (err.response?.data?.message) toast.error(err.response.data.message);
      else toast.error("Error fetching records");
      setLoadingStatus("Error");
    }
  };
  useEffect(() => {
    setLoadingStatus("Loading");
    fetchRecords();
  }, [status, desc]);

  const dispatch = useDispatch();
  console.log(checked);
  const handleToggle = (value) => () => {
    const currentIndex = checked.indexOf(value);

    if (value === "#") {
      if (currentIndex === -1) {
        setChecked([...values, "#"]);
      } else {
        setChecked([]);
      }

      return;
    }

    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [searchChoice, setSearchChoice] = useState("Filter");

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filterRecords = () => {
    const tempRecords = records.filter((record) => {
      if (typeof record[filterMap[searchChoice]] === "string") {
        if (
          searchChoice === "Arrival Date" ||
          searchChoice === "Departure Date"
        ) {
          const date = new Date(record[filterMap[searchChoice]]);
          const formattedDate = getDate(date);

          return formattedDate.includes(searchTerm);
        } else {
          return record[filterMap[searchChoice]]
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        }
      } else {
        const inputNum = parseInt(searchTerm);
        const num = record[filterMap[searchChoice]];
        return num === inputNum;
      }
    });

    setNewRecords(tempRecords);
  };

  useEffect(() => {
    if (searchTerm) filterRecords();
    else setNewRecords(records);
  }, [searchTerm, searchChoice]);

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const options = [
    "Guest Name",
    "#Rooms",
    "#Guests",
    "Category",
    ...(user.role !== "USER" ? ["Arrival Date", "Departure Date"] : []),
    "Room Type",
  ];

  const handleSortToggle = (event) => {
    const type = event.target.outerText;
    setSortType(type);
    setSortToggle(!sortToggle);
  };

  useEffect(() => {
    const handleSort = () => {
      const tempRecords = [...newRecords];
      if (sortToggle) {
        if (sortType === "#Guests") {
          tempRecords.sort((a, b) => {
            return a.numberOfGuests - b.numberOfGuests;
          });
        } else if (sortType === "#Rooms") {
          tempRecords.sort((a, b) => {
            return a.numberOfRooms - b.numberOfRooms;
          });
        } else if (sortType === "Category") {
          tempRecords.sort((a, b) => {
            if (a.category > b.category) return 1;
            else return -1;
          });
        } else if (sortType === "Arrival Date") {
          tempRecords.sort((a, b) => {
            return new Date(a.arrivalDate) - new Date(b.arrivalDate);
          });
        } else if (sortType === "Departure Date") {
          tempRecords.sort((a, b) => {
            return new Date(b.departureDate) - new Date(a.departureDate);
          });
        }
      } else {
        if (sortType === "#Guests") {
          tempRecords.sort((a, b) => {
            return b.numberOfGuests - a.numberOfGuests;
          });
        } else if (sortType === "#Rooms") {
          tempRecords.sort((a, b) => {
            return b.numberOfRooms - a.numberOfRooms;
          });
        } else if (sortType === "Category") {
          tempRecords.sort((a, b) => {
            if (b.category > a.category) return 1;
            else return -1;
          });
        } else if (sortType === "Arrival Date") {
          tempRecords.sort((a, b) => {
            return new Date(b.arrivalDate) - new Date(a.arrivalDate);
          });
        } else if (sortType === "Departure Date") {
          tempRecords.sort((a, b) => {
            return new Date(b.departureDate) - new Date(a.departureDate);
          });
        }
      }
      setNewRecords(tempRecords);
    };
    handleSort();
  }, [sortToggle, sortType]);

  const handleEditClick = (record) => {
    // Pre-fill the form with the record data
    setEditFormData({
      ...record,
      signatureMethod: record.signature ? record.signature.type : 'type', // Default to 'type' if no signature
      signatureText: record.signature && record.signature.type === 'text' ? record.signature.data : '',
      // For BR-B1 category with special handling
      primaryDean: record.category === "BR-B1" && record.approvers ? 
                  (record.approvers.find(a => a.role === "DEAN")?.subrole || "") : "",
      secondaryAuthority: record.category === "BR-B1" ? record.secondaryAuthority || "" : "",
      // For other categories
      authority: record.category !== "BR-B1" && record.approvers && record.approvers.length > 0 ? 
                record.approvers[0].role : ""
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async () => {
    try {
      // Create FormData object
      const formData = new FormData();
      
      // Append basic form data
      formData.append('guestName', editFormData.guestName);
      formData.append('category', editFormData.category);
      formData.append('arrivalDate', new Date(editFormData.arrivalDate).toISOString());
      formData.append('departureDate', new Date(editFormData.departureDate).toISOString());
      
      // Append mobile number if exists
      if (editFormData.applicant?.mobile) {
        formData.append('applicant[mobile]', editFormData.applicant.mobile);
      }

      // Append payment source if exists
      if (editFormData.source) {
        formData.append('source', editFormData.source);
      }
      
      // Append authority information
      if (editFormData.category === "BR-B1") {
        if (editFormData.primaryDean) {
          formData.append('primaryDean', editFormData.primaryDean);
        }
        if (editFormData.secondaryAuthority) {
          formData.append('secondaryAuthority', editFormData.secondaryAuthority);
        }
      } else if (editFormData.authority) {
        formData.append('authority', editFormData.authority);
      }
      
      // Append signature information
      if (editFormData.signatureMethod === 'type' && editFormData.signatureText) {
        formData.append('signature[type]', 'text');
        formData.append('signature[data]', editFormData.signatureText);
      } else if (editFormData.signatureMethod === 'upload' && editFormData.signatureImage) {
        formData.append('signature[type]', 'image');
        formData.append('signature[data]', editFormData.signatureImage);
      } else if (editFormData.signature) {
        // Preserve existing signature if no changes
        formData.append('signature[type]', editFormData.signature.type);
        formData.append('signature[data]', editFormData.signature.data);
      }

      // Append each file
      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });
      }

      // Make API call with FormData
      await http.put(
        `/reservation/edit/${editFormData._id}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success("Reservation updated successfully");
      await fetchRecords(); // Refresh the records
      setOpenEditDialog(false);
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || "Error updating reservation");
    }
  };

  const categoryInfo = {
    "ES-A": "Executive Suite - Category A (Free)",
    "ES-B": "Executive Suite - Category B (₹3500)",
    "BR-A": "Business Room - Category A (Free)",
    "BR-B1": "Business Room - Category B1 (₹2000)",
    "BR-B2": "Business Room - Category B2 (₹1200)"
  };

  // Function to process zip file contents
  const processZipFile = async (blob) => {
    setLoadingZip(true);
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(blob);
      
      const contents = [];
      
      // Process files and folders
      for (const [path, file] of Object.entries(zipData.files)) {
        if (!file.dir) {
          const extension = path.split('.').pop().toLowerCase();
          const isViewable = ['txt', 'md', 'json', 'js', 'jsx', 'html', 'css', 'xml', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension);
          
          contents.push({
            path,
            name: path.split('/').pop(),
            dir: file.dir,
            date: new Date(file.date).toLocaleString(),
            size: file.dir ? '-' : formatFileSize(file._data.uncompressedSize),
            isViewable
          });
        } else {
          // Add folder entry
          contents.push({
            path,
            name: path,
            dir: true,
            date: new Date(file.date).toLocaleString(),
            size: '-',
            isViewable: false
          });
        }
      }
      
      setZipContents(contents);
      setLoadingZip(false);
    } catch (error) {
      console.error("Error processing zip file:", error);
      toast.error("Failed to process zip file");
      setLoadingZip(false);
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to view content of a file within the zip
  const viewZipContent = async (item) => {
    setSelectedZipContent(item);
    setLoadingZip(true);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(await fetch(previewUrl).then(res => res.blob()));
      
      // Get the file extension
      const fileExtension = item.path.split('.').pop().toLowerCase();
      
      if (fileExtension === 'pdf') {
        // For PDF files, extract as array buffer and create a blob URL
        const pdfData = await zipData.file(item.path).async("arraybuffer");
        const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setSelectedContentData(pdfUrl);
      } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(fileExtension)) {
        // For image files, extract as base64 and create a data URL
        const imageData = await zipData.file(item.path).async("base64");
        const mimeType = `image/${fileExtension === 'svg' ? 'svg+xml' : fileExtension}`;
        setSelectedContentData(`data:${mimeType};base64,${imageData}`);
      } else if (item.isViewable) {
        // For text files, extract as string
        const fileData = await zipData.file(item.path).async("string");
        setSelectedContentData(fileData);
      } else {
        toast.info("This file type cannot be previewed");
      }
      
      setLoadingZip(false);
    } catch (error) {
      console.error("Error reading file from zip:", error);
      toast.error("Failed to read file");
      setLoadingZip(false);
    }
  };

  const handleFileUpload = (uploadedFiles) => {
    setFiles(uploadedFiles);
    // Update formData with new files
    setEditFormData(prev => ({
      ...prev,
      files: uploadedFiles
    }));
  };

  return (
    <div className="flex p-2 px-0 w-full flex-col">
      {/* Title Section */}
      <div className='text-center text-2xl font-["Dosis"] font-semibold py-2 uppercase'>
        {desc ? desc.toUpperCase().split("-").join(" ") : status + " requests"}
      </div>
  
      {/* Search & Dropdown */}
      <div className="grid grid-cols-12 gap-8 mb-4">
        <div className="h-10 col-span-2 flex flex-col justify-center relative">
          <Button
            variant="contained"
            size="small"
            onClick={toggleDropdown}
            endIcon={isOpen ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
            style={{ backgroundColor: "#365899", color: "#FFF" }}
            className="h-full"
          >
            {searchChoice}
          </Button>
          {isOpen && (
            <div className="absolute top-12 z-10 mt-2 py-2 w-full bg-white border border-gray-300 rounded-md shadow-lg">
              {options.map((option) => (
                <button
                  key={option}
                  className="block px-4 py-2 text-gray-800 hover:bg-gray-200 w-full text-left"
                  onClick={() => {
                    setSearchChoice(option);
                    setIsOpen(!isOpen);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        <TextField
          label="Search items"
          variant="outlined"
          className="col-span-10 w-full"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
  
      {/* Table Container */}
      <div
        className="bg-gray-50 rounded-md overflow-hidden"
        style={{ width: "100%", padding: "0px" }}
      >
        {/* Header Row */}
        <div className="font-semibold border-b-2 text-[1.13vw] w-full h-15">
          <div className="p-1 px-4 flex gap-4 w-full items-center justify-around text-center">
            <div className="flex items-center gap-2 w-[15%] overflow-hidden pl-1">
              <Checkbox
                edge="start"
                color="secondary"
                checked={checked.indexOf("#") !== -1}
                tabIndex={-1}
                onClick={handleToggle("#")}
                disableRipple
              />
              <div onClick={handleSortToggle} className="w-full cursor-pointer">
                Name
              </div>
            </div>
            <div onClick={handleSortToggle} className="w-[8%] cursor-pointer pl-1">
              #Guests
            </div>
            <div onClick={handleSortToggle} className="w-[8%] cursor-pointer pl-1">
              #Rooms
            </div>
            <div onClick={handleSortToggle} className="w-[5%] cursor-pointer pl-1">
              Category
            </div>
            <div onClick={handleSortToggle} className="w-[10%] cursor-pointer pl-1">
              Arrival Date
            </div>
            <div onClick={handleSortToggle} className="w-[10%] cursor-pointer pl-1">
              Departure Date
            </div>
            <div onClick={handleSortToggle} className="w-[10%] cursor-pointer pl-1">
              Room Type
            </div>
            <div onClick={handleSortToggle} className="w-[10%] cursor-pointer pl-1">
              Room Assigned
            </div>
            <div className="flex justify-evenly items-center gap-4 w-[8%]">
              <IconButton size="small">
                <InsertDriveFileIcon />
              </IconButton>
              <IconButton size="small">
                <VisibilityIcon />
              </IconButton>
              {status === "rejected" && (
                <IconButton size="small">
                  <EditIcon className="text-blue-500" />
                </IconButton>
              )}
            </div>
            <div />
          </div>
        </div>
  
        {/* Record Rows */}
        {loadingStatus === "Success" && newRecords.length > 0 && (
          <div className="h-96 overflow-y-auto">
            {newRecords.map((record) => {
              const labelId = `checkbox-list-label-${record._id}`;
              return (
                <div
                  key={record._id}
                  className="border-b-[1px] border-gray-100 items-center flex gap-4 text-center justify-around px-4 p-1 text-[1vw]"
                >
                  <div className="flex items-center gap-2 w-[15%] overflow-hidden">
                    <Checkbox
                      edge="start"
                      checked={checked.indexOf(record._id) !== -1}
                      onClick={handleToggle(record._id)}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                    <div className="w-full">{record.guestName}</div>
                  </div>
                  <div className="w-[8%]">{record.numberOfGuests}</div>
                  <div className="w-[8%]">{record.numberOfRooms}</div>
                  <div className="w-[5%]">{record.category}</div>
                  <div className="w-[10%]">{getDate(record.arrivalDate)}</div>
                  <div className="w-[10%]">{getDate(record.departureDate)}</div>
                  <div className="w-[10%]">{record.roomType}</div>
                  {record.bookings?.length === record.numberOfRooms && <div className="w-[10%]">Yes</div>}
                  {record.bookings?.length !== record.numberOfRooms && <div className="w-[10%]">No</div>}
                  <div className="flex justify-evenly items-center gap-4 w-[8%]">
                    <IconButton size="small"
                      onClick={() => {
                        location.pathname.split("/").length === 3
                          ? navigate(`${record._id}`)
                          : navigate(`../${record._id}`);
                      }}
                    >
                      <InsertDriveFileIcon />
                    </IconButton>
                    <IconButton size="small"
                      onClick={async () => {
                        try {
                          setLoadingZip(true);
                          const res = await http.get(
                            "/reservation/documents/" + record._id,
                            { responseType: "blob" }
                          );
                          const fileName = record.name || "Document";
                          const contentType = res.headers["content-type"] || res.data.type;
                          
                          // Check if it's a zip file
                          const isZip = contentType && (
                            contentType.includes("zip") || 
                            contentType.includes("application/octet-stream")
                          );
                          setIsZipFile(isZip);
                          
                          const file = window.URL.createObjectURL(res.data);
                          setPreviewUrl(file);
                          setPreviewFileName(`${fileName} (${contentType})`);
                          
                          if (isZip) {
                            // Process zip file contents
                            await processZipFile(res.data);
                          }
                          
                          setPreviewOpen(true);
                          setLoadingZip(false);
                        } catch (error) {
                          setLoadingZip(false);
                          toast.error("Something went wrong");
                        }
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    {status === "rejected" && (
                      <IconButton size="small" onClick={() => handleEditClick(record)}>
                        <EditIcon className="text-blue-500" />
                      </IconButton>
                    )}
                  </div>
                  <div />
                </div>
              );
            })}
          </div>
        )}
      </div>
  
      {/* Status Messages */}
      {loadingStatus === "Loading" && (
        <div className="p-2 text-center pt-5 font-semibold">Loading...</div>
      )}
      {loadingStatus === "Success" && records.length === 0 && (
        <div className="p-2 text-center pt-5 font-semibold">
          No records found
        </div>
      )}
      {loadingStatus === "Error" && (
        <div className="p-2 text-center pt-5 font-semibold">
          Error fetching records!
        </div>
      )}
  
      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Reservation</DialogTitle>
        <DialogContent>
          {/* Basic Details Section */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Basic Details
          </Typography>
          <TextField
            label="Guest Name"
            value={editFormData.guestName || ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, guestName: e.target.value })
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Mobile Number"
            value={editFormData.applicant?.mobile || ""}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                applicant: { ...editFormData.applicant, mobile: e.target.value },
              })
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Arrival Date"
            type="date"
            value={editFormData.arrivalDate?.split("T")[0] || ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, arrivalDate: e.target.value })
            }
            fullWidth
            margin="normal"
          />
          <TextField
            label="Departure Date"
            type="date"
            value={editFormData.departureDate?.split("T")[0] || ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, departureDate: e.target.value })
            }
            fullWidth
            margin="normal"
          />
  
          {/* Category and Payment Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Category and Payment Details
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={editFormData.category || "ES-A"}
              onChange={(e) =>
                setEditFormData({ ...editFormData, category: e.target.value })
              }
            >
              {Object.entries(categoryInfo).map(([code, name]) => (
                <MenuItem key={code} value={code}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
  
          {/* Payment Options for categories ES-B, BR-B1, BR-B2 */}
          {(editFormData.category === "ES-B" ||
            editFormData.category === "BR-B1" ||
            editFormData.category === "BR-B2") && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Source</InputLabel>
              <Select
                value={editFormData.source || "GUEST"}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, source: e.target.value })
                }
              >
                <MenuItem value="GUEST">Paid by guest</MenuItem>
                <MenuItem value="DEPARTMENT">Paid by department</MenuItem>
                {editFormData.category === "ES-B" && (
                  <MenuItem value="OTHERS">Paid by other sources</MenuItem>
                )}
              </Select>
            </FormControl>
          )}
  
          {/* File Upload Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Category Proof Documents
          </Typography>
          <div className="flex mt-2 gap-10">
            <div>
              <InputFileUpload onFileUpload={handleFileUpload} />
            </div>
            {files.length > 0 ? (
              <div className="flex flex-col overflow-y-auto max-w-[30rem] h-16 gap-2 pr-2">
                {Array.from(files).map((file, index) => {
                  const arr = file.name.split(".");
                  const ext = arr[arr.length - 1];
                  return (
                    <div key={index} className="flex gap-4 items-center">
                      <div className="w-7">
                        <FileIcon extension={ext} {...defaultStyles} />
                      </div>
                      <div
                        className="text-sm text-gray-500 hover:text-blue-500 cursor-pointer"
                        onClick={() => {
                          window.open(window.URL.createObjectURL(file));
                        }}
                      >
                        {file.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                {(editFormData.category === "ES-A" || editFormData.category === "ES-B")
                  ? "*Uploading attachments is mandatory for category ES-A and ES-B (size limit: 2MB)"
                  : "File size limit: 2MB"}
              </div>
            )}
          </div>
  
          {/* Existing Files Section */}
          {editFormData.documents && editFormData.documents.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Previously Uploaded Files
              </Typography>
              <div className="flex flex-col gap-2">
                {editFormData.documents.map((doc, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <div className="w-7">
                      <FileIcon extension={doc.split('.').pop()} {...(defaultStyles || {})} />
                    </div>
                    <div
                      onClick={() => window.open(doc)}
                      className="text-sm text-gray-500 hover:text-blue-500 cursor-pointer"
                    >
                      {doc.split('/').pop()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Approving Authority Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Approving Authority
          </Typography>
          {editFormData.category === "BR-B1" ? (
            <div>
              <FormControl fullWidth margin="normal">
                <InputLabel>Dean</InputLabel>
                <Select
                  value={editFormData.primaryDean || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, primaryDean: e.target.value })
                  }
                >
                  <MenuItem value="Select" disabled>Select Dean</MenuItem>
                  <MenuItem value="DEAN RESEARCH AND DEVELOPMENT">Research and Development</MenuItem>
                  <MenuItem value="DEAN STUDENT AFFAIRS">Student Affairs</MenuItem>
                  <MenuItem value="DEAN FACULTY AFFAIRS AND ADMINISTRATION">Faculty Affairs & Administration</MenuItem>
                  <MenuItem value="DEAN UNDER GRADUATE STUDIES">Under Graduate Studies</MenuItem>
                  <MenuItem value="DEAN POST GRADUATE STUDIES">Post Graduate Studies</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Secondary Authority</InputLabel>
                <Select
                  value={editFormData.secondaryAuthority || "Select"}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, secondaryAuthority: e.target.value })
                  }
                >
                  <MenuItem value="Select" disabled>Select Secondary Authority</MenuItem>
                  <MenuItem value="REGISTRAR">Registrar</MenuItem>
                  
                  {/* Associate Deans */}
                  <MenuItem value="ASSOCIATE DEAN HOSTEL MANAGEMENT">Associate Dean - HOSTEL MANAGEMENT</MenuItem>
                  <MenuItem value="ASSOCIATE DEAN INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS">Associate Dean - INTERNATIONAL RELATIONS AND ALUMNI AFFAIRS</MenuItem>
                  <MenuItem value="ASSOCIATE DEAN CONTINUING EDUCATION AND OUTREACH ACTIVITIES">Associate Dean - CONTINUING EDUCATION AND OUTREACH ACTIVITIES</MenuItem>
                  <MenuItem value="ASSOCIATE DEAN INFRASTRUCTURE">Associate Dean - INFRASTRUCTURE</MenuItem>
                  
                  {/* HODs */}
                  <MenuItem value="HOD COMPUTER SCIENCE">HoD - COMPUTER SCIENCE</MenuItem>
                  <MenuItem value="HOD ELECTRICAL ENGINEERING">HoD - ELECTRICAL ENGINEERING</MenuItem>
                  <MenuItem value="HOD MECHANICAL ENGINEERING">HoD - MECHANICAL ENGINEERING</MenuItem>
                  <MenuItem value="HOD CHEMISTRY">HoD - CHEMISTRY</MenuItem>
                  <MenuItem value="HOD MATHEMATICS">HoD - MATHEMATICS</MenuItem>
                  <MenuItem value="HOD PHYSICS">HoD - PHYSICS</MenuItem>
                  <MenuItem value="HOD HUMANITIES AND SOCIAL SCIENCES">HoD - HUMANITIES AND SOCIAL SCIENCES</MenuItem>
                  <MenuItem value="HOD BIOMEDICAL ENGINEERING">HoD - BIOMEDICAL ENGINEERING</MenuItem>
                  <MenuItem value="HOD CHEMICAL ENGINEERING">HoD - CHEMICAL ENGINEERING</MenuItem>
                  <MenuItem value="HOD METALLURGICAL AND MATERIALS ENGINEERING">HoD - METALLURGICAL AND MATERIALS ENGINEERING</MenuItem>
                </Select>
              </FormControl>
            </div>
          ) : editFormData.category === "ES-A" ? (
            <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Authority</InputLabel>
              <Select
                value={editFormData.authority || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, authority: e.target.value,concernedDean: "",})
                }
              >
                <MenuItem value="DIRECTOR">Director</MenuItem>
                <MenuItem value="DEAN">Concerned Dean</MenuItem>
              </Select>
            </FormControl>

            {/* --- 3. Conditionally render the “which dean?” select --- */}

            {editFormData.authority === "DEAN" && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Which Dean?</InputLabel>
                <Select
                  value={editFormData.concernedDean || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      concernedDean: e.target.value,
                    })
                  }
                >
                  <MenuItem value="" disabled>
                    Select Dean
                  </MenuItem>
                  <MenuItem value="DEAN RESEARCH AND DEVELOPMENT">
                    Research and Development
                  </MenuItem>
                  <MenuItem value="DEAN STUDENT AFFAIRS">Student Affairs</MenuItem>
                  <MenuItem value="DEAN FACULTY AFFAIRS AND ADMINISTRATION">
                    Faculty Affairs & Administration
                  </MenuItem>
                  <MenuItem value="DEAN UNDER GRADUATE STUDIES">
                    Under Graduate Studies
                  </MenuItem>
                  <MenuItem value="DEAN POST GRADUATE STUDIES">
                    Post Graduate Studies
                  </MenuItem>
                </Select>
              </FormControl>
            )}
            </>

          ) : editFormData.category === "BR-A" ? (
            <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Authority</InputLabel>
              <Select
                value={editFormData.authority || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, authority: e.target.value })
                }
              >
                <MenuItem value="REGISTRAR">Registrar</MenuItem>
                <MenuItem value="DEAN ASSOCIATE">Dean + Associate Dean</MenuItem>
                <MenuItem value="DIRECTOR">Director</MenuItem>
              </Select>
            </FormControl>

            {/* 2) If they chose DEAN ASSOCIATE, show two dropdowns */}
            {editFormData.authority === "DEAN ASSOCIATE" && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Dean */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Which Dean?</InputLabel>
                  <Select
                    value={editFormData.selectedDean}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, selectedDean: e.target.value })
                    }
                  >
                    <MenuItem value="" disabled>
                      Select Dean
                    </MenuItem>
                    {Deans.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Associate Dean */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Which Associate Dean?</InputLabel>
                  <Select
                    value={editFormData.selectedAssociateDean}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        selectedAssociateDean: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="" disabled>
                      Select Associate Dean
                    </MenuItem>
                    {AssociateDeans.map((ad) => (
                      <MenuItem key={ad} value={ad}>
                        {ad}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}
          </>

          ) : (
            <FormControl fullWidth margin="normal">
              <InputLabel>Authority</InputLabel>
              <Select
                value={editFormData.authority || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, authority: e.target.value })
                }
              >
                <MenuItem value="CHAIRMAN">Chairman</MenuItem>
              </Select>
            </FormControl>
          )}
          
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            color="primary"
            disabled={
              (editFormData.category === "ES-A" || editFormData.category === "ES-B") &&
              files.length === 0 &&
              (!editFormData.documents || editFormData.documents.length === 0)
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedZipContent(null);
          setSelectedContentData(null);
          setZipContents([]);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {previewFileName}
          <IconButton
            aria-label="close"
            onClick={() => {
              setPreviewOpen(false);
              setSelectedZipContent(null);
              setSelectedContentData(null);
              setZipContents([]);
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loadingZip ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <CircularProgress />
            </div>
          ) : (
            <>
              {isZipFile ? (
                <div>
                  {selectedZipContent ? (
                    <div>
                      <Button 
                        variant="outlined" 
                        startIcon={<ArrowDropUpIcon />}
                        onClick={() => {
                          setSelectedZipContent(null);
                          setSelectedContentData(null);
                        }}
                        sx={{ mb: 2 }}
                      >
                        Back to file list
                      </Button>
                      <Typography variant="h6">
                        {selectedZipContent.name}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      
                      {selectedZipContent.path.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                          src={selectedContentData}
                          style={{ width: '100%', height: '500px' }}
                          frameBorder="0"
                        />
                      ) : selectedZipContent.path.toLowerCase().match(/\.(jpe?g|png|gif|bmp|svg)$/i) ? (
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                          <img 
                            src={selectedContentData} 
                            alt={selectedZipContent.name}
                            style={{ maxWidth: '100%', maxHeight: '500px' }}
                          />
                        </div>
                      ) : (
                        <div style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '10px', 
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          overflowX: 'auto',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          {selectedContentData}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Zip File Contents
                      </Typography>
                      <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: '400px', overflow: 'auto' }}>
                        {zipContents.map((item, index) => (
                          <ListItem
                            key={index}
                            button={item.isViewable}
                            onClick={() => item.isViewable && viewZipContent(item)}
                            sx={{ 
                              cursor: item.isViewable ? 'pointer' : 'default',
                              '&:hover': {
                                bgcolor: item.isViewable ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                              }
                            }}
                          >
                            <ListItemIcon>
                              {item.dir ? <FolderIcon color="primary" /> : <DescriptionIcon color="primary" />}
                            </ListItemIcon>
                            <ListItemText 
                              primary={item.name} 
                              secondary={`${item.size} | ${item.date}`}
                            />
                            {!item.dir && (
                              <div className="flex gap-2">
                                {item.isViewable && (
                                  <Button size="small" variant="outlined" onClick={(e) => {
                                    e.stopPropagation();
                                    viewZipContent(item);
                                  }}>
                                    VIEW
                                  </Button>
                                )}
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const zip = new JSZip();
                                      const zipData = await zip.loadAsync(await fetch(previewUrl).then(res => res.blob()));
                                      const fileData = await zipData.file(item.path).async("arraybuffer");
                                      const fileBlob = new Blob([fileData], { type: 'application/octet-stream' });
                                      const fileUrl = URL.createObjectURL(fileBlob);
                                      
                                      // Create a temporary link element and trigger download
                                      const a = document.createElement('a');
                                      a.href = fileUrl;
                                      a.download = item.name;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(fileUrl);
                                    } catch (error) {
                                      console.error("Error downloading file:", error);
                                      toast.error("Failed to download file");
                                    }
                                  }}
                                >
                                  DOWNLOAD
                                </Button>
                              </div>
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '500px' }}
                  frameBorder="0"
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setPreviewOpen(false);
              setSelectedZipContent(null);
              setSelectedContentData(null);
              setZipContents([]);
            }} 
            color="primary"
          >
            CLOSE
          </Button>
          {zipContents.length > 0 && (
            <Button 
              onClick={async () => {
                try {
                  // Create a temporary link element and trigger download of the full zip
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = previewUrl.split('/').pop();
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                } catch (error) {
                  console.error("Error downloading ZIP file:", error);
                  toast.error("Failed to download ZIP file");
                }
              }} 
              color="primary"
            >
              DOWNLOAD AS ZIP
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
  
}