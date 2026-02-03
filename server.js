
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
// server.js
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://sharknutritionpk.store",
  "https://www.sharknutritionpk.store",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); 

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

 
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));


app.options("*", cors(corsOptions));


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
  res.send("Welcome to Shark Nutrition API");
});

// 404 handler
app.use((req, res) => {
  console.log(` 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found", method: req.method, url: req.url });
});

// =============== START SERVER + MONGO CONNECTION ===============
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");
    console.log("MongoDB connection state:", mongoose.connection.readyState); // 1 = connected

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Test URL: http://localhost:${PORT}/test`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
};

startServer();
