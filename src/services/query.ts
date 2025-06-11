import fs from "node:fs/promises";
import path from "path";
import type { ModuleCondensed , Module } from "../types/nusmods-types";
import type { ModuleRequirementGroup } from "../types/requirement";
import type { CourseInfo } from "../types/payloads";

/* commonCore data loader */
export async function loadCommonCore(fac: string): Promise<ModuleRequirementGroup> {
    const filePath = path.join(__dirname, `../data/commonCore/${fac}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    const data: ModuleRequirementGroup = JSON.parse(raw);
    return data;
}


/* NUSMods module list loader */
let cache: ModuleCondensed[] | undefined;
let largeCache: Module[] | undefined;

// ULTRA DETAILED MODULE LIST
// Internal function to load the ultra-detailed module list from file
async function loadUltraList(): Promise<Module[]> {
    if (largeCache !== undefined) return largeCache; // Return cached data if available
    const filePath = path.join(__dirname, "../data/NUSMods/ultraDetailedModuleList.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data: Module[] = JSON.parse(raw);
    largeCache = data;
    return data;
}
// Get ultra-detailed list of all modules that match a given prefix
export async function getUltraByPrefix(prefix: string): Promise<Module[]> {
    const mods = await loadUltraList();
    return mods.filter((m) => m.moduleCode.startsWith(prefix));
}
// Get ultra-detailed module by its code
export async function findExactUltra(code: string): Promise<Module | undefined> {
    const mods = await loadUltraList();
    return mods.find((m) => m.moduleCode === code);
}
// Get ultra-detailed list of all modules
export async function getUltraList(): Promise<Module[]> {
    return loadUltraList();
}


// SUMMARISED MODULE LIST
// Internal function to load the summarised module list from file
async function loadSummarisedModulesList(): Promise<ModuleCondensed[]> {
    if (cache !== undefined) return cache; // Return cached data if available
    const filePath = path.join(__dirname, "../data/NUSMods/moduleList.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data: ModuleCondensed[] = JSON.parse(raw);
    cache = data;
    return data;
}
// Get summarised list of all modules that match a given prefix
export async function getModulesSummaryByPrefix(prefix: string): Promise<ModuleCondensed[]> {
    const mods = await loadSummarisedModulesList();
    return mods.filter((m) => m.moduleCode.startsWith(prefix));
}
// Get summarised module by its code
export async function findExactSummary(code: string): Promise<ModuleCondensed | undefined> {
    const mods = await loadSummarisedModulesList();
    return mods.find((m) => m.moduleCode === code);
}
// Get summarised list of all modules
export async function getSummarisedModulesList(): Promise<ModuleCondensed[]> {
    return loadSummarisedModulesList();
}


/* Custom CourseInfo list loader */
// Load from NUSMods Ultra List from database and convert to CourseInfo
// Get CourseInfo list of all courses that match a given prefix
export async function getCourseInfoByPrefix(prefix: string): Promise<CourseInfo[]> {
    const mods = await loadUltraList();
    const filtered = mods.filter((m) => m.moduleCode.startsWith(prefix));

    // Map the filtered modules to CourseInfo
    return filtered.map((m) => ({
        courseCode: m.moduleCode,
        title: m.title,
        units: parseInt(m.moduleCredit, 10)
    }));
}
// Get CourseInfo by its code
export async function findExactCourseInfo(code: string): Promise<CourseInfo | undefined> {
    const mods = await loadUltraList();
    const found = mods.find((m) => m.moduleCode === code);

    // Convert the found module to a CourseInfo
    return found
    ? {
        courseCode: found.moduleCode,
        title: found.title,
        units: parseInt(found.moduleCredit, 10)
    }
    : undefined;
}
