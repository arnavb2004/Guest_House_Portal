import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Provider } from "react-redux";
import { persistor, store } from "./redux/store";
import { PersistGate } from "redux-persist/integration/react";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { injectStore } from "./utils/httpService";

injectStore(store);

// Subscribe to the store to log state changes
store.subscribe(() => {
  const state = store.getState();
  console.log("Redux state updated:", {
    user: {
      id: state.user.id,
      name: state.user.name,
      department: state.user.department,
      designation: state.user.designation,
      ecode: state.user.ecode
    }
  });
});


const root = ReactDOM.createRoot(document.getElementById("root"));

const clientId = process.env.REACT_APP_CLIENT_ID;
// const clientId =
//   "516253965885-l50g9mqi21i2qcle027tbdth7oht3aan.apps.googleusercontent.com";

root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          limit={1}
        />
      </PersistGate>
    </Provider>
  </GoogleOAuthProvider>
);
