import mongoose from "mongoose";
const EventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserEMP" }], // Store user IDs instead of names
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "UserEMP", required: true }
}, { timestamps: true });

export const EventModel = mongoose.model("EventEMP", EventSchema);
