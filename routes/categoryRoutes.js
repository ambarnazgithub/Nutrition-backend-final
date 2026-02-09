// categoryRoutes.js
import express from "express";
import multer from "multer";
import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getSliderCategories
} from "../controllers/categoryController.js";

const router = express.Router();

// Multer Setup (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

// ------------------- Routes -------------------
// Admin
router.post("/", upload.single("image"), createCategory);
router.get("/", getAllCategories);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

// Public
router.get("/slider/home", getSliderCategories);

// Multer Error Handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. Max size is 2MB." });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

export default router;
