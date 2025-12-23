import mongoose from "mongoose";


const orderSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
    paymentMethod: { type: String, required: true },
  cartItems: [
    {
      productId: {   type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,},  
      name: String,
       brandName: String,
      price: Number,
      count: Number,
      flavor: String,
      servings: String,
    },
  ],

   // ✅ ADD THESE TWO
    couponCode: { type: String, default: null },
    discount: { type: Number, default: 0 },

    totalAmount: Number,
  }, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);
export default Order;