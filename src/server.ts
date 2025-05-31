import express from "express";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import and use routers
import nusmodsRoutes from "./routes/nusmods-routes";
import adminModuleUpdateRoutes from "./routes/admin/module/update";

app.use("/api/module", nusmodsRoutes);
app.use("/api/admin/module", adminModuleUpdateRoutes);

app.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});