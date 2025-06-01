import fs from "node:fs/promises";
import path from "path";
import { ModuleCondensed } from "../types/nusmods-types";
import type { ModuleRequirementGroup } from "../types/requirement";

// NUSMods module list loader
let cache: ModuleCondensed[] | undefined;

// Internal function to load the module list from file
async function loadAll(): Promise<ModuleCondensed[]> {
    if (cache !== undefined) return cache; // Return cached data if available
    const filePath = path.join(__dirname, "../data/NUSMods/moduleList.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data: ModuleCondensed[] = JSON.parse(raw);
    cache = data;
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


// commonCore data loader
export async function loadCommonCore(fac: string): Promise<ModuleRequirementGroup> {
    const filePath = path.join(__dirname, `../data/commonCore/${fac}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    const data: ModuleRequirementGroup = JSON.parse(raw);
    return data;
}