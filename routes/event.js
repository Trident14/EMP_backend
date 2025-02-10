import express from "express";
import { EventModel } from "../models/EventsModel.js";
import { protect } from "../modules/auth.js";

const router = express.Router();

// Create Event (Only Authenticated Users)
router.post("/create", protect, async (req, res) => {
    try {
        const { name, description, date, location } = req.body;
        const userId = req.user._id;

        // Check if user already has an event with the same name at the same date
        const existingEvent = await EventModel.findOne({ creator: userId, date, name });

        if (existingEvent) {
            return res.status(400).json({ message: "You already have an event with this name at the same date & time." });
        }

        // Create new event
        const newEvent = new EventModel({
            name,
            description,
            date,
            location,
            attendees: [], 
            creator: userId
        });

        await newEvent.save();
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
            .select("name description date location attendees creator")
            .lean();

        // Format response
      
        const formattedEvents = events.map(event => ({
            id:event._id,
            name: event.name,
            description: event.description,
            date: event.date,
            location: event.location,
            creator: event.creator ? event.creator.username : "Unknown",
            attendeesCount: event.attendees.length
        }));

        res.status(200).json(formattedEvents);
    } catch (error) {
        console.error("Error fetching events:", error);
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

// Add Attendee to Event (Authenticated Users Only)
router.post("/attend/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id; // Logged-in user's ID

    try {
        const event = await EventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Prevent duplicate attendees
        if (event.attendees.includes(userId.toString())) {
            return res.status(400).json({ message: "You are already attending this event." });
        }

        // Add user to attendees
        event.attendees.push(userId);
        await event.save();

        // Populate attendees for real-time updates
        const populatedEvent = await EventModel.findById(eventId)
            .populate("attendees", "username email")
            .lean();

        // Broadcast real-time update to all connected clients
        if (global.io) {
            global.io.emit("attendeeUpdated", {
                eventId,
                attendees: populatedEvent.attendees,
            });
        }

        res.status(200).json({
            message: "You have joined the event!",
            event: populatedEvent,
        });
    } catch (error) {
        console.error("Error adding attendee:", error);
        res.status(500).json({ message: "Error adding attendee", error });
    }
});


// Remove Attendee from Event
router.delete("/attend/:eventId", protect, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;

    try {
        const event = await EventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check if user is actually an attendee
        if (!event.attendees.some(att => att.toString() === userId.toString())) {
            return res.status(400).json({ message: "You are not attending this event." });
        }

        // Remove user from attendees
        event.attendees = event.attendees.filter(att => att.toString() !== userId.toString());
        await event.save();

        // Populate attendees for real-time update
        const populatedEvent = await EventModel.findById(eventId)
            .populate("attendees", "username email")
            .lean();

        // Broadcast real-time update to all clients
        if (global.io) {
            global.io.emit("attendeeUpdated", {
                eventId,
                attendees: populatedEvent.attendees,
            });
        }

        res.status(200).json({
            message: "You have left the event!",
            event: populatedEvent,
        });
    } catch (error) {
        console.error("Error removing attendee:", error);
        res.status(500).json({ message: "Error removing attendee", error });
    }
});

//User registered event
router.get("/my-registrations", protect, async (req, res) => {
    try {
        const userId = req.user._id; 
        
        // Find events where the user is an attendee
        const events = await EventModel.find({ attendees: userId })
            .select("name description date location ")
            .lean();

        res.status(200).json(events);
    } catch (error) {
        console.error("Error fetching registered events:", error);
        res.status(500).json({ message: "Error fetching registered events", error });
    }
});



// Delete Event (Only Event Creator)
router.delete("/delete/:id", protect, async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check if logged-in user is the creator
        if (event.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await EventModel.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting event", error });
    }
});

// Update Event (Only Event Creator)
router.put("/update/:id", protect, async (req, res) => {
    try {
        const { name, description, date, location } = req.body;
        const event = await EventModel.findById(req.params.id);

        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check if logged-in user is the creator
        if (event.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        event.name = name || event.name;
        event.description = description || event.description;
        event.date = date || event.date;
        event.location = location || event.location;

        await event.save();
        res.status(200).json({ message: "Event updated successfully", event });
    } catch (error) {
        res.status(500).json({ message: "Error updating event", error });
    }
});

export default router;
