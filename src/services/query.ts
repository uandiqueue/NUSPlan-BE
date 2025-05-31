import fs from "node:fs/promises";
import path from "path";
import { ModuleCondensed } from "../types/nusmods-types";


// Internal function to load the module list from file
async function loadAll(): Promise<ModuleCondensed[]> {
    let data: ModuleCondensed[] = [];
    const filePath = path.join(__dirname, "../data/moduleList.json");
    const raw = await fs.readFile(filePath, "utf-8");
    data = JSON.parse(raw);
    return data;
}

// Get list of all modules that match a given prefix
export async function getModulesByPrefix(prefix: string): Promise<ModuleCondensed[]> {
    const mods = await loadAll();
    return mods.filter((m) => m.moduleCode.startsWith(prefix));
}

// Get summarised module by its code
export async function findExact(code: string): Promise<ModuleCondensed | undefined> {
    const mods = await loadAll();
    return mods.find((m) => m.moduleCode === code);
}

// Get all modules
export async function getAllModules(): Promise<ModuleCondensed[]> {
    return loadAll();
}
