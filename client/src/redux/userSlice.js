import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// Helper function to safely handle empty or undefined fields
const ensureString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const userSlice = createSlice({
  name: "user",
  initialState: {
    id: "",
    name: "",
    email: "",
    contact: "",
    role: "",
    accessToken: "",
    refreshToken: "",
    notifications: [],
    department: "",
    designation: "",
    ecode: ""
  },
  reducers: {
    setUserSlice: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      
      // Debug what's coming from the server
      console.log("Setting user slice with data:", {
        userData: user,
        department: user.department,
        designation: user.designation,
        ecode: user.ecode
      });
      
      state.id = user._id;
      state.name = user.name || "";
      state.role = user.role || "USER";
      state.notifications = user.notifications || [];
      state.contact = user.contact || "";
      state.email = user.email || "";
      state.department = ensureString(user.department);
      state.designation = ensureString(user.designation);
      state.ecode = ensureString(user.ecode);
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      
      // Debug final state for these fields
      console.log("User state after update:", {
        department: state.department,
        designation: state.designation,
        ecode: state.ecode
      });
    },
    logout: (state) => {
      state.id = "";
      state.name = "";
      state.contact = "";
      state.email = "";
      state.role = "";
      state.accessToken = "";
      state.refreshToken = "";
      state.notifications = [];
      state.department = "";
      state.designation = "";
      state.ecode = "";
    },
    updateUserDetails: (state, action) => {
      const { name, contact, notifications, department, designation, ecode } = action.payload;
      if (name !== undefined) {
        state.name = name;
      }
      if (contact !== undefined) {
        state.contact = contact;
      }
      if (notifications !== undefined) {
        state.notifications = notifications;
      }
      if (department !== undefined) {
        state.department = ensureString(department);
      }
      if (designation !== undefined) {
        state.designation = ensureString(designation);
      }
      if (ecode !== undefined) {
        state.ecode = ensureString(ecode);
      }
      
      console.log("User details updated:", {
        department: state.department,
        designation: state.designation,
        ecode: state.ecode
      });
    },
    refreshUserData: (state, action) => {
      const userData = action.payload;
      console.log("Refreshing user data from server:", userData);
      
      if (userData) {
        // Only update fields that exist in the payload
        if (userData.name !== undefined) state.name = userData.name;
        if (userData.contact !== undefined) state.contact = userData.contact;
        if (userData.email !== undefined) state.email = userData.email;
        if (userData.department !== undefined) state.department = ensureString(userData.department);
        if (userData.designation !== undefined) state.designation = ensureString(userData.designation);
        if (userData.ecode !== undefined) state.ecode = ensureString(userData.ecode);
        if (userData.role !== undefined) state.role = userData.role;
        if (userData.notifications !== undefined) state.notifications = userData.notifications;
      }
      
      console.log("User data after refresh:", {
        department: state.department,
        designation: state.designation,
        ecode: state.ecode
      });
    },
  },
});

export const { setUserSlice, logout, updateUserDetails, refreshUserData } = userSlice.actions;
export default userSlice.reducer;
