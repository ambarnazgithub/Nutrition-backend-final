// controllers/reviewController.js


import Review from "../models/Review.js";
import Product from "../models/Product.js";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

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


// ---------------- GET REVIEWS (BY PRODUCT) ----------------
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({
      createdAt: -1,
    });

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- DELETE REVIEW (ADMIN) ----------------
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    // Delete image from ImageKit if exists
    if (review.imageId) {
      try {
        await imagekit.deleteFile(review.imageId);
      } catch (err) {
        console.error("Error deleting review image from ImageKit:", err);
      }
    }

    await Review.findByIdAndDelete(req.params.id);

    const reviews = await Review.find({ productId: review.productId });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const updatedProduct = await Product.findByIdAndUpdate(
      review.productId,
      {
        ratings: {
          averageRating: averageRating,
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
    console.error("Error deleting review:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
