//productRoutes.js

import express from "express";
import Product from "../models/Product.js";
import { verifyAdmin } from "../middleware/auth.js";
import multer from "multer";
import { Readable } from "stream";
import ImageKit from "imagekit";

const router = express.Router();

// ---------------- IMAGEKIT CONFIG ----------------
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// ---------------- MULTER MEMORY STORAGE ----------------
const storage = multer.memoryStorage();

// ---------------- MULTER ----------------
const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB max
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter:", file.mimetype);
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!!"), false);
    }
  },
});

// Helper function to upload to ImageKit
const uploadToImageKit = async (buffer, originalname) => {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName: originalname,
      folder: "/products",
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

console.log(" Multer memory storage configured successfully");

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

// ---------------- TEST ROUTE ----------------
router.get("/test", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    const sample = await Product.findOne().lean();

    res.json({
      success: true,
      message: "Products API is working",
      totalProducts: count,
      sample,
      env: {
        imagekit: !!process.env.IMAGEKIT_PUBLIC_KEY,
        jwt: !!process.env.JWT_SECRET,
        mongo: !!process.env.MONGO_URI,
      },
    });
  } catch (err) {
    console.error("Test route error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- STATS COUNT ----------------
router.get("/stats/count", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    console.error("Error counting products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET ALL PRODUCTS ----------------

router.get("/getAllProducts", async (req, res) => {
  try {
    console.log(" getAllProducts called");
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    console.log(` Found ${products.length} products`);
    res.json({ success: true, products });
  } catch (err) {
    console.error("❌ Error retrieving all products:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// ---------------- FILTERED GET ----------------
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const products = await Product.find(filter)
      .sort({ category: 1, createdAt: -1 })
      .lean();

    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET SINGLE PRODUCT ----------------
router.get("/:id", async (req, res) => {
  try {
    let product = await Product.findById(req.params.id).lean();

    if (!product) {
      product = await Product.findOne({ productId: req.params.id }).lean();
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- CREATE PRODUCT ----------------
// POST /products → Add Product
router.post(
  "/",
  verifyAdmin,
  (req, res, next) => {
    // Multiple images for gallery
    upload.array("images", 4)(req, res, (err) => {
      if (err) {
        console.error(" Multer error:", err);
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const {
        brandName,
        name,
        category,
        price,
        weight,
        flavor,
        servings,
        description,
        discountPercent,
        quantity,
      } = req.body;

      if (!brandName || !name || !category || !price) {
        return res.status(400).json({
          success: false,
          error: "Brand name, name, category, and price are required",
        });
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be a positive number",
        });
      }
const numDiscount = Number(discountPercent) || 0;

   const cleanCategory = category.toLowerCase().trim();

if (!cleanCategory) {
  return res.status(400).json({
    success: false,
    error: "Category is required",
  });
}

      // Upload multiple images to Cloudinary
      let galleryUrls = [];
      let galleryIds = [];
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const uploadResult = await uploadToImageKit(
            file.buffer,
            file.originalname
          );
          galleryUrls.push(uploadResult.secure_url);
          galleryIds.push(uploadResult.public_id);
        }
      }

      const newProduct = new Product({
        productId: `PROD-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
          brandName: brandName.trim(),
        name: name.trim(),
        category: cleanCategory,
          discountPercent: numDiscount,  
        price: numPrice,
        quantity: Number(quantity) || 0,
        weight: weight?.trim() || "",
        flavor: flavor ? JSON.parse(flavor) : [],
        servings: servings ? JSON.parse(servings) : [],
        description: description?.trim() || "",
        gallery: galleryUrls,
        galleryIds: galleryIds,
        image: galleryUrls[0] || "/images/placeholder.png", // fallback main image
        imageId: galleryIds[0] || null,
      });

      await newProduct.save();

      res.status(201).json({
        success: true,
        message: "Product added successfully",
        product: newProduct,
      });
    } catch (err) {
      console.error(" POST /products ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);
//---------
// GET products by IDs (for guest wishlist)
router.post("/by-ids", async (req, res) => {
  console.log(" /by-ids route hit!");
  console.log(" Request body:", req.body);
  
  try {
    const { ids } = req.body;
    
    console.log("🔍 IDs received:", ids);
    
    if (!ids || !Array.isArray(ids)) {
      console.log("❌ Invalid IDs");
      return res.status(400).json({ success: false, error: "IDs array required" });
    }

    const products = await Product.find({ _id: { $in: ids } }).lean();
    
    console.log("✅ Products found:", products.length);
    console.log("✅ Products:", products);
    
    res.json({ success: true, products });
  } catch (err) {
    console.error("❌ Error fetching products by IDs:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- UPDATE PRODUCT ----------------
router.put(
  "/:id",
  verifyAdmin,
  (req, res, next) => {
    upload.array("images", 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { existingGallery, ...otherBodyData } = req.body;
      const updateData = { ...otherBodyData };
      let finalGallery = [];
      let finalGalleryIds = [];

      // Parse JSON arrays
      if (updateData.flavor) updateData.flavor = JSON.parse(updateData.flavor);
      if (updateData.servings)
        updateData.servings = JSON.parse(updateData.servings);
if (updateData.brandName) updateData.brandName = updateData.brandName.trim();
     
      // Fetch current product to get old IDs
      const productToUpdate = await Product.findById(req.params.id);
      if (!productToUpdate) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }

      if (existingGallery) {
        const existingUrls = Array.isArray(existingGallery)
          ? existingGallery
          : [existingGallery];
        
        // Keep IDs for existing images
        existingUrls.forEach(url => {
          finalGallery.push(url);
          const idx = productToUpdate.gallery.indexOf(url);
          if (idx !== -1 && productToUpdate.galleryIds && productToUpdate.galleryIds[idx]) {
            finalGalleryIds.push(productToUpdate.galleryIds[idx]);
          } else {
            // Keep structure aligned even if ID missing (legacy data)
            finalGalleryIds.push(null); 
          }
        });
      }

      // 2. Upload new images and add them to the gallery
      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const uploadResult = await uploadToImageKit(
            file.buffer,
            file.originalname
          );
          finalGallery.push(uploadResult.secure_url);
          finalGalleryIds.push(uploadResult.public_id);
        }
      }
      updateData.gallery = finalGallery;
      updateData.galleryIds = finalGalleryIds;
      updateData.image = finalGallery[0] || "/images/placeholder.png"; // Set the first image as the main one
      updateData.imageId = finalGalleryIds[0] || null;

      if (updateData.price) updateData.price = Number(updateData.price);
      if (updateData.category)
        updateData.category = updateData.category.toLowerCase().trim();
      if (updateData.quantity)
        updateData.quantity = Number(updateData.quantity);

      // 3. Delete removed images from Cloudinary
      if (productToUpdate.galleryIds && productToUpdate.galleryIds.length > 0) {
        // Find IDs that are in the old gallery but NOT in the new finalGalleryIds
        const idsToDelete = productToUpdate.galleryIds.filter(
          (id) => id && !finalGalleryIds.includes(id)
        );

        for (const id of idsToDelete) {
          try {
            await imagekit.deleteFile(id);
            console.log("Deleted old image from ImageKit:", id);
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }
      }

      let updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        updated = await Product.findOneAndUpdate(
          { productId: req.params.id },
          updateData,
          { new: true, runValidators: true }
        );
      }

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      }

      res.json({ success: true, product: updated });
    } catch (err) {
      console.error(" PUT /products ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ---------------- DELETE PRODUCT ----------------
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    console.log("=== DELETE /products/:id ===");
    console.log("ID:", req.params.id);

    let removed = await Product.findByIdAndDelete(req.params.id);

    if (!removed) {
      removed = await Product.findOneAndDelete({ productId: req.params.id });
    }

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Delete all images from ImageKit using stored IDs
    if (removed.galleryIds && removed.galleryIds.length > 0) {
      for (const id of removed.galleryIds) {
        if (!id) continue;
        try {
          await imagekit.deleteFile(id);
          console.log("Deleted image from ImageKit:", id);
        } catch (cloudErr) {
          console.error("Failed to delete image:", cloudErr);
        }
      }
    }

    console.log(" Product deleted:", removed._id);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error(" Error deleting product:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply error handler
router.use(handleMulterError);

export default router;
