import { Router } from "express";
import { fetchAndUpdateModuleList } from "../../../services/updater"

const router = Router();

// Define route to fetch and save summary of all modules
router.get("/update-module-list", async (_, res) => {
    try {
        const data = await fetchAndUpdateModuleList();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
