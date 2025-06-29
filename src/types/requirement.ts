export type GeneralModuleCode =
    | { type: "exact"; code: string } // eg: "CS2100"
    | { type: "wildcard"; prefix: string } // eg: "LSM22" => matches LSM22xx
    | { type: "variant"; baseCode: string } // eg: "CS1010" => matches CS1010S/T/X
    | { type: "other"; code: string; // eg: "UPIP"
        requiresApproval: true };

export type RequirementGroupType =
    | "commonCore"
    | "unrestrictedElectives"
    | "coreEssentials"
    | "coreElectives"
    | "coreSpecials"
    | "coreOthers"

// Leaf: modules required
export interface ModuleRequirement {
    // rawTagName is used in the tagging system to track requirements
    // and will be processed in frontend to be more user-friendly
    // format: snake_case, e.g. "core_essentials", "level3000+", "industry"
    rawTagName: string;
    overall?: boolean; // if true, the values of this requirement becomes a section requirement units
    type: "min" | "max"; // "min" for minimum required, "max" for maximum allowed
    value: number; // units
    modules: GeneralModuleCode[];
    exclude?: GeneralModuleCode[]; // special cases (not yet implemented)
    note?: string; 
}

// Branching: groups of requirements
export interface ModuleRequirementGroup {
    rawTagName: string; // for frontend tracking and UI (pre-processed)
    logic: "AND" | "OR";
    children: (ModuleRequirementGroup | ModuleRequirement)[];
    required?: boolean; // defaults to true when undefined (not yet implemented)
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
};

// Represents the type of an academic program, such as Major, Second Major, or Minor.
export type ProgramType = "major" | "secondMajor" | "minor";

// Represents the metadata for an academic program
export interface ProgramMeta {
    name: string;
    type: ProgramType;
    honours?: boolean; // Default to true
    requiredUnits: number;
    doubleCountCap: number;
    nusTaughtFraction: 0.6; // Minimum units that must be NUS-taught: 60% of total (Not yet implemented)
}

