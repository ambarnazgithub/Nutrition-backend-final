import express from "express";


import {  getReviews, deleteReview, getAllReviews } from "../controllers/reviewController.js";
import { verifyAdmin } from "../middleware/auth.js";
import multer from "multer";
const router = express.Router();
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import { v2 as cloudinary } from "cloudinary";

// ---------------- CLOUDINARY CONFIG ----------------
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

// Verify all Cloudinary credentials are present
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials!");
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    signature_algorithm: "sha256",
  });
  console.log(" Cloudinary configured successfully in Review Routes");
}

// Helper function to upload to Cloudinary using DIRECT HTTP request
// This completely bypasses SDK signature generation
const uploadToCloudinary = async (buffer, mimetype) => {
  try {
    console.log(" Uploading via direct HTTP request with unsigned preset...");

    // Convert buffer to base64
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimetype};base64,${base64}`;

    // Create FormData for direct HTTP upload
    const formData = new URLSearchParams();
    formData.append("file", dataUri);
    formData.append("upload_preset", "ml_default"); // Your unsigned preset
    formData.append("folder", "reviews"); // Add folder directly

    // Direct HTTP POST to Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `Upload failed: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Upload successful via direct HTTP!");

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      ...result,
    };
  } catch (error) {
    console.error(" Direct HTTP upload failed:", error.message);

    // Fallback: Try with SDK but without API secret
    console.log(" Fallback: Trying SDK without API secret...");
    try {
      // Save and temporarily remove API secret
      const originalConfig = cloudinary.config();
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        // NO api_secret
      });

      const base64 = buffer.toString("base64");
      const dataUri = `data:${mimetype};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        upload_preset: "ml_default",
        folder: "reviews",
      });

      // Restore config
      cloudinary.config(originalConfig);

      return result;
    } catch (fallbackError) {
      console.error(" Fallback also failed:", fallbackError.message);
      throw fallbackError;
    }
  }
};




// Multer memory storage for Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // max 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Routes
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { productId, userId, name, email, message, rating } = req.body;

    console.log("Submitting review for productId:", productId);
    console.log("File info:", req.file);  // <-- ye dekho file upload ho rahi hai ya nahi

    if (!productId || !name || !email || !message || !rating) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let imageUrl = null;
    if (req.file) {
      console.log("Uploading image to Cloudinary...");
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      imageUrl = uploadResult.secure_url;
      console.log("Cloudinary URL:", imageUrl);
    }

    const newReview = await Review.create({
      productId,
      userId: userId || null,
      name,
      email,
      message,
      rating,
      image: imageUrl,
    });

    console.log("Review created:", newReview._id);

    // Update product rating...
    const reviews = await Review.find({ productId });
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { ratings: { averageRating, totalRatings: reviews.length } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: newReview,
      updatedProduct,
    });
  } catch (err) {
    console.error("Error adding review:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET ALL REVIEWS (ADMIN)
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("productId", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    console.error("Error fetching all reviews:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
});


// GET reviews for a product
router.get("/:productId", getReviews);

// DELETE review (admin only)
router.delete("/:id", verifyAdmin, deleteReview);

// ---------------- ERROR HANDLER FOR MULTER ----------------
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 5MB",
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }
  next(err);
};
router.use(handleMulterError);

export default router;