import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const credentialSlice = createSlice({
  name: "user",
  initialState: {
    name: "",
    email: "",
    contact: "",
    role: "",
    department: "",
    designation: "",
    ecode: ""
  },
  reducers: {
    setCredentialSlice: (state, action) => {
      const { name, contact, role, email, department, designation, ecode } = action.payload;
      state.name = name;
      state.role = role;
      state.contact = contact;
      state.email = email;
      state.department = department || "";
      state.designation = designation || "";
      state.ecode = ecode || "";
    },
  },
});

export const { setCredentialSlice } = credentialSlice.actions;
export default credentialSlice.reducer;
