import type { PrereqTree } from "./nusmods-types";

// For efficient lookup on frontend
export interface LookupPayload {
    tags: TagMap;
    units: UnitMap;
    prereqs: PrereqMap;
    preclusions: PreclusionMap;
    selected: string[]; // Selected modules by default or user
    version: number;
}

export interface TagMap {
    [moduleCode: string]: string[];
}
export interface UnitMap {
    [moduleCode: string]: number;
}
export interface PrereqMap {
    [moduleCode: string]: PrereqTree;
}
export interface PreclusionMap {
    [moduleCode: string]: string[];
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