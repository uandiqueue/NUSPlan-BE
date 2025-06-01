import {
  getModulesByPrefix,
  findExact,
  loadCommonCore
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
        case "other": {
            // case for commonCore codes, e.g. "common-soc"
            const m = gmc.code.match(/^common-(.+)$/);
            if (m) {
                const fac = m[1];
                const codes = await loadCommonCore(fac);
                const flattened = await Promise.all(
                    flattenRequirements(codes).map(matchGeneralCode)
                );
                return flattened.flat();
            }
            // non-common “other” tokens (UPIP, etc.) ignored for now
            return [];
        }
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
    // If the module is a core essential, it will not be in any other category.
    const essentials = new Set<string>();

    // For each section in requirement, extract its modules
    // (if the section is present), flatten, and store them in the output object.
    if (program.requirement.coreEssentials) {
        cat.coreEssentials = await collect(program.requirement.coreEssentials);
        // Add core essentials to the set of essentials
        cat.coreEssentials.forEach(m => essentials.add(m.moduleCode));
    }
    if (program.requirement.coreElectives) {
        const codes = flattenRequirements(program.requirement.coreElectives);
        cat.coreElectives = await collect(codes);
        // Filter out core essentials from core electives
        // keep only modules NOT seen before
        cat.coreElectives = cat.coreElectives.filter(m => !essentials.has(m.moduleCode));
    }
    if (program.requirement.coreSpecials) {
        const codes = flattenRequirements(program.requirement.coreSpecials);
        cat.coreSpecials = await collect(codes);
        cat.coreSpecials = cat.coreSpecials.filter(m => !essentials.has(m.moduleCode));
    }
    if (program.requirement.coreOthers) {
        const codes = flattenRequirements(program.requirement.coreOthers);
        cat.coreOthers = await collect(codes);
        cat.coreOthers = cat.coreOthers.filter(m => !essentials.has(m.moduleCode));
    }
    if (program.requirement.commonCore) {
        const codes = flattenRequirements(program.requirement.commonCore);
        cat.commonCore = await collect(codes);
        cat.commonCore = cat.commonCore.filter(m => !essentials.has(m.moduleCode));
    }

    // Unrestricted electives stay empty until the user picks modules
    cat.unrestrictedElectives = [];

    // Ignore for now
    cat.constraints = undefined;

    return cat;
}