// api/server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

// Routes imports
import adminRoutes from "../routes/adminRoute.js";
import userRoutes from "../routes/userRoute.js";
import orderRoutes from "../routes/orderRoutes.js";
import exportRoutes from "../routes/exportRoutes.js";
import productRoutes from "../routes/ProductRoutes.js";
import contactRoutes from "../routes/ContactRoute.js";
import couponRoutes from "../routes/couponRoutes.js";
import reviewRoutes from "../routes/reviewRoutes.js";
import categoryRoutes from "../routes/categoryRoutes.js";

// Environment
import dotenv from "dotenv";
dotenv.config();

// ------------------- MongoDB Global Cached Connection -------------------
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectToDatabase(uri) {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ------------------- Express App -------------------
const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://sharknutritionpk.store",
  "https://www.sharknutritionpk.store"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cookie']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/users", userRoutes); // optional
app.use("/api/orders", orderRoutes);
app.use("/export", exportRoutes);
app.use("/products", productRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/uploads", express.static("uploads"));

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Serverless API is working!" });
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to Shark Nutrition API (Serverless)");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ------------------- Vercel Serverless Export -------------------
export default async function handler(req, res) {
  // Connect to MongoDB before handling request
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI not defined");
    await connectToDatabase(process.env.MONGO_URI);
    // Let Express handle the request
    app(req, res);
  } catch (err) {
    console.error("❌ Serverless function error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
