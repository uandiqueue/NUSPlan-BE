/**
 * NUSMods API Service
 * This service provides functions to fetch module data from the NUSMods API.
 */

import type { Module , ModuleCondensed, ModuleInformation } from "../types/nusmods-types";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

// Define the base URL for NUSMods API
const BASE_URL = process.env.NUSMODS_BASE_URL! || "https://api.nusmods.com/v2/2024-2025";

/**
 * Fetch a summarised list of all modules from NUSMods API.
 */
export async function fetchModuleList(): Promise<ModuleCondensed[]> {
    const res = await fetch(`${BASE_URL}/moduleList.json`);
    if (!res.ok) throw new Error("Failed to fetch module list");
    return res.json();
}

/**
 * Fetch a detailed list of all modules from NUSMods API.
 */
export async function fetchDetailedModuleList(): Promise<ModuleInformation[]> {
    const res = await fetch(`${BASE_URL}/moduleInfo.json`);
    if (!res.ok) throw new Error("Failed to fetch detailed module list");
    return res.json();
}

/**
 * Fetch ultra-detailed information for a specific module by its code.
 * Main function to retrieve complete module data.
 */
export async function fetchModuleInfo(code: string): Promise<Module> {
    const res = await fetch(`${BASE_URL}/modules/${code.toUpperCase()}.json`);
    if (!res.ok) throw new Error("Failed to fetch module info");
    return res.json();
}