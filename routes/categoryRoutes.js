//categoryRoutes.js

import express from "express";
import multer from "multer";
import Category from "../models/Category.js";
import ImageKit from "imagekit";

const router = express.Router();

// ---------------- IMAGEKIT CONFIG ----------------
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Helper function to upload to ImageKit
const uploadToImageKit = async (buffer, originalname) => {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName: originalname,
      folder: "/categories",
    });
    return {
      secure_url: result.url,
      public_id: result.fileId,
      ...result,
    };
  } catch (error) {
    console.error("ImageKit upload failed:", error.message);
    throw error;
  }
};

// Multer Setup (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

// Admin
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, isFeatured, sliderOrder } = req.body;

    if (!name) return res.status(400).json({ success: false, error: "Name is required" });
    if (!req.file) return res.status(400).json({ success: false, error: "Image is required" });

    console.log("Uploading category image to ImageKit...");
    const uploadResult = await uploadToImageKit(req.file.buffer, req.file.originalname);

    const category = new Category({
      name,
      image: uploadResult.secure_url,
      imageId: uploadResult.public_id,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      sliderOrder: sliderOrder ? Number(sliderOrder) : null
    });

    await category.save();
    res.status(201).json({ success: true, category });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, isFeatured, sliderOrder } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    let updateData = {
      name: name || category.name,
      isFeatured: isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : category.isFeatured,
      sliderOrder: sliderOrder !== undefined ? Number(sliderOrder) : category.sliderOrder
    };

    if (req.file) {
      // Delete old image
      if (category.imageId) {
        try {
          await imagekit.deleteFile(category.imageId);
          console.log("Deleted old category image:", category.imageId);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }

      // Upload new image
      const uploadResult = await uploadToImageKit(req.file.buffer, req.file.originalname);
      updateData.image = uploadResult.secure_url;
      updateData.imageId = uploadResult.public_id;
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, category: updatedCategory });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    if (category.imageId) {
      try {
        await imagekit.deleteFile(category.imageId);
        console.log("Deleted category image:", category.imageId);
      } catch (err) {
        console.error("Error deleting image:", err);
      }
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public
router.get("/slider/home", async (req, res) => {
  try {
    const categories = await Category.find({ isFeatured: true }).sort({ sliderOrder: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error Handler for Multer (File size limit etc.)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max size is 2MB." });
    }
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

export default router;
