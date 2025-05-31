export type GeneralModuleCode =
    | { type: "exact"; code: string }             // e.g. "CS2100"
    | { type: "wildcard"; prefix: string }        // e.g. "LSM22" => matches LSM22xx
    | { type: "variant"; baseCode: string }       // e.g. "CS1010" => matches CS1010S/T/X
    | { type: "special"; code: string;            // e.g. "UPIP"
        requiresApproval: true };

// Leaf: modules required
export interface ModuleRequirement {
    type: "min" | "max";
    value: number; // units
    modules: GeneralModuleCode[];
    note?: string;
}

// Branching: groups of requirements
export interface ModuleRequirementGroup {
    name?: string;
    logic: "AND" | "OR";
    children: (ModuleRequirementGroup | ModuleRequirement)[];
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

// Represents an academic program, such as a Major, Second Major, or Minor.
export class AcadProgram {
    meta: ProgramMeta;
    requirement: ProgramRequirement;

    constructor(meta: ProgramMeta, requirement: ProgramRequirement) {
        this.meta = meta;
        this.requirement = requirement;
    }

    getProgramType(): ProgramType {
        return this.meta.type;
    }

    getMinRequiredUnits(): number {
        return this.meta.requiredUnits;
    }

    getMaxDoubleCountUnits(): number {
        return this.meta.doubleCountCap;
    }

    getMinNUSUnits(): number {
        return Math.ceil(this.meta.requiredUnits * this.meta.nusTaughtFraction);
    }
}




