import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js"
import staffRoutes from './routes/staff.routes.js';

const app= express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
app.use(cookieParser());
dotenv.config();


app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/staff', staffRoutes);

app.get("/", (req,res)=>{
  res.send("Hello world");
});

app.listen(PORT,()=>{
  console.log(`Server running on port ${PORT}`);
});