import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

// Load correct .env variables (local v. production)
dotenv.config({
  path: process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "../.env.production")
    : path.resolve(__dirname, "../.env"),
});

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Import and use routers
import nusmodsRoutes from "./routes/nusmods-routes";
import adminModuleUpdateRoutes from "./routes/localmods-routes";
import academicPlanRoutes from "./routes/academic-plan";

app.use(cors({
  origin: CORS_ORIGIN, // allow frontend to access backend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); 
app.use("/api/module", nusmodsRoutes);
app.use("/api/admin/module", adminModuleUpdateRoutes);
app.use("/api/academic-plan", academicPlanRoutes);
app.get("/api/test", (_req, res) => {
  res.json({ message: "Backend is alive!" });
});

app.get("/", (_req, res) => {
  res.send("nusplan-backend is alive!");
});

// GLOBAL ERROR HANDLER
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message ?? "Internal server error"
    });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`server listening on ${PORT}`);
});
