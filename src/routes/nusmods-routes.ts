import { Router } from "express";
import { fetchModuleList, fetchDetailedModuleList, fetchModuleInfo } from "../services/nusmods";

const router = Router();

// Define routes to fetch summary of all modules
router.get("/list", async (_, res) => {
    try {
        const data = await fetchModuleList();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Define routes to fetch detailed information about all modules
router.get("/detail", async (_, res) => {
    try {
        const data = await fetchDetailedModuleList();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Define routes to fetch information about a specific module by its code
router.get("/:code", async (req, res) => {
    try {
        const data = await fetchModuleInfo(req.params.code);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
