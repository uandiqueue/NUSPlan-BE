import type { Module } from "../types/nusmods-types";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

// Define the base URL for NUSMods API
const BASE_URL = process.env.NUSMODS_BASE_URL! || "https://api.nusmods.com/v2/2024-2025";

// Get summaries of all modules
export async function fetchModuleList(): Promise<Module[]> {
    const res = await fetch(`${BASE_URL}/moduleList.json`);
    if (!res.ok) throw new Error("Failed to fetch module list");
    return res.json();
}

// Get detailed information about all modules
export async function fetchDetailedModuleList(): Promise<Module[]> {
    const res = await fetch(`${BASE_URL}/moduleInfo.json`);
    if (!res.ok) throw new Error("Failed to fetch detailed module list");
    return res.json();
}

// Get all information about a specific module by its code
export async function fetchModuleInfo(code: string): Promise<Module> {
    const res = await fetch(`${BASE_URL}/modules/${code.toUpperCase()}.json`);
    if (!res.ok) throw new Error("Failed to fetch module info");
    return res.json();
}