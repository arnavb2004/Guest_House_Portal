import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, updateUserDetails, refreshUserData } from "../redux/userSlice";
import IconButton from "@mui/material/IconButton";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Logo from "../images/IIT-logo.png";
import UserProfileDialog from "./UserProfileDialog";
import NotificationMenu from "./NotificationMenu";
import Text from "./Text";
import Badge from "@mui/material/Badge";
import http from "../utils/httpService";

const Header = () => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notifications = user.notifications;

  const [openDialog, setOpenDialog] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await http.get("/user/notifications");
      dispatch(updateUserDetails({ notifications: res?.data }));
    } catch (error) {}
  };

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const goToLoginPage = () => {
    navigate("/login");
  };

  const handleOpenDialog = () => {
    if (user?.id) {
      try {
        http.get(`/user/${user.id}`).then(response => {
          if (response.data) {
            dispatch(refreshUserData(response.data));
          }
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    setOpenDialog(true);
  };

  const handleNotificationClick = () => {
    setNotificationMenuOpen(!notificationMenuOpen);
  };

  return (
    <div className="flex justify-center bg-gray-100 py-3 w-full">
      <div className="flex justify-between items-center w-[80%]">
        <div className="flex items-center">
          <img src={Logo} alt="IIT Ropar Logo" className="mr-4 h-16" />
          <div className="">
            <a
              href="/"
              className="block text-xl font-bold font-['Dosis'] text-gray-800"
            >
              GUEST HOUSE
            </a>
            <Text />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user.email && (
            <>
              <IconButton onClick={handleOpenDialog} size="large">
                <AccountCircleIcon />
              </IconButton>
              <span>{user.name || user.email}</span>
          <div className="relative">
            <IconButton onClick={handleNotificationClick}>
              <Badge badgeContent={notifications?.length} color="warning">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            {notificationMenuOpen && <NotificationMenu />}
          </div>
            </>
          )}
          {user.email ? (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleLogout}
            >
              LOGOUT
            </button>
          ) : (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={goToLoginPage}
            >
              LOGIN
            </button>
          )}
          <UserProfileDialog
            openDialog={openDialog}
            setOpenDialog={setOpenDialog}
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
