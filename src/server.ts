import express from "express";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import and use routers
import nusmodsRoutes from "./routes/nusmods-routes";
import adminModuleUpdateRoutes from "./routes/admin/module/update";
import populateRoutes from "./routes/populate";

app.use(express.json()); 
app.use("/api/module", nusmodsRoutes);
app.use("/api/admin/module", adminModuleUpdateRoutes);
app.use("/api/populate", populateRoutes);

// GLOBAL ERROR HANDLER
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message ?? "Internal server error"
    });
});

app.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});