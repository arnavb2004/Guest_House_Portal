import React, { useEffect, useState } from "react";

import List from "@mui/material/List";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import { useNavigate } from "react-router-dom";

import { getDate } from "../utils/handleDate";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import Button from "@mui/material/Button";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import TextField from "@mui/material/TextField";
import DownloadIcon from "@mui/icons-material/Download";
import DoneIcon from "@mui/icons-material/Done";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import { CircularProgress, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import http from "../utils/httpService";
import { useSelector } from "react-redux";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import JSZip from 'jszip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { styled } from '@mui/material/styles';

export default function AdminRecordList({ status = "pending" }) {
  const [checked, setChecked] = useState([]);
  const [values, setValues] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState("Loading");
  const [records, setRecords] = useState([]);
  const [newRecords, setNewRecords] = useState([]);
  const [sortType, setSortType] = useState("");
  const [sortToggle, setSortToggle] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [zipContents, setZipContents] = useState([]);
  const [isZipFile, setIsZipFile] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);
  const [selectedZipContent, setSelectedZipContent] = useState(null);
  const [selectedContentData, setSelectedContentData] = useState(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState("0");
  const [showCustomReasonField, setShowCustomReasonField] = useState(false);

  const user = useSelector((state) => state.user);
  const isAdminOrChairman = user.role !== "USER" || user.role !== "CASHIER";

  const filterMap = {
    "Guest Name": "guestName",
    "#Rooms": "numberOfRooms",
    "#Guests": "numberOfGuests",
    Category: "category",
    "Arrival Date": "arrivalDate",
    "Departure Date": "departureDate",
    "Room Type": "roomType"
  };

  const navigate = useNavigate();

  const fetchRecords = async () => {
    try {
      const res = await http.get("/reservation/" + status);
      const reservations = res?.data;
      setLoadingStatus("Success");
      setValues(reservations?.map((res) => res._id));
      setRecords(reservations || []);
      setNewRecords(reservations || []);
    } catch (error) {
      setLoadingStatus("Error");
    }
  };
  useEffect(() => {
    setLoadingStatus("Loading");
    fetchRecords();
  }, [status]);

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
    "Arrival Date",
    "Departure Date",
    "Room Type",
    "Room Assigned"
  ];

  const handleSortToggle = (event) => {
    const type = event.target.outerText;
    setSortType(type);
    setSortToggle(!sortToggle);
  };

  useEffect(() => {
    const handleSort = () => {
      // console.log("here11212");
      console.log(sortType);
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
            return new Date(a.arrivalDate) - new Date(b.arrivalDate);
          });
        } else if (sortType === "Room Assigned") {
          tempRecords.sort((a, b) => {
            return a.bookings?.length - b.bookings?.length;
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
            return new Date(b.arrivalDate) - new Date(a.arrivalDate);
          });
        } else if (sortType === "Room Assigned") {
          tempRecords.sort((a, b) => {
            return b.bookings?.length - a.bookings?.length;
          });
        }
      }
      setNewRecords(tempRecords);
    };
    handleSort();
  }, [sortToggle, sortType]);

  const rejectionReasons = [
    { id: "0", reason: "Select a Reason" },
    { id: "1", reason: "Room is not available" },
    { id: "2", reason: "Document uploaded is blurred, please re-upload" },
    { id: "3", reason: "Document uploaded does not match the provided category" },
    { id: "4", reason: "Requested dates are not available" },
    { id: "5", reason: "Incomplete information provided" },
    { id: "6", reason: "Booking policy violation" },
    { id: "7", reason: "Duplicate booking request" },
    { id: "8", reason: "Other" }
  ];

  const StyledSelect = styled(Select)(({ theme }) => ({
    width: '100%',
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-input': {
      padding: '12px 14px',
    },
  }));

  const handleRejectClick = (recordId) => {
    setSelectedRecordId(recordId);
    setRejectReason("");
    setSelectedRejectReason("0");
    setShowCustomReasonField(false);
    setOpenRejectDialog(true);
  };

  const handleReasonChange = (event) => {
    const value = event.target.value;
    setSelectedRejectReason(value);
    
    if (value === "8") { 
      setShowCustomReasonField(true);
      setRejectReason("");
    } else if (value !== "0") {
      const selectedReason = rejectionReasons.find(item => item.id === value);
      setRejectReason(selectedReason.reason);
      setShowCustomReasonField(false);
    } else {
      setRejectReason("");
      setShowCustomReasonField(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (selectedRejectReason === "0") {
      toast.error("Please select a reason for rejection");
      return;
    }
    
    if (selectedRejectReason === "8" && !rejectReason.trim()) {
      toast.error("Please provide a custom reason for rejection");
      return;
    }

    try {
      if (selectedRecordId === null) {
        // Handle bulk rejection
        for (const record of checked) {
          if (record !== "#") {
            await http.put(`/reservation/reject/${record}`, { reason: rejectReason });
          }
        }
        toast.success("Requests Rejected");
      } else {
        // Handle single rejection
        await http.put(`/reservation/reject/${selectedRecordId}`, { reason: rejectReason });
        toast.success("Request Rejected");
      }
      window.location.reload();
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data);
      } else {
        toast.error("An error occurred");
      }
    }
    setOpenRejectDialog(false);
    setRejectReason("");
    setSelectedRejectReason("0");
    setShowCustomReasonField(false);
    setSelectedRecordId(null);
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

  return (
    <div className="flex p-2 px-0 w-full flex-col">
      <div className='text-center text-2xl font-["Dosis"] font-semibold py-2 uppercase'>
        {status + " requests"}
      </div>
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
                  // key={option.value}
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
          size="small"
          className="col-span-10 w-full p-2.5 h-full"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      <List
        sx={{ width: "100%", padding: "0px" }}
        className="bg-gray-50 border rounded-md  overflow-hidden"
      >
        <div className="font-semibold border-b-2 text-[1.13vw] w-full" key="#">
          <div className="p-1 px-4 flex items-center w-full">
            <div className="flex items-center gap-2 w-[15%] ">
              <Checkbox
                edge="start"
                color="secondary"
                checked={checked.indexOf("#") !== -1}
                tabIndex={-1}
                onClick={handleToggle("#")}
                disableRipple
              />
              <div onClick={handleSortToggle} className="cursor-pointer pl-1">
                Name
              </div>
            </div>
            <div onClick={handleSortToggle} className="w-[8%] cursor-pointer text-center">
              #Guests
            </div>
            <div onClick={handleSortToggle} className="w-[8%] cursor-pointer text-center">
              #Rooms
            </div>
            <div onClick={handleSortToggle} className="w-[8%] cursor-pointer text-center">
              Category
            </div>
            <div onClick={handleSortToggle} className="w-[11%] cursor-pointer text-center">
              Arrival Date
            </div>
            <div onClick={handleSortToggle} className="w-[11%] cursor-pointer text-center">
              Deptarture Date
            </div>
            <div onClick={handleSortToggle} className="w-[11%] cursor-pointer text-center">
              Room Type
            </div>
            <div onClick={handleSortToggle} className="w-[13%] cursor-pointer text-center">
              Room Assigned
            </div>
            <div className="flex justify-end items-center w-[15%] gap-3 pr-2">
              <IconButton size="small">
                <InsertDriveFileIcon />
              </IconButton>
              <IconButton size="small">
                <VisibilityIcon />
              </IconButton>
              {isAdminOrChairman && (
                <>
                  {status === "pending" && (
                    <IconButton size="small">
                      <DoneIcon className="text-green-500" />
                    </IconButton>
                  )}
                  {status !== "rejected" && (
                    <IconButton size="small">
                      <CloseIcon className="text-red-500" />
                    </IconButton>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

        {loadingStatus === "Success" && newRecords.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {newRecords.map((record) => {
              const labelId = `checkbox-list-label-${record._id}`;
              return (
                <div
                  key={record._id}
                  className="border-b-[1px] border-gray-100 items-center flex text-[1vw] px-4 p-1"
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
                    <div className="truncate pl-1">{record.guestName}</div>
                  </div>
                  <div className="w-[8%] text-center">{record.numberOfGuests}</div>
                  <div className="w-[8%] text-center">{record.numberOfRooms}</div>
                  <div className="w-[8%] text-center">{record.category}</div>
                  <div className="w-[11%] text-center">{getDate(record.arrivalDate)}</div>
                  <div className="w-[11%] text-center">{getDate(record.departureDate)}</div>
                  <div className="w-[11%] text-center">{record.roomType}</div>
                  <div className="w-[13%] text-center">
                  {record.bookings?.length === record.numberOfRooms&& <div className="w-[70%]">Yes</div>}
                  {record.bookings?.length !== record.numberOfRooms && <div className="w-[70%]">No</div>}
                  </div>
                  <div className="flex justify-end items-center w-[15%] gap-3 pr-2">
                    <IconButton size="small">
                      <InsertDriveFileIcon
                        onClick={() => {
                          window.location.pathname.split("/").length === 3
                            ? navigate(`${record._id}`)
                            : navigate(`../${record._id}`);
                        }}
                      />
                    </IconButton>
                    <IconButton size="small">
                      <VisibilityIcon
                        onClick={async () => {
                          try {
                            setLoadingZip(true);
                            const res = await http.get(
                              "/reservation/documents/" + record._id,
                              { responseType: "blob" }
                            );
                            const fileName = record.name || "Document";
                            const contentType = res.headers["content-type"] || res.data.type;
                            
                            const isZip = contentType && (
                              contentType.includes("zip") || 
                              contentType.includes("application/octet-stream")
                            );
                            setIsZipFile(isZip);
                            
                            const file = window.URL.createObjectURL(res.data);
                            setPreviewUrl(file);
                            setPreviewFileName(`${fileName} (${contentType})`);
                            
                            if (isZip) {
                              await processZipFile(res.data);
                            }
                            
                            setPreviewOpen(true);
                            setLoadingZip(false);
                          } catch (error) {
                            setLoadingZip(false);
                            toast.error("Something went wrong");
                          }
                        }}
                      />
                    </IconButton>
                    { status === "pending" && isAdminOrChairman && (
                      <IconButton size="small">
                        <DoneIcon
                          className="text-green-500"
                          onClick={async () => {
                            try {
                              await http.put("/reservation/approve/" + record._id);
                              toast.success("Reservation Approved");
                              window.location.reload();
                            } catch (error) {
                              if (error.response?.data?.message) {
                                toast.error(error.response.data);
                              } else {
                                toast.error("An error occurred");
                              }
                            }
                          }}
                        />
                      </IconButton>
                    )}
                    { status !== "rejected" && isAdminOrChairman && (
                      <IconButton size="small">
                        <CloseIcon
                          className="text-red-500"
                          onClick={() => handleRejectClick(record._id)}
                        />
                      </IconButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </List>
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

      <Dialog 
        open={openRejectDialog} 
        onClose={() => setOpenRejectDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '12px',
          },
        }}
      >
        <DialogTitle sx={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#365899',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
        }}>
          Reject Reservation
        </DialogTitle>
        <DialogContent sx={{ 
          padding: '24px',
          paddingTop: '24px !important',
        }}>
          <FormControl fullWidth sx={{ mb: showCustomReasonField ? 2 : 0 }}>
            <InputLabel id="rejection-reason-label" sx={{
              '&.Mui-focused': {
                color: '#365899',
              },
            }}>Select Reason for Rejection</InputLabel>
            <Select
              labelId="rejection-reason-label"
              value={selectedRejectReason}
              onChange={handleReasonChange}
              label="Select Reason for Rejection"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#365899',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#365899',
                },
              }}
            >
              {rejectionReasons.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {showCustomReasonField && (
            <TextField
              margin="dense"
              label="Please specify the reason"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#365899',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#365899',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#365899',
                },
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ 
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          gap: '12px'
        }}>
          <Button 
            onClick={() => setOpenRejectDialog(false)}
            sx={{
              textTransform: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRejectConfirm} 
            variant="contained"
            color="error"
            sx={{
              textTransform: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#dc2626',
              },
            }}
          >
            Reject
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