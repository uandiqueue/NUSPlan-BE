import fs from "node:fs/promises";
import path from "path";
import { ModuleCondensed } from "../types/nusmods-types";

export async function getModulesByPrefix(prefix: string): Promise<ModuleCondensed[]> {
    const filePath = path.join(__dirname, "../data/moduleList.json");

    const raw = fs.readFile(filePath, "utf-8");
    const modules: ModuleCondensed[] = JSON.parse(raw);

    return modules.filter((mod) => mod.moduleCode.startsWith(prefix));
}
