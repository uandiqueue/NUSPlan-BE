import { ProgramType, RequirementGroupType, ProgramMeta } from "./requirement";

/* 
Page 1, Program Selection
*/
// Expect the request body to have the following structure 
export interface Programme {
    name: string;
    type: ProgramType;
}


/* 
Page 2, Course Selection Pool (Populator)
*/
// Expect the response body to have the following structure 
export interface PopulatedProgramPayload {
    metadata: ProgramMeta; // For a single program, multiple payloads will be sent if multiple programs selected
    requirements: RequirementSection[]; // UI info for each requirement block
    moduleTags: CourseTag[]; // Tagging info
}

// A single section within a program, a program will have multiple sections
export interface RequirementSection {
    group: RequirementGroupType;

    // Unique identifier for this requirement block 
    // Different from rawTagName as requirementKey is for general requirements, not just requirement grpups
    // e.g. "life_sciences-core_electives"
    requirementKey: string;

    requiredUnits: number; // Total AU required for this section
    label: string; // UI label, e.g. "Core Electives"
    boxes: CourseBox[]; // Initial course selection boxes for this requirement
    note?: string;
}

// For course selection UI, within a section there will be multiple course boxes
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
export interface AltPathBox {
    // AltPathBox for paths with different courses (prerequisites, "or" logic)
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
        programs: string[]; // e.g. ["life_sciences-second_major", "data_science-major"]
        visibleUI: boolean; // for UI display (D)
        }
    | {
        type: "requirementKeys";
        requirementKeys: string[]; // e.g. ["life_sciences-second_major-core_essentials-lsm1111"]
        count: number; // for UI display
        };


/* 
For backend 
*/
export interface CapRule { 
    tag: string; // e.g. "life_sciences-core_electives-level_1000_cap-..."
    maxUnits: number; 
    courses: string[] // Course code
}