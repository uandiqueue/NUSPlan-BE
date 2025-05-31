import { ModuleCondensed } from "../types/nusmods-types";
import type { ProgramRequirement } from "../types/requirements-types";
import { getModulesByPrefix } from "./moduleFilter";

type CategorisedModules = {
  coreEssentials: ModuleCondensed[];
  coreElectives: ModuleCondensed[];
  coreSpecials: ModuleCondensed[];
  unrestrictedElectives: ModuleCondensed[];
};

export async function categoriseModulesByRequirement(
  requirement: ProgramRequirement
): Promise<CategorisedModules> {
  const filePath = "../data/moduleList.json"; // adjust if needed
  const allModules: ModuleCondensed[] = await getModulesByPrefix(""); // "" gets all modules

  const map: CategorisedModules = {
    coreEssentials: [],
    coreElectives: [],
    coreSpecials: [],
    unrestrictedElectives: [],
  };

  for (const mod of allModules) {
    const code = mod.moduleCode;

    // Match against each group using presence in code
    if (requirement.coreEssentials.some(m => m.moduleCode === code)) {
      map.coreEssentials.push(mod);
    }

    if (requirement.coreSpecials?.some(m => m.moduleCode === code)) {
      map.coreSpecials.push(mod);
    }

    if (requirement.unrestrictedElectives?.some(m => m.moduleCode === code)) {
      map.unrestrictedElectives.push(mod);
    }

    for (const [group, rule] of Object.entries(requirement.coreElectives)) {
      // Basic prefix match
      if (rule.included && code.startsWith(group.replace(/X+$/, ""))) {
        map.coreElectives.push(mod);
        break;
      }
    }
  }

  return map;
}
