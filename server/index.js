import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import { checkAuth } from "./middlewares/tokens.js";
import reservationRoute from "./routes/reservationRoute.js";
import diningRoute from "./routes/diningRoute.js";
import utilsRoute from "./routes/utilsRoute.js";
import exportRoute from "./routes/exportRoute.js";

import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";

const port = process.env.PORT || 4751;
dotenv.config();
const app = express();

if (process.env.NODE_ENV === "production") {
  console.log = () => {};
}

// var storage,upload;
const connection = mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to database");
    // storage= new GridFsStorage({db:mongoose.connection.db})
    // upload=multer({storage});)
    app.listen(port, () => {
      console.log(`Server is runnning at port ${port}`);
    });
  })
  .catch((err) => console.log(err));

await connection;
// var upload
const storage = new GridFsStorage({ url: process.env.MONGO_URL });
storage.on("connection", () => {});
const upload = multer({ storage });

app.use(cors());
app.use(express.json()); //for parsing application/json
// app.use(upload.array('files',10));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  console.log(req.files);
  res.json({
    message: "A simple API",
  });
});

//app.use(expressjwt({ secret: process.env.ACCESS_TOKEN_SECRET, algorithms: ['HS256'] }).unless({ path: ["/auth/login", "/auth/register"] }));
app.use("/auth", authRoute);
app.use("/user", checkAuth, userRoute);
app.use("/dining", checkAuth, diningRoute);
app.use("/reservation", checkAuth, reservationRoute);
app.use("/utils", utilsRoute);

// Export routes
app.use("/api/export", checkAuth, exportRoute);
app.get("/protected", checkAuth, (req, res) => {
  console.log("Protected route Getting executed!!!");
  res.json({
    message: "Protected route",
    user: req.body.user,
    accessToken: req.body.newaccessToken,
  });
});
