// controllers/reviewController.js
import Review from "../models/Review.js";
import Product from "../models/Product.js";

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
    const removed = await Review.findByIdAndDelete(req.params.id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      });
    }

    const reviews = await Review.find({ productId: removed.productId });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const updatedProduct = await Product.findByIdAndUpdate(
      removed.productId,
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
