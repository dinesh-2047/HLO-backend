import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Room from "../models/room.model.js";

// Create a new room
const createRoom = asyncHandler(async (req, res) => {
  const { name, password, latitude, longitude, maxParticipants } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    throw new ApiError(400, "Room name and location are required");
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Invalid coordinates");
  }

  const room = await Room.create({
    name,
    host: req.user._id,
    password: password || null,
    isPasswordProtected: !!password,
    location: {
      type: "Point",
      coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
    },
    participants: [req.user._id],
    maxParticipants: maxParticipants || 10,
  });

  // Return room without password hash
  const createdRoom = await Room.findById(room._id)
    .select("-password")
    .populate("host", "fullName userName")
    .populate("participants", "fullName userName");

  return res
    .status(201)
    .json(new ApiResponse(201, createdRoom, "Room created successfully"));
});

// Get nearby rooms within 500 meters
const getNearbyRooms = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new ApiError(400, "Invalid coordinates");
  }

  const rooms = await Room.find({
    isActive: true,
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: 500, // 500 meters
      },
    },
  })
    .select("-password")
    .populate("host", "fullName userName")
    .populate("participants", "fullName userName")
    .lean();

  // Add participant count and whether room is password-protected
  const roomsWithInfo = rooms.map((room) => ({
    ...room,
    participantCount: room.participants.length,
    isFull: room.participants.length >= room.maxParticipants,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(200, roomsWithInfo, "Nearby rooms fetched successfully")
    );
});

// Join a room
const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { password } = req.body;

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (!room.isActive) {
    throw new ApiError(400, "Room is no longer active");
  }

  // Check if already in room
  if (room.participants.includes(req.user._id)) {
    throw new ApiError(400, "You are already in this room");
  }

  // Check if room is full
  if (room.participants.length >= room.maxParticipants) {
    throw new ApiError(400, "Room is full");
  }

  // Check password for protected rooms
  if (room.isPasswordProtected) {
    if (!password) {
      throw new ApiError(401, "Password is required for this room");
    }
    const isPasswordValid = await room.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect room password");
    }
  }

  room.participants.push(req.user._id);
  await room.save({ validateBeforeSave: false });

  const updatedRoom = await Room.findById(roomId)
    .select("-password")
    .populate("host", "fullName userName")
    .populate("participants", "fullName userName");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRoom, "Joined room successfully"));
});

// Leave a room
const leaveRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (!room.participants.includes(req.user._id)) {
    throw new ApiError(400, "You are not in this room");
  }

  // If host leaves, close the room
  if (room.host.toString() === req.user._id.toString()) {
    room.isActive = false;
    room.participants = [];
    await room.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Room closed (host left)"));
  }

  // Remove participant
  room.participants = room.participants.filter(
    (p) => p.toString() !== req.user._id.toString()
  );
  await room.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Left room successfully"));
});

// Get room details
const getRoomDetails = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId)
    .select("-password")
    .populate("host", "fullName userName")
    .populate("participants", "fullName userName");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room details fetched successfully"));
});

// Close/delete a room (host only)
const closeRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (room.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the host can close this room");
  }

  room.isActive = false;
  room.participants = [];
  await room.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Room closed successfully"));
});

export { createRoom, getNearbyRooms, joinRoom, leaveRoom, getRoomDetails, closeRoom };

