import { Router } from "express";
import { populateProgrammes } from "../controllers/populateController";

const router = Router();

// Route to categorise list of programmes
// Expected request body: Programme[]
router.post("/", populateProgrammes);

export default router;
