import type { PrereqTree, ModuleCode } from "./nusmods-types";
import type { CapRule } from "./populator";

// For efficient lookup on frontend
export interface LookupPayload {
    tags: TagMap;
    units: UnitMap;
    prereqs: PrereqMap;
    preclusions: PreclusionMap;
    maxRequirements: MaxMap;
    minRequirements: Record<string, number>;
    selected: ModuleCode[]; // Selected modules by default or user
    version: number;
}

export interface TagMap {
    [moduleCode: ModuleCode]: string[];
}
export interface UnitMap {
    [moduleCode: ModuleCode]: number;
}
export interface PrereqMap {
    [moduleCode: ModuleCode]: PrereqTree;
}
export interface PreclusionMap {
    [moduleCode: ModuleCode]: ModuleCode[]; // moduleCode -> list of precluded moduleCodes
}
export interface MaxMap {
    [moduleCode: ModuleCode]: CapRule[]; // moduleCode -> list of max requirementKeys/maxRuleTags
}
export interface MinMap {
    [tagString: string]: number; // tagString -> minimum required units
}

// For requirement fulfilment indicator UI
export interface BlockProgress {
    requirementKey: string;
    requiredAU: number;
    currentAU: number;
    fulfilled: boolean;
}
export interface RequirementFulfilmentPayload {
    programmeId: string;
    blocks: Record<string, BlockProgress>;
    doubleCountUsed: number;
    doubleCountCap: number;
    warnings?: string[];
    version: number;
}