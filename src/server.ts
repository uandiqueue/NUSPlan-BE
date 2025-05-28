import express from "express";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import and use routers
import nusmodsRoutes from "./routes/nusmods-routes";

app.use("/api/module", nusmodsRoutes);

app.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
});