import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  // User identity
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
      default: null 
  },

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  message: {
    type: String,
    required: true
  },

    // ✅ ADD THIS
  image: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Review", ReviewSchema);
