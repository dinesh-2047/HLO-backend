import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async(userId) => {
    try{
         const user = await User.findById(userId);
         const accessToken =  user.generateAccessToken();
         const refreshToken =  user.generateRefreshToken();

         user.refreshToken = refreshToken ; 
         await user.save({validateBeforeSave : false});
         
         return {accessToken, refreshToken};
    }
    catch(error){
       throw new ApiError(
      500,
      "Something went wrong while refresh and accesss token "
    );
    }
}


const registerUser = asyncHandler(async(req, res) => {

    const {fullName, email, userName, password} = req.body;
    if(!fullName || !email || !userName || !password){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

   if(existedUser){
      throw new ApiError(409, "User Already Exists");
   }

    const user = await User.create({
        fullName, 
        email, 
        userName,
        password 
    })

     const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
    );
  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user ");

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered Successfully"));
});


const LoginUser = asyncHandler(async(req, res) => {
     
      const {email, password} = req.body; 
      if(!email || !password){
          throw new ApiError(400, "Cannot login without email and password ");
      }

      const user = await User.findOne({email});

      if(!user){
         throw new ApiError(404, "User does not exist");
      }

      const isPasswordValid = await user.isPasswordCorrect(password);
      if(!isPasswordValid){
        throw new ApiError(401, "Incorrect password");
      }

       const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged in successfully "
      )
    );

});


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this remove the field from doucment 
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req?.user;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched Successfully "));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken)
      throw new ApiError(401, "Unauthorized request");

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "invalid refresh token ");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refresh successfully "
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token ");
  }
});


export {
   registerUser,
   LoginUser,
   logoutUser, 
   getCurrentUser, 
   refreshAccessToken
}
