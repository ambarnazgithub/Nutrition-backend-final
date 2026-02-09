

import express from "express";
import multer from "multer";
import {
  createReview,
  getReviews,
  deleteReview,
  getAllReviews,
} from "../controllers/reviewController.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// ---------------- MULTER CONFIG ----------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  },
});

// ---------------- ROUTES ----------------

// CREATE REVIEW
router.post("/", upload.single("image"), createReview);

// admin all reviews
router.get("/all", getAllReviews);

// normal all (agar use ho raha)
router.get("/", getAllReviews);

// product reviews
router.get("/:productId", getReviews);

router.delete("/:id", verifyAdmin, deleteReview);


// ---------------- MULTER ERROR ----------------
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large (max 2MB)",
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  next(err);
});

export default router;