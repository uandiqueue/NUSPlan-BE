import {
  getModulesByPrefix,
  findExact,
} from "./query";
import type { ModuleCondensed } from "../types/nusmods-types";
import type { 
    GeneralModuleCode, 
    CategorisedModules,
    ModuleRequirementGroup,
    ModuleRequirement
} from "../types/requirement";
import type { AcadProgram } from "../model/acadProgram";

// Matching one GeneralModuleCode to modules
async function matchGeneralCode(gmc: GeneralModuleCode): Promise<ModuleCondensed[]> {
  switch (gmc.type) {
    case "exact": {
        const m = await findExact(gmc.code);
        return m ? [m] : [];
    }
    case "wildcard":
        return getModulesByPrefix(gmc.prefix);
    case "variant":
        return getModulesByPrefix(gmc.baseCode);
    default:
        // "other" modules usually aren’t in NUSMods (UPIP etc.).  Ignore for now.
        return [];
  }
}

// Guarantees the same module never appears twice in the resulting array, 
// even if two rules overlap (e.g. "CS1010" variant and wildcard "CS10").
// return an array with unique modules for a requirement (e.g. coreEssentials)
async function collect(codes: GeneralModuleCode[]): Promise<ModuleCondensed[]> {
    const seen = new Set<string>(); // to track module codes appeared
    const res: ModuleCondensed[] = [];

    for (const c of codes) {
        for (const mod of await matchGeneralCode(c)) {
            if (!seen.has(mod.moduleCode)) { // if not seen before
                seen.add(mod.moduleCode);
                res.push(mod);
            }
        }
    }
    return res;
}

// Flatten requirement tree
// not async because the rest of the categorisation happens after tree is flattened
function flattenRequirements(
    node: ModuleRequirementGroup | ModuleRequirement
): GeneralModuleCode[] {
    if ("children" in node) {
        return node.children.flatMap(flattenRequirements);
    }
    return node.modules ?? []; // if it's a leaf node, return the modules directly
}

// Categorise modules based on the requirement structure
export async function categoriseModulesByRequirement(
    program: AcadProgram
): Promise<CategorisedModules> {
    const cat: CategorisedModules = {};

    // For each section in requirement, extract its modules
    // (if the section is present), flatten, and store them in the output object.
    if (program.requirement.coreEssentials) {
        cat.coreEssentials = await collect(program.requirement.coreEssentials);
    }
    if (program.requirement.coreElectives) {
        const codes = flattenRequirements(program.requirement.coreElectives);
        cat.coreElectives = await collect(codes);
    }
    if (program.requirement.coreSpecials) {
        const codes = flattenRequirements(program.requirement.coreSpecials);
        cat.coreSpecials = await collect(codes);
    }
    if (program.requirement.coreOthers) {
        const codes = flattenRequirements(program.requirement.coreOthers);
        cat.coreOthers = await collect(codes);
    }
    if (program.requirement.commonCore) {
        const codes = flattenRequirements(program.requirement.commonCore);
        cat.commonCore = await collect(codes);
    }

    // Unrestricted electives stay empty until the user picks modules
    cat.unrestrictedElectives = [];

    if (program.requirement.constraints) {
        cat.constraints = {};
        const c = program.requirement.constraints;

        if (c.doubleCountModules?.length) {
            const codes = c.doubleCountModules.flatMap(flattenRequirements);
            cat.constraints.doubleCountModules = await collect(codes);
        }
        if (c.level1000Modules?.length) {
            const codes = c.level1000Modules.flatMap(flattenRequirements);
            cat.constraints.level1000Modules = await collect(codes);
        }
        if (c.level2000Modules?.length) {
            const codes = c.level2000Modules.flatMap(flattenRequirements);
            cat.constraints.level2000Modules = await collect(codes);
        }
        if (c.nonNUSModules?.length) {
            const codes = c.nonNUSModules.flatMap(flattenRequirements);
            cat.constraints.nonNUSModules = await collect(codes);
        }
        if (c.nonUniqueModules?.length) {
            const codes = c.nonUniqueModules.flatMap(flattenRequirements);
            cat.constraints.nonUniqueModules = await collect(codes);
        }
    }

  return cat;
}