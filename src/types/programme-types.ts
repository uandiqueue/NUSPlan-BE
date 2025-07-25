/**
 * AcadProgram Types
 *
 * This interface defines the structured representation of academic programme requirements
 * as extracted from official NUS documentation. These types serve as an intermediate format
 * for curation, validation, and transformation into database-ready structures. 
 * They are not used directly in backend logic or database queries.
 */
interface AcadProgram {
    meta: ProgramMeta;
    requirement: ProgramRequirement;
}

// Represents the metadata for an academic program
interface ProgramMeta {
    name: string;
    type: "major" | "secondMajor" | "minor";
    honours?: boolean; // Default to true
    requiredUnits: number;
    doubleCountCap: number;
    nusTaughtFraction: 0.6; // Minimum units that must be NUS-taught: 60% of total (Not yet implemented)
}

// Root: the entire requirement structure
interface ProgramRequirement {
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

type GeneralModuleCode =
    | { type: "exact"; code: string } // eg: "CS2100"
    | { type: "wildcard"; prefix: string } // eg: "LSM22" => matches LSM22xx
    | { type: "variant"; baseCode: string } // eg: "CS1010" => matches CS1010S/T/X
    | { type: "other"; code: string; requiresApproval?: boolean }; // eg: "UPIP", "NOC"

// Leaf: modules required
interface ModuleRequirement {
    // rawTagName is used in the tagging system to track requirements
    // and will be processed in frontend to be more user-friendly
    // format: snake_case, e.g. "core_essentials", "level3000+", "industry"
    rawTagName: string;
    overall?: boolean; // If true, this requirement will not be rendered as a block, but rather as an overall requirement
                       // User can add course boxes in section where overall requirement are presented
                       // The course boxes added will be dropdown boxes with the modules that satisfy this requirement
    type: "min" | "max"; // "min" for minimum required, "max" for maximum allowed
    value: number; // units
    modules: GeneralModuleCode[];
    excludes?: string[]; // module codes that are excluded from this requirement
    note?: string; 
}

// Branching: groups of requirements
interface ModuleRequirementGroup {
    rawTagName: string; // for frontend tracking and UI (pre-processed)
    logic: "AND" | "OR";
    children: (ModuleRequirementGroup | ModuleRequirement)[];
    required?: boolean; // defaults to true when undefined (not yet implemented)
    note?: string;
}


