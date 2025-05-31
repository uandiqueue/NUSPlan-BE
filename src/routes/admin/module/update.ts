// src/routes/modules.ts
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fetchModuleList } from "../../../services/nusmods";
import type { ModuleCondensed } from "../../../types/nusmods-types";

const router = Router();

// Define route to fetch and save summary of all modules
router.get("/update-module-list", async (_, res) => {
    try {
        const data: ModuleCondensed[] = await fetchModuleList();
        const filePath = path.join(__dirname, "../../../data/moduleList.json");

        // Save to file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        res.json({ message: "Module list fetched and saved successfully.", count: data.length });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
