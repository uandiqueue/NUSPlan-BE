export type GeneralModuleCode =
    | { type: "exact"; code: string }             // e.g. "CS2100"
    | { type: "wildcard"; prefix: string }        // e.g. "LSM22" => matches LSM22xx
    | { type: "variant"; baseCode: string }       // e.g. "CS1010" => matches CS1010S/T/X
    | { type: "other"; code: string;            // e.g. "UPIP"
        requiresApproval: true };

export type RequirementGroupType =
    | "commonCore"
    | "unrestrictedElectives"
    | "coreEssentials"
    | "coreElectives"
    | "coreSpecials"
    | "coreOthers"
    | "constraints"

// Leaf: modules required
export interface ModuleRequirement {
    // rawTagName is used in the tagging system to track requirements
    // and will be processed in frontend to be more user-friendly
    // format: camelCase, e.g. "coreEssentials", "level3000+", "industry"
    rawTagName?: string;

    type: "min" | "max" | "general"; // "general" for the minimum units for a requirement block (logic follows min)
    value: number; // units
    modules: GeneralModuleCode[];
    exclude?: GeneralModuleCode[]; // special cases
    note?: string; 
}

// Branching: groups of requirements
export interface ModuleRequirementGroup {
    rawTagName?: string; // for frontend tracking and UI (pre-processed)
    logic: "AND" | "OR";
    children: (ModuleRequirementGroup | ModuleRequirement)[];
    required?: boolean; // defaults to true when undefined
    note?: string;
}

// Root: the entire requirement structure
export interface ProgramRequirement {
    // Faculty/Univeristy level requirements (common modules)
    commonCore?: ModuleRequirementGroup;
    // UEs (dynamically generated as user selects modules)
    unrestrictedElectives?: ModuleRequirementGroup;
    // Core modules that must be taken (flat structure)
    coreEssentials?: GeneralModuleCode[]; 
    // Core modules that can be chosen
    coreElectives?: ModuleRequirementGroup;
    // Core modules that are used for specializations
    coreSpecials?: ModuleRequirementGroup;
    // Core modules that are not part of the above categories
    coreOthers?: ModuleRequirementGroup;

    // Optional: additional constraints on module selection
    constraints?: {
        // Limit double counting of modules
        doubleCountModules?: ModuleRequirementGroup[];
        // Limit level-1000 modules
        level1000Modules?: ModuleRequirementGroup[];
        // Limit level-2000 modules
        level2000Modules?: ModuleRequirementGroup[];
        // Limit modules that are not NUS-taught
        nonNUSModules?: ModuleRequirementGroup[];
        // Limit modules that are not unique to the program
        // e.g. modules listed in another program's course list
        nonUniqueModules?: ModuleRequirementGroup[];
    };
}

// Represents the type of an academic program, such as Major, Second Major, or Minor.
export type ProgramType = "major" | "secondMajor" | "minor";

// Represents the metadata for an academic program
export interface ProgramMeta {
    name: string;
    type: ProgramType;
    honours?: boolean;
    requiredUnits: number;
    doubleCountCap: number;
    nusTaughtFraction: 0.6; // Minimum units that must be NUS-taught: 60% of total
}

