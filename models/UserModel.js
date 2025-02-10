import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // Added email
    password: { type: String, required: true }, // Will store hashed password
}, { timestamps: true }); // Enables createdAt and updatedAt fields

export const UserModel = mongoose.model("UserEMP", UserSchema);
