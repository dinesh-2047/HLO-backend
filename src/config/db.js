import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`);
    console.log("MONGODB connected sucessfully");
  } catch (err) {
    console.log("Database Connection Failed");
    process.exit(1);
  }
};
