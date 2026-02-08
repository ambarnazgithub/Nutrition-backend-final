import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },

    image: {
      type: String,
      required: true
    },
    imageId: {
      type: String,
      default: null
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    sliderOrder: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
