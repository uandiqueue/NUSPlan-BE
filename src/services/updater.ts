import fs from "node:fs/promises";
import path from "path";
import { fetchModuleList, fetchModuleInfo } from "./nusmods";
import type { ModuleCondensed, Module } from "../types/nusmods-types";

// Importing NUSMods-defined summarised modules list
export async function fetchAndUpdateModuleList(): Promise<ModuleCondensed[]> {
    try {
        const moduleList: ModuleCondensed[] = await fetchModuleList();
        const filePath = path.join(__dirname, "../data/NUSMods/moduleList.json");

        // Save to server database
        await fs.writeFile(filePath, JSON.stringify(moduleList, null, 2));

        return moduleList;
    } catch (err) {
        throw new Error("Failed to fetch and update module list");
    }
}

// Importing NUSMods-defined ultra-detailed (Module type) modules list
export async function fetchAndUpdateUltraList(): Promise<Module[]> {
    const filePath = path.join(__dirname, "../data/NUSMods/ultraDetailedModuleList.json");

    // Try to load the current ultra detailed modules list.
    let ultraDetailedModules: Module[] = [];
    try {
        const data = await fs.readFile(filePath, "utf8");
        ultraDetailedModules = JSON.parse(data);
    } catch (err) {
        // Start with an empty array if file is problematic
        ultraDetailedModules = [];
    }


    // Quick lookup of existing module codes (prevent redundant fetches)
    const fetchedModuleCodes = new Set(
        ultraDetailedModules.map((mod) => mod.moduleCode)
    );

    // Get all the module summaries.
    const summaryList = await fetchModuleList();

    // Fetch ultra-detailed module info for each module not yet in database
    for (const module of summaryList) {
        const code = module.moduleCode;
        if (!fetchedModuleCodes.has(code)) {
            try {
                const ultraDetailedModule = await fetchModuleInfo(code);
                ultraDetailedModules.push(ultraDetailedModule);
                fetchedModuleCodes.add(code);
            } catch (err) {
                throw new Error("Failed to fetch ultra detailed module list");
            }
        }
    }

    // Save to server database
    try {
        await fs.writeFile(filePath, JSON.stringify(ultraDetailedModules, null, 2));

        return ultraDetailedModules;
    } catch (err) {
        throw new Error("Failed to update ultra detailed module list in file");
    }
}