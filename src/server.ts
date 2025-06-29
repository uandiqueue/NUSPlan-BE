import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load .env variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Import and use routers
import nusmodsRoutes from "./routes/nusmods-routes";
import adminModuleUpdateRoutes from "./routes/admin/module/update";
import adminMapCacheRebuildRoutes from "./routes/admin/mapCacheRebuild";
import populateRoutes from "./routes/populate";

app.use(cors({
  origin: "http://nusplan-fe.s3-website-ap-southeast-2.amazonaws.com", // allow frontend to access backend
}));
app.use(express.json()); 
app.use("/api/module", nusmodsRoutes);
app.use("/api/admin/module", adminModuleUpdateRoutes);
app.use("/api/admin/map", adminMapCacheRebuildRoutes);
app.use("/api/populate", populateRoutes);

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
