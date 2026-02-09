import Review from "../models/Review.js";
import Product from "../models/Product.js";
import ImageKit from "imagekit";

// ---------------- IMAGEKIT CONFIG ----------------
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// ---------------- CREATE REVIEW ----------------
export const createReview = async (req, res) => {
  try {
    const { productId, userId, name, email, message, rating } = req.body;

    if (!productId || !name || !email || !message || !rating) {
      return res.status(400).json({
        success: false,
        error: "All fields required",
      });
    }

    let imageUrl = null;
    let imageId = null;

    // IMAGE UPLOAD IMAGEKIT
    if (req.file) {
      const fileName = Date.now() + "_" + req.file.originalname;

      const uploaded = await imagekit.upload({
        file: req.file.buffer,
        fileName: fileName,
        folder: "/reviews",
      });

      imageUrl = uploaded.url;
      imageId = uploaded.fileId;
    }

    const newReview = await Review.create({
      productId,
      userId: userId || null,
      name,
      email,
      message,
      rating,
      image: imageUrl,
      imageId: imageId,
    });

    // ⭐ update rating
    const reviews = await Review.find({ productId });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        ratings: {
          averageRating: avg,
          totalRatings: reviews.length,
        },
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: newReview,
      updatedProduct,
    });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- GET ALL REVIEWS ----------------
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("productId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- GET REVIEWS BY PRODUCT ----------------
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- DELETE REVIEW ----------------
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    // delete image from imagekit
    if (review.imageId) {
      try {
        await imagekit.deleteFile(review.imageId);
      } catch (err) {
        console.error("ImageKit delete error:", err.message);
      }
    }

    await Review.findByIdAndDelete(req.params.id);

    // update rating
    const reviews = await Review.find({ productId: review.productId });

    const avg =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const updatedProduct = await Product.findByIdAndUpdate(
      review.productId,
      {
        ratings: {
          averageRating: avg,
          totalRatings: reviews.length,
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review deleted successfully",
      updatedProduct,
    });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};