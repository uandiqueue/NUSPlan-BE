import type { Module } from "../types/nusmods-types";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.NUSMODS_BASE_URL!;

if (!BASE_URL) throw new Error("Missing NUSMODS_BASE_URL in .env");

export async function fetchModuleList(): Promise<Module[]> {
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