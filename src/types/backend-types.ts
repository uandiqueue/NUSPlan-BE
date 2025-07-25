import type { ModuleCode } from "./nusmods-types";
import type { RequirementGroupType, ProgrammeType, ProgrammeSection } from "./shared-types";

// BACKEND INTERNAL TYPES

// Internal programme representation after validation
export interface ProcessedProgramme {
    programmeId: string;
    metadata: {
        name: string;
        type: ProgrammeType;
        requiredUnits: number;
        doubleCountCap: number;
    };
    processedPaths: ProcessedPath[];
    maxRules: InternalMaxRule[];
    preselectedModules: ModuleCode[];
    prerequisiteModules: ModuleCode[]; // Auto-added prerequisites
    childrenMap: Map<string, string[]>; // parentPathID -> childrenPathIDs
}

// Internal path representation
export interface ProcessedPath {
    pathId: string;
    pathKey: string;
    parentPathKey?: string;
    groupType: RequirementGroupType;
    rawTagName: string;
    displayLabel: string;
    logicType: 'AND' | 'OR' | 'LEAF';
    ruleType?: 'min' | 'max';
    ruleValue?: number;
    requiredUnits: number;
    depth: number;
    isLeaf: boolean;
    isReadonly: boolean;
    isOverallSource: boolean;
    exceptionModules: ModuleCode[];
    moduleCodes: ModuleCode[];
    gmcMappings: GMCMapping[];
}

// Internal max rule representation
export interface InternalMaxRule {
    maxRuleId: string;
    pathId: string;
    pathKey: string;
    displayLabel: string;
    maxUnits: number;
    parentGroupType: RequirementGroupType;
    affectedModules: ModuleCode[];
}

// GMC to module mapping
export interface GMCMapping {
    gmcType: 'exact' | 'wildcard' | 'variant' | 'other';
    gmcCode: string;
    moduleCode: ModuleCode;
    requiresApproval?: boolean;
}

// DATABASE RESULT TYPES

// Module data from database
export interface ModuleData {
    module_code: string;
    title: string;
    module_credit: string;
    description?: string;
    department?: string;
    faculty?: string;
    aliases?: string[];
    prerequisite?: string;
    preclusion?: string;
    semester_data?: any;
}

// Programme data from database  
export interface ProgrammeData {
    id: string;
    name: string;
    type: string;
    honours?: boolean;
    required_units: number;
    double_count_cap: number;
}

// Requirement path data from database
export interface RequirementPathData {
    id: string;
    programme_id: string;
    path_key: string;
    parent_path_key?: string;
    display_label: string;
    logic_type: string;
    rule_type?: string;
    rule_value?: number;
    required_units?: number;
    depth: number;
    is_leaf: boolean;
    is_readonly: boolean;
    group_type: string;
    raw_tag_name: string;
    module_codes?: string[];
    module_types?: string[];
    is_overall_source: boolean;
    exception_modules: string[];
}

// GMC mapping data from database
export interface GMCMappingData {
    gmc_code: string;
    gmc_type: string;
    module_code: string;
    programme_id: string;
}

// Programme preclusion data
export interface ProgrammePreclusionData {
    programme_id: string;
    precluded_programme_id: string;
    reason?: string;
}

// Prerequisite rule
export interface PrerequisiteRule {
    rule_type: string;
    required_modules: string[] | null;
    logic_operator: string;
    quantity_required: number;
    module_pattern: string | null;
    grade_required: string | null;
    pattern_quantity: number | null;
    original_text: string;
    rule_complexity: string;
}

// Preclusion data
export interface PreclusionData {
    module_code: string;
    precluded_modules: string[];
}

// Simple Prerequisite data
export interface PrerequisiteData {
    module_code: string;
    required_modules: string[] | null;
}

// INTERNAL PROCESSING INTERFACES

// Context for processing multiple programmes
export interface ProcessingContext {
    programmes: Map<string, ProcessedProgramme>;
    preselectedModules: Map<ModuleCode, string[]>; // moduleCode -> programmeIds
    maxRules: InternalMaxRule[];
    errors: ValidationError[];
    stats: {
        processedPaths: number;
        processedModules: number;
        startTime: number;
    };
}

// Validation error for internal processing
export interface ValidationError {
    type: 
        | 'INVALID_PROGRAMME_COMBINATION'
        | 'HARD_ERROR'
        | 'SOFT_ERROR'
    message: string;
    programmeIds?: string[];
    moduleCode?: ModuleCode;
    pathId?: string;
}

// Double-counting analysis result
export interface DoubleCountAnalysis {
    moduleCode: ModuleCode;
    crossProgrammePaths: Array<{
        pathKey: string;
        programmeId: string;
        displayLabel: string;
        groupType: RequirementGroupType;
        rawTagName: string;
    }>;
    intraProgrammePaths: Array<{
        pathKey: string;
        programmeId: string;
        displayLabel: string;
        groupType: RequirementGroupType;
        rawTagName: string;
    }>;
    isEligible: boolean;
}