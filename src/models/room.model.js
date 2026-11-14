import mongoose from "mongoose";
import bcrypt from "bcrypt";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    password: {
      type: String, // hashed, null = open room
      default: null,
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxParticipants: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Geospatial index for location-based queries (500m radius search)
roomSchema.index({ location: "2dsphere" });

// Hash password before saving (if room is password-protected)
roomSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.isPasswordProtected = true;
});

// Compare password for protected rooms
roomSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.isPasswordProtected) return true;
  return await bcrypt.compare(password, this.password);
};

const Room = mongoose.model("Room", roomSchema);
export default Room;

