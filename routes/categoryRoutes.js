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
const upload = multer({ storage });

// Admin
router.post("/", upload.single("image"), createCategory);
router.get("/", getAllCategories);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

// Public
router.get("/slider/home", getSliderCategories);

export default router;
