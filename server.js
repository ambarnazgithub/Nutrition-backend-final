
// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

// Import routes
import adminRoutes from "./routes/adminRoute.js";
import userRoutes from "./routes/userRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import productRoutes from "./routes/ProductRoutes.js";
import contactRoutes from "./routes/ContactRoute.js";
import couponRoutes from "./routes/couponRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// =============== EXPRESS APP ===============
const app = express();
const PORT = process.env.PORT || 5000;

// =============== MIDDLEWARE ===============
// CORS

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://sharknutritionpk.store",
  "https://www.sharknutritionpk.store"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cookie']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// =============== ROUTES ===============
import categoryRoutes from "./routes/categoryRoutes.js";

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
app.get("/test", async (req, res) => {
  try {
    res.json({
      message: "Server is working!",
      routes: ["GET /test", "POST /api/orders", "GET /api/orders/test"],
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to Shark Nutrition API ");
});
// ADD this BEFORE the 404 handler:
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(` 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found", method: req.method, url: req.url });
});


// =============== START SERVER + MONGO CONNECTION ===============

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// UPDATE startServer() function:
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    // Debug: Log the connection string (masking the password for security)
    const uri = process.env.MONGO_URI;
    const maskedURI = uri.replace(/:([^:@]+)@/, ":****@");
    console.log(`🔌 Connecting to MongoDB: ${maskedURI}`);

    // Connect to MongoDB with better error handling
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45s
    });

    console.log("✅ MongoDB connected");
    console.log("📊 MongoDB state:", mongoose.connection.readyState);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1); // Exit if can't connect
  }
};
// Start the server
startServer();
