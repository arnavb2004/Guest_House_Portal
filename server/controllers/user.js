import User from "./../models/User.js";

export const getUser = async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.id !== req.params.id) {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  console.log("Accessing all users...");
  try {
    const users = await User.find();
    //console.log(users)
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.id !== req.params.id) {
    return res
      .status(403)
      .json({ message: "You are not authorized to perform this action" });
  }
  
  try {
    console.log("Updating user profile with data:", req.body);
    
    // Sanitize the input data
    const { name, contact, department, designation, ecode } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (contact) updateData.contact = contact;
    if (department !== undefined) updateData.department = department;
    if (designation !== undefined) updateData.designation = designation;
    if (ecode !== undefined) updateData.ecode = ecode;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true } // Return updated document
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("User updated successfully:", updatedUser);
    res.status(200).json({ 
      message: "Account has been updated",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        contact: updatedUser.contact,
        department: updatedUser.department,
        designation: updatedUser.designation,
        ecode: updatedUser.ecode,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    // Check if the user making the request is an admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You are not authorized to perform this action' });
    }

    // Get the user ID and role from the request body
    const { userId, role } = req.body;

    // Find the user by ID and update the role
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', user });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ message: err.message });
  }
};


export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    return res.status(200).json(req.user.notifications);
  }
  catch{
    return res.status(500).json({ message: err.message });
  }
}


export const deleteNotification = async (req, res) => {
  try {
    console.log("Notification delete requested");
    const user = await User.findById(req.user.id);
    user.notifications = user.notifications.filter((notification) => notification._id.toString() !== req.params.id);
    await user.save();
    return res.status(200).json(user.notifications);
  }
  catch(err){
    return res.status(500).json({ message: err.message });
  }
}

export const deleteAllNotifications = async (req, res) => {
  try {
    console.log("Notification delete requested");
    const user = await User.findById(req.user.id);
    user.notifications = []
    await user.save();
    return res.status(200).json(user.notifications);
  }
  catch(err){
    return res.status(500).json({ message: err.message });
  }
}