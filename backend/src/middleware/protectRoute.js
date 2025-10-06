import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.model.js"

dotenv.config();

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if(!token){
            return res.status(400).json({ error: "User not authorized"});
        }

        const decoded = jwt.verify( token, process.env.JWT_SECRET_KEY);
        if(!decoded){
            return res.status(400).json({ error: "Invalid token" });
        }

        const user = await User.findById(decoded.userId).select("-password");
        if(!user){
            return res.status(400).json({ error: "User not found" });
        }

        req.user = user
        next();

    } catch (error) {
        console.log("Error in protectRoute middleware", error);
        res.status(500).json({ message: "Internal server error" })
    }
}