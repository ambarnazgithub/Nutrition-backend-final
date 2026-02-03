import express from "express";


import { addReview, getReviews, deleteReview, getAllReviews } from "../controllers/reviewController.js";
import { verifyAdmin } from "../middleware/auth.js";
import multer from "multer";
const router = express.Router();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, mimetype) => {
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimetype};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "reviews",
    upload_preset: "ml_default", // if you use unsigned preset
  });

  return result.secure_url;
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
router.get("/all", verifyAdmin, getAllReviews);

// ADD review (public) - now accepts image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { productId, userId, name, email, message, rating } = req.body;

    if (!productId || !name || !email || !message || !rating) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Upload image to Cloudinary if present
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    }

    // Create review
    const newReview = await Review.create({
      productId,
      userId: userId || null,
      name,
      email,
      message,
      rating,
      image: imageUrl, // <-- Cloudinary URL
    });

    // Update product rating
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


// GET reviews for a product
router.get("/:productId", getReviews);

// DELETE review (admin only)
router.delete("/:id", verifyAdmin, deleteReview);

export default router;
