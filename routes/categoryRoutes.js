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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"));
    }
  }
});

// ADD ERROR WRAPPER for async routes:
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes with error handling
router.post("/", upload.single("image"), asyncHandler(createCategory));
router.get("/", asyncHandler(getAllCategories));
router.put("/:id", upload.single("image"), asyncHandler(updateCategory));
router.delete("/:id", asyncHandler(deleteCategory));

// Public route
router.get("/slider/home", asyncHandler(getSliderCategories));

export default router;