/* 
Creates JSON maps (prereqMap, preclusionMap), 
so they can be delivered to the client quickly or imported server-side. 
*/
import fs from "node:fs/promises";
import path from "path";

import type { Module } from "../../types/nusmods-types";
import type { 
    PrereqMap, 
    PreclusionMap
} from "../../types/validator";

import { getUltraList } from "../query";


export async function buildMapCache() {
    const ultraCourseList = await getUltraList();

    // Output directory for generated maps
    const OUT_DIR = path.join(__dirname, "../../data/maps");

    const prereqMap: PrereqMap = {};
    const preclusionMap: PreclusionMap = {};

    (ultraCourseList as Module[]).forEach((m) => {
        if (m.prereqTree)
            prereqMap[m.moduleCode] = m.prereqTree
        if (m.preclusionRule) {
            // Extract course codes from preclusionRule using regex (XX1234:D/S/B+)
            const matches = m.preclusionRule.match(/([A-Z][A-Z0-9]{1,9})(?=:[A-ZU][+-]?)/g);
            if (matches) {
                preclusionMap[m.moduleCode] = matches.map((entry) =>
                    entry.split(":")[0].trim().toUpperCase())
            }
        }
    });

    // write JSON maps to OUT_DIR                                          
    await fs.writeFile(
        path.join(OUT_DIR, "prereqMap.json"),
        JSON.stringify(prereqMap, null, 4)
    );
    await fs.writeFile(
        path.join(OUT_DIR, "preclusionMap.json"),
        JSON.stringify(preclusionMap, null, 4)
    );
    
    console.log("prereq and preclusion maps generated");
}
