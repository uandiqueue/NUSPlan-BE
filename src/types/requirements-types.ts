import type { Module } from "../types/nusmods-types";

// Represents the requirements for core electives grouped by level.
export interface CoreElectivesByLevel {
    included?: boolean;
    excluded?: Module[];
    maxUnits?: number;
    minUnits?: number;
    note?: string;
}

// Represents the requirements for a program, 
// including core essentials, core electives, 
// optional core specials (eg: industry/research attachment),
// unrestricted electives, and some constraints
export interface ProgramRequirement {
    coreEssentials: Module[];
    coreElectives: { [groupName: string]: CoreElectivesByLevel };
    coreSpecials?: Module[];
    unrestrictedElectives?: Module[];
    constraintModules?: {
        // Contains all modyules that are overlapping with other programs,
        // if double-count units cap is reached,
        // part of these modules will not be counted towards the program
        doubleCountModules?: Module[];

        // Contains all Level-1000 modules that can be counted towards the program
        // if level-1000 units cap is reached, 
        // part of these modules will not be counted towards the program
        level1000Modules?: Module[];
        
        // Contains all Level-2000 modules that can be counted towards the program
        // if level-2000 units cap exists and is reached,
        // part of these modules will not be counted towards the program
        level2000Modules?: Module[];

        // Contains all modules that are not NUS-taught,
        // if NUS-taught units cap is reached,
        // part of these modules will not be counted towards the program
        nonNUSModules?: Module[];

        // Only for minors:
        // Contains all modules that are listed in another program's course list,
        // if similar modules cap is reached,
        // part of these modules will not be counted towards the program
        nonUniqueModules?: Module[];
    };
}