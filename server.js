import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

// ================== ROUTES ==================
import adminRoutes from "./routes/adminRoute.js";
import userRoutes from "./routes/userRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import productRoutes from "./routes/ProductRoutes.js";
import contactRoutes from "./routes/ContactRoute.js";
import couponRoutes from "./routes/couponRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// ================== APP ==================
const app = express();
const PORT = process.env.PORT || 5000;

// ================== CORS (PRODUCTION SAFE) ==================
const allowedOrigins = [
  "http://localhost:5173",
  "https://sharknutritionpk.store",
  "https://www.sharknutritionpk.store",
  "https://nutrition-backend-final.vercel.app",
  "https://api.sharknutritionpk.store", // future-proof
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server, Postman, curl
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);
      return callback(null, false);
    },
    credentials: true,
  })
);

// ================== MIDDLEWARE ==================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== REQUEST LOG ==================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ================== ROUTES ==================
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);

// ================== TEST ==================
app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Shark Nutrition API is running 🚀",
    time: new Date().toISOString(),
  });
});

// ================== ROOT ==================
app.get("/", (req, res) => {
  res.send("Welcome to Shark Nutrition Backend API");
});

// ================== 404 ==================
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ================== START SERVER ==================
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");
    console.log("📦 DB State:", mongoose.connection.readyState); // 1 = connected

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server start failed:", error.message);
  }
};

startServer();