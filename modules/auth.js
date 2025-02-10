import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/UserModel.js';

// Compare hashed password
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Hash the password before storing
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Create JWT Token
export const createJWT = (user) => {
    return jwt.sign(
        {
            username: user.username,
            _id: user._id,
        },
        process.env.JWT_SECRET, 
        { expiresIn: "1h" } 
    );
};

// Middleware to protect routes
export const protect = (req, res, next) => {
    const bearer = req.headers.authorization;

    if (!bearer || !bearer.startsWith("Bearer ")) {
        return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    const token = bearer.split(" ")[1];

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user; 
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
