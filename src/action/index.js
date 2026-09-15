'use server'

import { isValidWalletAddress } from "@/utils/functions/isValidWallet";
import { redirect } from "next/navigation";
import {connectToDB} from "@/database";
import {User} from "@/models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import Joi from "joi";
// Define validation schema
const SignUpSchema = Joi.object({
  username: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  otp: Joi.string().length(6).required()
});
export async function SignUpAction(data){
    console.log(data);
    try {
        const { error } = SignUpSchema.validate(data);
        if(error){
            return {
                success: false,
                status: 400,
                message: error.details[0].message,
            };
        };
        const db = await connectToDB();
        const userExists = await User.findOne({ $or: [{ username: data?.username }, { email: data?.email }] });
        if (userExists) {
            return {
                success: false,
                status: 400,
                message: "User already exists",
            };
        }
        console.log(data);
        if(!global.otpStore || !global.otpStore[data.email] || global.otpStore[data.email].otp !== data.otp){
            return {
                success: false,
                status: 400,
                message: "Invalid OTP",
            };
        }
        const {password} = data;
        const user = await User.create({
            username: data.username,
            email: data.email,
            password: bcrypt.hashSync(data.password, 10),
            walletAddress: "",
            subscriberCount: -1,
            subscription: [],
            blogs: [],
        });
        return {
            success: true,
            status: 200,
            message: "User created successfully",
            user: JSON.parse(JSON.stringify(user)),}
    } catch (error) {
        console.log(error);
        return {
            success: false,
            status: 500,
            message: error.message,
        };
    }
}
export async function SignInAction(data){
    console.log(data);
    try {
        const db = await connectToDB();
        const user = await User.findOne({ $or: [{ username: data?.userid }, { email: data?.userid }] });
        if (!user) {
            return {
                success: false,
                status: 400,
                message: "User not found",
            };
        }
        const isPasswordValid = bcrypt.compareSync(data.password, user.password);
        if (!isPasswordValid) {
            return {
                success: false,
                status: 400,
                message: "Invalid password",
            };
        }
        const jwt_secret = process.env.JWT_SECRET||"secret";
        const token = jwt.sign({ id: user._id, username: user.username, email: user.email}, jwt_secret, { expiresIn: "1d" });
        const cookieStore = await cookies(); // ✅ await the cookies() call
        cookieStore.set("token", token, {
                httpOnly: true,                  // prevent client-side JS access
                secure: process.env.NODE_ENV === "production", // only HTTPS in prod
                sameSite: "strict",              // CSRF protection
                path: "/",                       // cookie valid for whole site
                maxAge: 60 * 60 * 24,            // 1 day in seconds
            });
        return {
            success: true,
            status: 200,
            message: "User logged in successfully",
            user: JSON.parse(JSON.stringify(user)),
        };}
        catch (error) {
        console.log(error);
            return {
                success: false,
                status: 500,
                message: error.message,
            };
        }
    }
        
export async function SignOutAction(){
    try {
        cookies().set("token", "", { maxAge: 0 });
        return {
            success: true,
            status: 200,
            message: "User logged out successfully",
        };
    } catch (error) {
        console.log(error);
        return {
            success: false,
            status: 500,
            message: error.message,
        };
    }
}

export async function sendOtp(email){

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in memory, Redis, or DB with expiry (e.g., 5 min)
  // For demo: store in-memory (NOT for production)
  global.otpStore = global.otpStore || {};
  global.otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  // Send email
//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    return { success: true, message: "OTP sent" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message }
  }
}

export async function verifyOtp(email, otp) {
    const record = global.otpStore?.[email];
  if (!record) {
    return { success: false, message: "No OTP found" };
  }

  if (record.expires < Date.now()) {
    return { success: false, message: "OTP expired" };
  }

  if (record.otp !== otp) {
    return { success: false, message: "Invalid OTP" };
  }
  return { success: true, message: "OTP verified" };
}

export async function fetchUserAction(){
    try{
        const db = await connectToDB();
        // const token = await cookies().get("token")?.value;
            const cookieStore = await cookies(); // ✅ await the cookies() call
    const token = cookieStore.get("token")?.value;
        if (!token) {
            return {
                success: false,
                status: 401,
                message: "User not authenticated",
            };
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET||"secret");
        // console.log(decoded);
        const user = await User.findById(decoded.id);
        if (!user) {
            return {
                success: false,
                status: 400,
                message: "User not found",
            }
        }
        return {
            success: true,
            status: 200,
            message: "User fetched successfully",
            user: JSON.parse(JSON.stringify(user)),
        }
    }catch(error){
        console.log(error);
        return {
            success: false,
            status: 500,
            message: error.message,
        }
    }
}

export async function ResetPasswordAction(email, otp, newPassword){
    const isVerified = await verifyOtp(email, otp);
    if(!isVerified.success){
        return {
            success: false,
            status: 400,
            message: isVerified.message,
        }
    }
    try{
        const db = await connectToDB();
        const user = await User.findOne({email});
        if(!user){
            return {
                success: false,
                status: 400,
                message: "User not found",
            }
        }
        user.password = bcrypt.hashSync(newPassword, 10);
        await user.save();
        return {
            success: true,
            status: 200,
            message: "Password reset successfully",
        }
    }catch(error){
        console.log(error);
        return {
            success: false,
            status: 500,
            message: error.message,
        }
    }
}

export async function RegisterCreatorAction(data){
    console.log("data is : ",data);
    if(!isValidWalletAddress(data)){
        return {
            success: false,
            status: 400,
            message: "Invalid wallet address",
        }
    }
    try{
        const db = await connectToDB();
        // const token = await cookies().get("token")?.value;
            const cookieStore = await cookies(); // ✅ await the cookies() call
    const token = cookieStore.get("token")?.value;
        if (!token) {
            return {
                success: false,
                status: 401,
                message: "User not authenticated",
            };
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET||"secret");
        // console.log(decoded);
        // Declare user before using it
        var user = await User.findById(decoded.id);
        if (!user) {
            return {
                success: false,
                status: 404,
                message: "User not found",
            }
        }
        user = await User.findByIdAndUpdate(decoded.id,{$set:{subscriberCount: Math.max(0,user.subscriberCount),walletAddress: data}},{new: true});
        if (!user) {
            return {
                success: false,
                status: 400,
                message: "User not found",
            }
        }
        return {
            success: true,
            status: 200,
            message: "User fetched successfully",
            user: JSON.parse(JSON.stringify(user)),
        }
    }catch(error){
        console.log(error);
        return {
            success: false,
            status: 500,
            message: error.message,
        }
    }
}