import fs from "node:fs/promises";
import path from "path";
import { fetchModuleList } from "./nusmods";
import type { ModuleCondensed } from "../types/nusmods-types";

export async function fetchAndUpdateModuleList(): Promise<ModuleCondensed[]> {
    try {
        const moduleList = await fetchModuleList();
        const filePath = path.join(__dirname, "../data/moduleList.json");

        // Save to server database
        await fs.writeFile(filePath, JSON.stringify(moduleList, null, 2));

        return moduleList;
    } catch (err) {
        throw new Error("Failed to fetch and update module list");
    }
}