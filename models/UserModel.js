import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // Email must be unique
    password: { type: String, required: true }, // Will store hashed password
    isguest: { type: Boolean, default: false } // Default to false for regular users
  },
  { timestamps: true } // Enables createdAt and updatedAt fields
);

export const UserModel = mongoose.model("UserEMP", UserSchema);
