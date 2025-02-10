import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { protect } from './modules/auth.js';
import authRoutes from "./routes/auth.js";  
import eventRoutes from "./routes/event.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4080;

mongoose.connect(process.env.DBKEY)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
    });

app.use(cors());
app.use(express.json());

app.get('/',protect,(req,res)=>{
    res.status(200).json({message:"Hello from server"});
})

app.use('/api/auth',authRoutes);
app.use('/api/events',eventRoutes);

app.listen(PORT,()=>{
    console.log(`server running at port ${PORT}`)
})
