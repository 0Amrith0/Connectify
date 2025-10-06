import User from "../models/User.model.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/generateToken.js";
import { upsertStreamUser } from "../lib/stream.js";

dotenv.config();

export const signup = async(req, res) => {
    const {email, fullName, password } = req.body;

    try {
        if(!email || !password || !fullName ){
            return res.status(400).json({ message: "All the fields are required" })
        }

        if(password.length < 8){
            return res.status(400).json({ message: "Password must be at least 6 characters long" })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if(!emailRegex){
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email });
        
        if(existingUser){
            return res.status(400).json({ message: "Email already exists, please use a different one" })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const idx = Math.floor(Math.random() * 100) + 1
        const newAvatar = `https://avatar.iran.liara.run/public/${idx}.png`

        const newUser = new User({
            fullName,
            email,
            password:hashedPassword,
            profilePic: newAvatar
        })

        await upsertStreamUser({
          id: newUser._id.toString(),
          name: newUser.fullName,
          image: newUser.profilePic || "",
        })

        console.log(`Stream user created for ${newUser.fullName}`)

        generateToken(newUser._id, res);

        await newUser.save();

        res.status(201).json({user: newUser})

    } catch (error) {
        console.log("Error in signup controller", error);
        res.status(500).json({ message: "Internal server error" })
    }
}

export const login = async(req, res) => {

  try {
    const { email, password } = req.body;
    if (!email || !password){
        return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if(!user){
        return res.status(400).json({ message: "Invalid email or password" });
    }

    const isCorrectPassword = await bcrypt.compare(password, user?.password || "");
    if(!isCorrectPassword){
        return res.status(400).json({ message: "Invalid email or password" });
    }

    generateToken(user._id, res);

    return res.status(200).json(user);

  } catch (error) {
    console.log("Error in login controller", error);
    res.status(500).json({ message: "Internal server error" })
  }
}

export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", {maxAge: 0})
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error);
    res.status(500).json({ message: "Internal server error" })
  }
}

export const onboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const {fullName, bio, nativeLanguage, learningLanguage, location} = req.body;
    if(!fullName || !bio || !nativeLanguage || !learningLanguage || !location ){
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location"
        ].filter(Boolean)
      })
    }

    const updatedUser = await User.findByIdAndUpdate(userId,{
      ...req.body, 
      isOnboarded: true,
    }, {new: true})

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      })
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`)
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding", streamError.message);
    }

    res.status(200).json({user: updatedUser});

  } catch (error) {
    console.log("Onboarding error", error);
    res.status(500).json({ message: "Internal server error" })
  }
  


}