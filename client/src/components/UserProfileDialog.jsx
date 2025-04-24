import React, { useState, useEffect } from "react";
import EditIcon from "@mui/icons-material/Edit";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PersonIcon from "@mui/icons-material/Person";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import EmailIcon from "@mui/icons-material/Email";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";

import { useDispatch, useSelector } from "react-redux";
import { updateUserDetails, refreshUserData } from "../redux/userSlice";
import { privateRequest } from "../utils/useFetch";
import { toast } from "react-toastify";

const UserProfileDialog = ({ openDialog, setOpenDialog }) => {
  const user = useSelector((state) => state.user);
  
  // Debug user data to see what's actually in the Redux store
  console.log("User profile data:", {
    name: user.name,
    department: user.department,
    designation: user.designation,
    ecode: user.ecode
  });
  
  const [editableName, setEditableName] = useState(user.name || "");
  const [editableContact, setEditableContact] = useState(user.contact || "");
  const [editableDepartment, setEditableDepartment] = useState(user.department || "");
  const [editableDesignation, setEditableDesignation] = useState(user.designation || "");
  const [editableEcode, setEditableEcode] = useState(user.ecode || "");
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();

  const http = privateRequest(user.accessToken, user.refreshToken);

  // Update state when user data changes or dialog opens
  useEffect(() => {
    console.log("User data changed in effect:", {
      department: user.department,
      designation: user.designation,
      ecode: user.ecode
    });
    
    // Reset the editable fields whenever user data changes or dialog opens
    setEditableName(user.name || "");
    setEditableContact(user.contact || "");
    setEditableDepartment(user.department || "");
    setEditableDesignation(user.designation || "");
    setEditableEcode(user.ecode || "");
  }, [user, openDialog]);

  // Force refresh of profile data
  const refreshProfileData = () => {
    if (user?.id && http) {
      try {
        http.get(`/user/${user.id}`).then(response => {
          if (response.data) {
            console.log("Refreshed profile data:", response.data);
            dispatch(refreshUserData(response.data));
          }
        });
      } catch (error) {
        console.error("Error refreshing profile data:", error);
      }
    }
  };

  // Refresh data when dialog opens
  useEffect(() => {
    if (openDialog) {
      refreshProfileData();
    }
  }, [openDialog]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
    // Reset editing state when closing dialog
    setIsEditing(false);
  };

  const handleUpdateUserDetails = async () => {
    try {
      const response = await http.put(`/user/${user.id}`, {
        name: editableName,
        contact: editableContact,
        department: editableDepartment,
        designation: editableDesignation,
        ecode: editableEcode,
      });
      
      if (response.status === 200) {
        // Update Redux store
        dispatch(
          updateUserDetails({ 
            name: editableName, 
            contact: editableContact, 
            department: editableDepartment, 
            designation: editableDesignation, 
            ecode: editableEcode 
          })
        );
        
        toast.success("Profile updated successfully");
        setIsEditing(false);
      }
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An error occurred while updating your profile");
      }
    }
  };

  const handleEnableEditing = () => {
    setIsEditing(true);
  };

  return (
    <Dialog 
      open={openDialog} 
      onClose={handleCloseDialog} 
      maxWidth="sm" 
      fullWidth
      key={`profile-dialog-${user.id}-${openDialog}`}
    >
      <DialogTitle>User Information</DialogTitle>
      <DialogContent>
        {isEditing ? (
          <>
            <TextField
              margin="dense"
              id="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              InputProps={{
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="email"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={user.email}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="contact"
              label="Contact"
              type="text"
              fullWidth
              variant="outlined"
              value={editableContact}
              onChange={(e) => setEditableContact(e.target.value)}
              InputProps={{
                startAdornment: (
                  <ListItemIcon>
                    <ContactPhoneIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="department"
              label="Department"
              type="text"
              fullWidth
              variant="outlined"
              value={editableDepartment}
              onChange={(e) => setEditableDepartment(e.target.value)}
              InputProps={{
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="designation"
              label="Designation"
              type="text"
              fullWidth
              variant="outlined"
              value={editableDesignation}
              onChange={(e) => setEditableDesignation(e.target.value)}
              InputProps={{
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="ecode"
              label="Employee Code/ Entry Number"
              type="text"
              fullWidth
              variant="outlined"
              value={editableEcode}
              onChange={(e) => setEditableEcode(e.target.value)}
              InputProps={{
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
          </>
        ) : (
          <>
            <TextField
              margin="dense"
              id="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={user.name || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="email"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={user.email || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="contact"
              label="Contact"
              type="text"
              fullWidth
              variant="outlined"
              value={user.contact || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <ContactPhoneIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="department"
              label="Department"
              type="text"
              fullWidth
              variant="outlined"
              value={user.department || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="designation"
              label="Designation"
              type="text"
              fullWidth
              variant="outlined"
              value={user.designation || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
            <TextField
              margin="dense"
              id="ecode"
              label="Employee Code/ Entry Number"
              type="text"
              fullWidth
              variant="outlined"
              value={user.ecode || ""}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                ),
              }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleCloseDialog} color="secondary">
          Close
        </Button>
        
        {isEditing ? (
          <Button onClick={handleUpdateUserDetails} color="primary" variant="contained">
            Save Changes
          </Button>
        ) : (
          <Button 
            onClick={handleEnableEditing} 
            color="primary" 
            variant="outlined"
            startIcon={<EditIcon />}
          >
            Edit Profile
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserProfileDialog;
