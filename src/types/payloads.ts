import { ProgramType, RequirementGroupType, ProgramMeta } from "./requirement";

// Expect the request body to have the following structure
export interface Programme {
    name: string;
    type: ProgramType;
}

// The form of a single course sent to the frontend
export type CourseInfo = {
    courseCode: string;
    title: string;
    units: number;
};

// Tags for courses, e.g. "Core", "Elective", "Specialization"
export interface CourseTag {
    moduleCode: string;
    tags: TagMeta[];
}

export type TagMeta =
    | {
        type: "doubleCount";
        visibleUI: boolean;
        programs: string[]; // e.g. ["LifeSciences-secondMajor", "DataScience-major"]
        }
    | {
        type: "requirementKeys";
        requirementKeys: string[]; // e.g. ["LS_Elective_3000Plus", "GE_GEX"]
        count: number; // for UI display
        };


// For course selection UI
export type CourseBox = 
    | ExactBox // fixed single course
    | DropdownBox // pick-one list (variants / electives)
    | AltPathBox; // path with nested boxes

export interface ExactBox {
    kind: "exact";
    boxKey: string;
    course: CourseInfo;
    UILabel: string; // e.g. "CS1010 - Programming Methodology"
    readonly: boolean;
}

export interface DropdownBox {
    kind: "dropdown";
    boxKey: string;
    options: CourseInfo[]; // variants or elective list
    selected?: CourseInfo; // chosen by user
    UILabel: string; // e.g. "SoC Common Curriculum"
    readonly: boolean;
}

// AltPathBox for paths with different courses (prerequisites, "or" logic)
export interface AltPathBox {
    kind: "altPath";
    boxKey: string;
    paths: {
        id: string; // unique for each path
        boxes: CourseBox[]; // nested boxes (exact / dropdown)
    }[];
    chosenPathId?: string; // set by FE
    UILabel: string; // e.g. "CS2109S Pre-requisites", "CS Focus Area"
    readonly: boolean;
}

export interface RequirementSection {
    group: RequirementGroupType;

    // Unique identifier for this requirement block 
    // Different from rawTagName as requirementKey is for general requirements, not just requirement grpups
    // e.g. "lifeSciences_coreElectives"
    requirementKey: string;

    requiredAU: number; // Total AU required for this section
    label: string; // UI label, e.g. "Core Electives"
    boxes: CourseBox[]; // Initial course selection boxes for this requirement
    note?: string;
}

export interface PopulatedProgramPayload {
    metadata: ProgramMeta;
    requirements: RequirementSection[]; // UI info for each requirement block
    moduleTags: CourseTag[]; // Tagging info
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
