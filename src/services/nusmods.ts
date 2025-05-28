import type { Module } from "../types/nusmods-types";

const BASE_URL = "https://api.nusmods.com/v2/2024-2025";

export async function fetchModuleList(): Promise<Module> {
    const res = await fetch(`${BASE_URL}/moduleList.json`);
    if (!res.ok) throw new Error("Failed to fetch module list");
    return res.json();
}

export async function fetchDetailedModuleList(): Promise<Module[]> {
    const res = await fetch(`${BASE_URL}/moduleInfo.json`);
    if (!res.ok) throw new Error("Failed to fetch detailed module list");
    return res.json();
}

export async function fetchModuleInfo(code: string): Promise<Module> {
    const res = await fetch(`${BASE_URL}/modules/${code.toUpperCase()}.json`);
    if (!res.ok) throw new Error("Failed to fetch module info");
    return res.json();
}