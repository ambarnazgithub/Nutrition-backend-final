import Category from "../models/Category.js";
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

// Cloudinary Config
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

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
    formData.append("folder", "categories"); // Add folder directly

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
        folder: "categories",
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

/* =========================
   CREATE CATEGORY
========================= */
export const createCategory = async (req, res) => {
  try {
    const { name, sliderOrder } = req.body;
    let image = req.body.image;
    const isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      image = uploadResult.secure_url;
    }

    const category = await Category.create({
      name,
      image: image || "",
      isFeatured,
      sliderOrder: isFeatured ? sliderOrder : null
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   GET ALL CATEGORIES
========================= */


/* =========================
   UPDATE CATEGORY
========================= */
export const updateCategory = async (req, res) => {
  try {
    const { name, sliderOrder } = req.body;
    let image = req.body.image;
    const isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

    // Handle File Upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      image = uploadResult.secure_url;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        ...(image && { image }), // Only update image if new one exists
        isFeatured,
        sliderOrder: isFeatured ? sliderOrder : null
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   DELETE CATEGORY
========================= */
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   SLIDER CATEGORIES
========================= */
// REPLACE getSliderCategories function:

export const getSliderCategories = async (req, res) => {
  try {
    console.log("🎯 getSliderCategories called");
    
    const categories = await Category.find({ isFeatured: true })
      .sort({ sliderOrder: 1 })
      .lean(); // ADD .lean() for better performance

    console.log(`✅ Found ${categories.length} slider categories`);

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("❌ getSliderCategories error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// REPLACE getAllCategories function:

export const getAllCategories = async (req, res) => {
  try {
    console.log("📂 getAllCategories called");
    
    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${categories.length} categories`);

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("❌ getAllCategories error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
