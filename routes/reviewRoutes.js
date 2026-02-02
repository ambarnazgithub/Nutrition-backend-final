import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addReview, getReviews, deleteReview, getAllReviews } from "../controllers/reviewController.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/reviews";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});

const upload = multer({ storage });

// Routes
router.get("/all", verifyAdmin, getAllReviews);

// ADD review (public) - now accepts image
router.post("/", upload.single("image"), addReview);

// GET reviews for a product
router.get("/:productId", getReviews);

// DELETE review (admin only)
router.delete("/:id", verifyAdmin, deleteReview);

export default router;
