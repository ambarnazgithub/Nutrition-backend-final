//categoryController.js

import Category from "../models/Category.js";
import ImageKit from "imagekit";

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

/* =========================
   CREATE CATEGORY
========================= */
export const createCategory = async (req, res) => {
  try {
    const { name, sliderOrder } = req.body;
    let image = req.body.image;
    let imageId = null;
    const isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

    if (req.file) {
      const uploadResult = await uploadToImageKit(req.file.buffer, req.file.originalname);
      image = uploadResult.secure_url;
      imageId = uploadResult.public_id;
    }

    const category = await Category.create({
      name,
      image: image || "",
      imageId: imageId,
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
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================
   UPDATE CATEGORY
========================= */
export const updateCategory = async (req, res) => {
  try {
    const { name, sliderOrder } = req.body;
    let image = req.body.image;
    let imageId = null;
    const isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

    // 1. Find existing category first
    const categoryToUpdate = await Category.findById(req.params.id);
    if (!categoryToUpdate) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

   const safeSliderOrder = isFeatured
  ? (sliderOrder !== undefined && sliderOrder !== ""
      ? Number(sliderOrder)
      : categoryToUpdate.sliderOrder)
  : null;

    // 2. Handle File Upload (Delete old image if exists)
    if (req.file) {
      if (categoryToUpdate.imageId) {
        try {
          await imagekit.deleteFile(categoryToUpdate.imageId);
          console.log("Old category image deleted from ImageKit");
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }

      const uploadResult = await uploadToImageKit(req.file.buffer, req.file.originalname);
      image = uploadResult.secure_url;
      imageId = uploadResult.public_id;
    }

const updateData = {
  name: name || categoryToUpdate.name,
  isFeatured,
  sliderOrder: safeSliderOrder
};

    if (image) updateData.image = image;
    if (imageId) updateData.imageId = imageId;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Delete image from ImageKit
    if (category.imageId) {
      try {
        await imagekit.deleteFile(category.imageId);
        console.log("Category image deleted from ImageKit");
      } catch (err) {
        console.error("Error deleting image from ImageKit:", err);
      }
    }

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
export const getSliderCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isFeatured: true })
      .sort({ sliderOrder: 1 });

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
