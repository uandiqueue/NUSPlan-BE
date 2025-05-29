import type { ModuleCode } from "../types/nusmods-types";

// Represents the requirements/constraints for electives
export interface Elective {
    name?: string; // name of the constraint, eg: "Level-2000 Core Electives"
    type: "min" | "max"; // type of constraint, either minimum or maximum
    value: number; // value of the constraint (in units)
    modules?: ModuleCode[]; // optional — only present on leaf nodes
    nested?: Elective[]; // optional — for branching constraints
    note?: string;
}

// Represents the requirements for a program, 
// including common curriculum (faculty/university requirement) (not implemented yet),
// core essentials, core electives, 
// optional core specials (specialisations),
// other requirements (eg: industrial attachment),
// unrestricted electives, and some constraints
export interface ProgramRequirement {
    coreEssentials: ModuleCode[];
    coreElectives: Elective[];
    coreSpecials?: Elective[];
    coreOthers?: Elective[];
    unrestrictedElectives?: Elective[];
    constraintModules?: {
        // Contains all modules that are overlapping with other programs,
        // if double-count units cap is reached,
        // part of these modules will not be counted towards the program
        doubleCountModules?: Elective[];

        // Contains all Level-1000 modules that can be counted towards the program
        // if level-1000 units cap is reached, 
        // part of these modules will not be counted towards the program
        level1000Modules?: Elective[];
        
        // Contains all Level-2000 modules that can be counted towards the program
        // if level-2000 units cap exists and is reached,
        // part of these modules will not be counted towards the program
        level2000Modules?: Elective[];

        // Contains all modules that are not NUS-taught,
        // if NUS-taught units cap is reached,
        // part of these modules will not be counted towards the program
        nonNUSModules?: Elective[];

        // Only for minors:
        // Contains all modules that are listed in another program's course list,
        // if similar modules cap is reached,
        // part of these modules will not be counted towards the program
        nonUniqueModules?: Elective[];
    };
}