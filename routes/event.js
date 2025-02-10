import express from "express";
import { EventModel } from "../models/EventsModel.js";
import { protect } from "../modules/auth.js";

const router = express.Router();

// Create Event (Only Authenticated Users)
router.post("/create", protect, async (req, res) => {
    try {
        const { name, description, date, location } = req.body;
        const userId = req.user._id;
        const isguest = req.user.isguest;

        // Check if the user is a guest
        if (isguest) {
            return res.status(403).json({
                message: "Guest users cannot create events. Please contact the admin to enable event creation."
            });
        }
        // Prevent duplicate events
        const existingEvent = await EventModel.findOne({ creator: userId, date, name });
        if (existingEvent) {
            return res.status(400).json({ message: "Event with this name and date already exists." });
        }

        const newEvent = new EventModel({
            name,
            description,
            date,
            location,
            attendees: [],
            creator: userId
        });

        await newEvent.save();

        // Real-time event creation update
        if (req.io) {
            req.io.emit("eventUpdated", { message: "New event created", event: newEvent });
        }

        res.status(201).json({ message: "Event created successfully", event: newEvent });
    } catch (error) {
        res.status(500).json({ message: "Error creating event", error });
    }
});

// Get All Events (Public)
router.get("/", async (req, res) => {
    try {
        const events = await EventModel.find()
            .populate("creator", "username email")
            .populate("attendees", "username email")
            .lean();

        const formattedEvents = events.map(event => ({
            id: event._id,
            name: event.name,
            description: event.description,
            date: event.date,
            location: event.location,
            creator: event.creator ? event.creator.username : "Unknown",
            attendeesCount: event.attendees.length
        }));

        res.status(200).json(formattedEvents);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error });
    }
});

// Get Events Created by the Logged-in User
router.get("/my-events", protect, async (req, res) => {
    try {
        const userId = req.user._id; 
        const events = await EventModel.find({ creator: userId })
            .populate("attendees", "username email");

        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching user events:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update Event (Only Creator)
router.put("/update/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const { name, description, date, location } = req.body;
    const userId = req.user._id;

    try {
        const event = await EventModel.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (event.creator.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized to update this event" });
        }

        event.name = name || event.name;
        event.description = description || event.description;
        event.date = date || event.date;
        event.location = location || event.location;

        await event.save();

        // Real-time event update
        if (req.io) {
            req.io.emit("eventUpdated", { message: "Event updated", event });
        }

        res.status(200).json({ message: "Event updated successfully", event });
    } catch (error) {
        res.status(500).json({ message: "Error updating event", error });
    }
});

// Delete Event (Only Creator)
router.delete("/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;

    try {
        const event = await EventModel.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (event.creator.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this event" });
        }

        await EventModel.findByIdAndDelete(eventId);

        // Notify all attendees about event deletion
        if (req.io) {
            req.io.emit("eventUpdated", { message: "Event deleted", eventId });
        }

        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting event", error });
    }
});

// Add Attendee to Event
router.post("/attend/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;

    try {
        const event = await EventModel.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (event.attendees.includes(userId.toString())) {
            return res.status(400).json({ message: "Already attending this event." });
        }

        event.attendees.push(userId);
        await event.save();

        const populatedEvent = await EventModel.findById(eventId).populate("attendees", "username email").lean();

        // Notify attendees in real-time
        if (req.io) {
            req.io.emit("attendeeUpdated", {
                eventId,
                attendees: populatedEvent.attendees,
                attendeesCount: populatedEvent.attendees.length
            });
        }

        res.status(200).json({ message: "Joined the event!", event: populatedEvent });
    } catch (error) {
        res.status(500).json({ message: "Error adding attendee", error });
    }
});

// Remove Attendee from Event
router.delete("/attend/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;

    try {
        const event = await EventModel.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (!event.attendees.some(att => att.toString() === userId.toString())) {
            return res.status(400).json({ message: "Not attending this event." });
        }

        event.attendees = event.attendees.filter(att => att.toString() !== userId.toString());
        await event.save();

        const populatedEvent = await EventModel.findById(eventId).populate("attendees", "username email").lean();

        // Notify attendees in real-time
        if (req.io) {
            req.io.emit("attendeeUpdated", {
                eventId,
                attendees: populatedEvent.attendees,
                attendeesCount: populatedEvent.attendees.length
            });
        }

        res.status(200).json({ message: "Left the event!", event: populatedEvent });
    } catch (error) {
        res.status(500).json({ message: "Error removing attendee", error });
    }
});

export default router;
