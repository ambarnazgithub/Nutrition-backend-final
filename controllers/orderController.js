import Orders from "../models/Orders.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  console.log("\n========== CREATE ORDER REQUEST ==========");
  console.log("🔥 createOrder route hit!");
console.log("Request body:", req.body);

  try {
    const orderData = req.body;

    console.log("📦 Incoming order data:", JSON.stringify(orderData, null, 2));

    // Check MongoDB connection
    const mongoState = mongoose.connection.readyState;
    console.log("🔗 MongoDB Connection State:", 
      mongoState === 0 ? "❌ Disconnected" :
      mongoState === 1 ? "✅ Connected" :
      mongoState === 2 ? "⏳ Connecting" :
      mongoState === 3 ? "⚠️ Disconnecting" : "❓ Unknown"
    );

    if (mongoState !== 1) {
      return res.status(500).json({ message: "Database not connected" });
    }

    // Validate required fields
    const missingFields = [];
    if (!orderData.name) missingFields.push("name");
    if (!orderData.email) missingFields.push("email");
    if (!orderData.phone) missingFields.push("phone");
    if (!orderData.address) missingFields.push("address");
    if (!orderData.paymentMethod) missingFields.push("paymentMethod");
    if (!orderData.cartItems || orderData.cartItems.length === 0) missingFields.push("cartItems");

    if (missingFields.length > 0) {
      console.log("❌ Missing required fields:", missingFields);
      return res.status(400).json({ message: "Missing fields", missingFields });
    }

    // Log cart items
    orderData.cartItems.forEach((item, index) => {
      console.log(`🛒 Item ${index + 1}:`, item);
    });

    // Create and save order
    const newOrder = new Orders(orderData);
    const savedOrder = await newOrder.save();

    console.log("✅ Order saved successfully! ID:", savedOrder._id);

    // Update product stock
    for (let item of orderData.cartItems) {
      try {
        const updatedProduct = await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { quantity: -item.count } },
          { new: true }
        );

        if (updatedProduct) {
          console.log(`✅ Stock updated for ${item.name}: ${updatedProduct.quantity}`);
        } else {
          console.log(`⚠️ Product not found: ${item.name}`);
        }
      } catch (err) {
        console.error(`❌ Error updating stock for ${item.name}:`, err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: savedOrder,
    });

  } catch (error) {
    console.error("❌ Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};
export default createOrder;