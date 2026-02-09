//reviewroutes.js

import express from "express";


import { createReview, getReviews, deleteReview } from "../controllers/reviewController.js";
import { verifyAdmin } from "../middleware/auth.js";
import multer from "multer";
const router = express.Router();

// Multer memory storage for Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // max 2MB
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
router.post("/", upload.single("image"), createReview);



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
        error: "File too large. Maximum size is 2MB",
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