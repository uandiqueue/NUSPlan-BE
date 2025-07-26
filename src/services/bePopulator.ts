import { DatabaseQueryService } from "./dbQuery";
import { ProcessingContextService } from "./processingContext";
import type { ModuleCode } from "../types/nusmods-types";
import type { 
    ProcessingContext,
    ProcessedProgramme, 
    ProcessedPath,
    GMCMapping,
    InternalMaxRule
} from "../types/backend-types";
import type {
    ProgrammePayload,
    ProgrammeSection,
    CourseBox,
    LookupMaps,
    LeafPathMapping,
    DoubleCountInfo,
    RequirementGroupType
} from "../types/shared-types";
import { PROCESSING_ORDER } from "../types/shared-types";

/**
 * BackendPopulator class builds complete responses for frontend consumption.
 * 1. Processes all programmes and their paths
 * 2. Builds combination-specific lookup maps for all programmes while processing
 * 3. Builds combination-specific max rule mappings
 * 4. Analyzes double-counting eligibility for this specific combination
 * 5. Builds individual programme payloads
 */
export class BackendPopulator {
    private dbQuery: DatabaseQueryService;
    private contextService: ProcessingContextService;
    private context: ProcessingContext;

    constructor(contextService: ProcessingContextService) {
        this.dbQuery = new DatabaseQueryService();
        this.contextService = contextService;
        this.context = contextService.getContext();
    }

    /**
     * Main population entry point
     */
    async buildPayloads(): Promise<{ programmes: ProgrammePayload[]; lookup: LookupMaps }> {
        console.log('Building payloads...');

        try {
            const programmes = Array.from(this.context.programmes.values());
            for (const programme of programmes) {
                await this.processProgramme(programme);
                if (this.contextService.hasErrors()) return { programmes: [], lookup: {} as LookupMaps };
            }

            const sharedLookupMaps = this.buildLookupMaps(programmes);
            if (this.contextService.hasErrors()) return { programmes: [], lookup: {} as LookupMaps };

            const payloads: ProgrammePayload[] = [];
            for (const programme of programmes) {
                const payload = await this.buildProgrammePayload(programme, sharedLookupMaps);
                if (this.contextService.hasErrors()) return { programmes: [], lookup: {} as LookupMaps };
                payloads.push(payload);
            }

            console.log(`Generated ${payloads.length} payloads`);
            return { programmes: payloads, lookup: sharedLookupMaps };

        } catch (error) {
            this.contextService.addError({
                type: 'HARD_ERROR',
                message: `Payload building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            return { programmes: [], lookup: {} as LookupMaps };
        }
    }

    /**
     * Processes all programmes and their paths
     */
    private async processProgramme(programme: ProcessedProgramme): Promise<void> {
        const allPaths = await this.dbQuery.getRequirementPaths([programme.programmeId]);
        
        if (allPaths.length === 0) {
            this.contextService.addError({
                type: 'HARD_ERROR',
                message: `No requirement paths found for programme: ${programme.metadata.name}`,
                programmeIds: [programme.programmeId]
            });
            return;
        }

        await this.processPathsByGroups(allPaths, programme);
    }

    /**
     * Process requirement paths grouped by type
     */
    private async processPathsByGroups(
        allPaths: any[], 
        programme: ProcessedProgramme
    ): Promise<void> {
        // Group paths by requirement type
        const pathsByGroup = new Map<RequirementGroupType, any[]>();
        
        for (const path of allPaths) {
            const groupType = path.group_type as RequirementGroupType;
            if (groupType && groupType !== 'unrestrictedElectives') {
                if (!pathsByGroup.has(groupType)) {
                    pathsByGroup.set(groupType, []);
                }
                pathsByGroup.get(groupType)!.push(path);
            }
        }

        // Process groups in specified order
        for (const groupType of PROCESSING_ORDER) {
            const groupPaths = pathsByGroup.get(groupType) || [];
            await this.processGroupPaths(groupType, groupPaths, programme);
        }
    }

    /**
     * Process paths for a specific requirement group
     */
    private async processGroupPaths(
        groupType: RequirementGroupType,
        paths: any[],
        programme: ProcessedProgramme
    ): Promise<void> {
        for (const pathData of paths) {
            await this.processPath(groupType, pathData, programme);
            this.contextService.incrementProcessedPaths();
        }
    }

    /**
     * Process a single requirement path
     */
    private async processPath(
        groupType: RequirementGroupType,
        pathData: any,
        programme: ProcessedProgramme
    ): Promise<void> {

        if (!pathData || !pathData.id) {
            console.warn(`Invalid pathData provided for ${groupType} in programme ${programme.metadata.name}:`, pathData);
            return;
        }

        // Map gmcs to actual module codes if this is a leaf path
        let mappedModules: ModuleCode[] = [];
        let gmcMappings: GMCMapping[] = [];

        if (pathData.is_leaf 
            && pathData.module_codes 
            && pathData.module_codes.length > 0
        ) {
            const result = await this.mapGmcsToModules(
                pathData.module_codes,
                pathData.module_types,
                programme.programmeId
            );
            mappedModules = result.mappedModules;
            gmcMappings = result.gmcMappings;

            this.contextService.incrementProcessedModules(mappedModules.length);
        }

        // Create processed path
        const processedPath: ProcessedPath = {
            pathId: pathData.id,
            pathKey: pathData.path_key,
            parentPathKey: pathData.parent_path_key,
            groupType,
            rawTagName: pathData.raw_tag_name,
            displayLabel: pathData.display_label,
            logicType: pathData.logic_type,
            ruleType: pathData.rule_type,
            ruleValue: pathData.rule_value,
            requiredUnits: pathData.required_units || pathData.rule_value || 0,
            depth: pathData.depth,
            isLeaf: pathData.is_leaf,
            isReadonly: pathData.is_readonly || false,
            isOverallSource: pathData.is_overall_source || false,
            exceptionModules: pathData.exception_modules || [],
            moduleCodes: mappedModules,
            gmcMappings
        };

        programme.processedPaths.push(processedPath);

        // Handle max rules
        if (pathData.rule_type === 'max') {
            const maxRule: InternalMaxRule = {
                maxRuleId: `${programme.programmeId}_${pathData.id}`,
                pathId: pathData.id,
                pathKey: pathData.path_key,
                displayLabel: pathData.display_label,
                maxUnits: pathData.rule_value || 0,
                parentGroupType: groupType,
                affectedModules: mappedModules
            };
            
            programme.maxRules.push(maxRule);
            this.contextService.addMaxRule(maxRule);
        }
    }

    /**
     * Map gmcs to actual module codes using database lookups
     */
    private async mapGmcsToModules(
        gmcCodes: string[],
        gmcTypes: string[],
        programmeId: string
    ): Promise<{ gmcMappings: GMCMapping[], mappedModules: ModuleCode[] }> {
        const gmcMappings: GMCMapping[] = [];
        const mappedModules: ModuleCode[] = [];

        // Handle exact gmcs: fetch from modules table
        const exactCodes = gmcCodes.filter((_, i) => gmcTypes[i] === 'exact');
        if (exactCodes.length > 0) {
            const validCodes = await this.dbQuery.validateModuleCodes(exactCodes);
            
            for (let i = 0; i < gmcCodes.length; i++) {
                if (gmcTypes[i] === 'exact' && validCodes.includes(gmcCodes[i])) {
                    gmcMappings.push({
                        gmcType: 'exact',
                        gmcCode: gmcCodes[i],
                        moduleCode: gmcCodes[i] as ModuleCode,
                        requiresApproval: false
                    });
                    mappedModules.push(gmcCodes[i] as ModuleCode);
                }
            }
        }

        // Handle non-exact gmcs: fetch from gmc_mapping table
        const nonExactCodes = gmcCodes.filter((_, i) => gmcTypes[i] !== 'exact');
        if (nonExactCodes.length > 0) {
            const nonExactMappings = await this.dbQuery.getGMCMappings([programmeId], nonExactCodes);

            for (const mapping of nonExactMappings) {
                gmcMappings.push({
                    gmcType: mapping.gmc_type as 'wildcard' | 'variant' | 'other',
                    gmcCode: mapping.gmc_code,
                    moduleCode: mapping.module_code as ModuleCode,
                    requiresApproval: mapping.gmc_type === 'other'
                });
                mappedModules.push(mapping.module_code as ModuleCode);
            }
        }

        return { gmcMappings, mappedModules };
    }

    /**
     * Build combination-specific lookup maps
     */
    private buildLookupMaps(programmes: ProcessedProgramme[]): LookupMaps {
        try {
            console.log('Building lookup maps...');

            // Build combination-specific module-to-paths mappings
            const { moduleToLeafPaths, leafPathToModules } = this.buildPathMappings(programmes);
            console.info('Built module-to-path mappings')

            // Build combination-specific max rule mappings
            const moduleToMaxRules = this.buildMaxRuleMappings(programmes);
            console.info('Built max rule mappings');

            // Analyze double-counting eligibility for this specific combination
            const doubleCountEligibility = this.analyzeDoubleCount(programmes, moduleToLeafPaths);
            console.info('Analyzed double-count eligibility');

            return {
                moduleToLeafPaths,
                leafPathToModules,
                moduleToMaxRules,
                doubleCountEligibility,
                pathHierarchy: {} // Will be filled later
            };
        } catch (error) {
            this.contextService.addError({
                type: 'HARD_ERROR',
                message: `Lookup maps building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            return {} as LookupMaps;
        }
    }

    /**
     * Build module-to-paths mappings specific to selected programmes
     */
    private buildPathMappings(programmes: ProcessedProgramme[]): {
        moduleToLeafPaths: Record<ModuleCode, LeafPathMapping[]>;
        leafPathToModules: Record<string, ModuleCode[]>;
    } {
        try {
            const moduleToLeafPaths: Record<ModuleCode, LeafPathMapping[]> = {};
            const leafPathToModules: Record<string, ModuleCode[]> = {};

            // Initialize empty arrays for all modules
            const allModules = new Set<ModuleCode>();
            for (const programme of programmes) {
                for (const path of programme.processedPaths) {
                    if (path.isLeaf) {
                        for (const moduleCode of path.moduleCodes) {
                            allModules.add(moduleCode as ModuleCode);
                        }
                    }
                }
            }

            for (const moduleCode of allModules) {
                moduleToLeafPaths[moduleCode] = [];
            }

            // Build mappings from leaf paths
            for (const programme of programmes) {
                for (const path of programme.processedPaths) {
                    if (path.isLeaf) {
                        const pathKey = `${programme.programmeId}:${path.pathKey}`;
                        
                        const leafMapping: LeafPathMapping = {
                            pathKey,
                            programmeId: programme.programmeId,
                            displayLabel: path.displayLabel,
                            groupType: path.groupType,
                            rawTagName: path.rawTagName,
                            requiredUnits: path.requiredUnits
                        };

                        const pathModules: ModuleCode[] = [];
                        for (const moduleCode of path.moduleCodes) {
                            const modCode = moduleCode as ModuleCode;
                            moduleToLeafPaths[modCode].push(leafMapping);
                            pathModules.push(modCode);
                        }

                        leafPathToModules[pathKey] = pathModules;
                    }
                }
            }

            return { moduleToLeafPaths, leafPathToModules };
        } catch (error) {
            console.error("Error building path mappings:", error);
            return { moduleToLeafPaths: {}, leafPathToModules: {} };
        }
    }

    /**
     * Build max rule mappings for combination-specific modules
     */
    private buildMaxRuleMappings(
        programmes: ProcessedProgramme[]
    ): Record<ModuleCode, string[]> {
        const moduleToMaxRules: Record<ModuleCode, string[]> = {};

        // Get all modules and initialize empty arrays
        const allModules = new Set<ModuleCode>();
        for (const programme of programmes) {
            for (const path of programme.processedPaths) {
                for (const moduleCode of path.moduleCodes) {
                    allModules.add(moduleCode as ModuleCode);
                }
            }
        }

        for (const moduleCode of allModules) {
            moduleToMaxRules[moduleCode] = [];
        }

        // Map max rules to affected modules
        for (const programme of programmes) {
            for (const maxRule of programme.maxRules) {
                for (const moduleCode of maxRule.affectedModules) {
                    moduleToMaxRules[moduleCode].push(maxRule.maxRuleId);
                }
            }
        }

        return moduleToMaxRules;
    }

    /**
     * Analyze double-counting eligibility specific to this programme combination
     */
    private analyzeDoubleCount(
        programmes: ProcessedProgramme[],
        moduleToLeafPaths: Record<ModuleCode, LeafPathMapping[]>
    ): Record<ModuleCode, DoubleCountInfo> {
        const doubleCountEligibility: Record<ModuleCode, DoubleCountInfo> = {};

        for (const [moduleCode, leafPaths] of Object.entries(moduleToLeafPaths)) {
            // Group paths by programme to determine which programmes this module can fulfill
            const pathsByProgramme = new Map<string, LeafPathMapping[]>();
            
            for (const path of leafPaths) {
                if (!pathsByProgramme.has(path.programmeId)) {
                    pathsByProgramme.set(path.programmeId, []);
                }
                pathsByProgramme.get(path.programmeId)!.push(path);
            }

            // Cross-programme eligible -> module appears in requirements from 2+ different programmes
            const crossProgrammeEligible = pathsByProgramme.size >= 2;
            
            // Cross-programme paths include all paths when module spans multiple programmes
            const crossProgrammePaths: LeafPathMapping[] = crossProgrammeEligible ? leafPaths : [];

            // Analyze intra-programme opportunities (commonCore + others within same programme)
            const intraProgrammeOpportunities: LeafPathMapping[] = [];
            
            for (const [programmeId, paths] of pathsByProgramme) {
                if (paths.length >= 2) {
                    // Check if there's at least one commonCore and one non-commonCore requirement
                    const hasCommonCore = paths.some(p => p.groupType === 'commonCore');
                    const hasOtherGroup = paths.some(p => p.groupType !== 'commonCore');
                    
                    if (hasCommonCore && hasOtherGroup) {
                        intraProgrammeOpportunities.push(...paths);
                    }
                }
            }

            const intraProgrammeEligible = intraProgrammeOpportunities.length >= 2;

            // Calculate maximum possible double-count without considering restrictions
            let maxPossibleDoubleCount = 0;
            if (crossProgrammeEligible) maxPossibleDoubleCount += 1;
            if (intraProgrammeEligible) maxPossibleDoubleCount += 1;

            // Get all programme IDs that this module can fulfill requirements for
            const eligibleProgrammes = Array.from(pathsByProgramme.keys());
            const allEligiblePaths = (crossProgrammeEligible || intraProgrammeEligible) ? leafPaths : [];

            doubleCountEligibility[moduleCode as ModuleCode] = {
                crossProgrammeEligible,
                crossProgrammePaths,
                intraProgrammeEligible,
                intraProgrammePaths: intraProgrammeOpportunities,
                allEligiblePaths,
                maxPossibleDoubleCount,
                eligibleProgrammes
            };
        }

        return doubleCountEligibility;
    }

    /**
     * Builds individual programme payloads
     */
    private async buildProgrammePayload(
        programme: ProcessedProgramme,
        sharedLookupMaps: LookupMaps
    ): Promise<ProgrammePayload> {
        try {
            console.log(`Building payload for programme: ${programme.metadata.name}`);

            const pathsBySection = this.groupPathsBySection(programme.processedPaths);
            const sections = [] as ProgrammeSection[];

            // Build sections in processing order
            for (const groupType of PROCESSING_ORDER) {
                const sectionPaths = pathsBySection.get(groupType) || [];
                if (sectionPaths.length > 0) {
                    const section = await this.buildSection(groupType, sectionPaths, programme);
                    if (section.courseBoxes.length > 0) sections.push(section); // Only add main sections with boxes
                }
            }

            // Merge into path hierarchy
            if (!sharedLookupMaps.pathHierarchy) {
                sharedLookupMaps.pathHierarchy = {};
            }

            const childrenMap: Record<string, string[]> = {};
            for (const [parentKey, childIds] of programme.childrenMap.entries()) {
                childrenMap[parentKey] = childIds;
            }

            sharedLookupMaps.pathHierarchy[programme.programmeId] = childrenMap;

            return {
                programmeId: programme.programmeId,
                metadata: programme.metadata,
                sections,
                preselectedModules: programme.preselectedModules
            };
        } catch (error) {
            this.contextService.addError({
                type: 'HARD_ERROR',
                message: `Individual programme payload building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            return {} as ProgrammePayload;
        }
    }

    /**
     * Builds a programme section for UI rendering based on depth and tree structure
     */
    private async buildSection(
        groupType: RequirementGroupType,
        sectionPaths: ProcessedPath[],
        programme: ProcessedProgramme
    ): Promise<ProgrammeSection> {
        if (!sectionPaths || sectionPaths.length === 0) {
            console.warn(`No paths found for section ${groupType} in programme ${programme.programmeId}`);
            return {
                groupType,
                displayLabel: `${groupType} (Empty)`,
                paths: [],
                courseBoxes: [],
                hidden: []
            };
        }        

        // Build path infos for all paths (for FE tracking)
        const pathInfos = sectionPaths.map(path => ({
            pathId: path.pathId,
            pathKey: path.pathKey,
            parentPathKey: path.parentPathKey,
            displayLabel: path.displayLabel,
            logicType: path.logicType,
            ruleType: path.ruleType,
            ruleValue: path.ruleValue,
            requiredUnits: path.requiredUnits,
            depth: path.depth,
            groupType: path.groupType,
            rawTagName: path.rawTagName,
            exceptionModules: path.exceptionModules
        }));

        // Separate paths into regular and hidden based on is_overall_source
        const regularPaths = sectionPaths.filter(path => !path.isOverallSource);
        const hiddenPaths = sectionPaths.filter(path => path.isOverallSource);
        const courseBoxes = await this.buildCourseBoxes(regularPaths, programme, groupType);
        const hiddenBoxes = await this.buildHiddenCourseBoxes(hiddenPaths, programme, groupType);
        
        return {
            groupType,
            displayLabel: pathInfos[0].displayLabel,
            paths: pathInfos,
            courseBoxes,
            hidden: hiddenBoxes
        };
    }

    /**
     * Build course boxes for regular paths (displayed in UI)
     */
    private async buildCourseBoxes(
        paths: ProcessedPath[], 
        programme: ProcessedProgramme, 
        groupType: RequirementGroupType
    ): Promise<any[]> {
        const courseBoxes = [] as CourseBox[];

        if (!paths || paths.length === 0) {
            return courseBoxes;
        }

        // Build path hierarchy (easier traversal)
        const pathMap = new Map<string, ProcessedPath>();
        const childrenMap = new Map<string, ProcessedPath[]>();
        
        for (const path of paths) {
            pathMap.set(path.pathId, path);
            
            if (path.parentPathKey) {
                if (!childrenMap.has(path.parentPathKey)) {
                    childrenMap.set(path.parentPathKey, []);
                }
                childrenMap.get(path.parentPathKey)!.push(path);

                if (!programme.childrenMap.has(path.parentPathKey)) {
                    programme.childrenMap.set(path.parentPathKey, []);
                }
                programme.childrenMap.get(path.parentPathKey)!.push(path.pathId);
            }
        }

        // Render all preselected modules (coreEssentials) as ExactBoxes
        if (groupType === 'coreEssentials') {
            for (const moduleCode of programme.preselectedModules) {
                const isPrereq = programme.prerequisiteModules.includes(moduleCode as ModuleCode);
                courseBoxes.push({
                    kind: 'exact',
                    boxKey: isPrereq ? `prereq-${moduleCode}` : `${paths[0].pathKey}-${moduleCode}`,
                    pathId: isPrereq ? `prereq-${moduleCode}` : paths[0].pathId,
                    programmeId: programme.programmeId,
                    moduleCode: moduleCode as ModuleCode,
                    isPreselected: true
                });
            }
        }

        // Find main sections (depth = 0) and ignore coreEssentials
        const mainSections = paths.filter(path => path.depth === 0 && path.groupType !== 'coreEssentials');

        // Process each main section's children (depth = 1)
        for (const mainSection of mainSections) {
            const children = childrenMap.get(mainSection.pathKey) || [];
            
            for (const child of children) {
                if (child.depth === 1) {
                    const childBoxes = await this.buildBoxesForPath(child, pathMap, childrenMap, programme);
                    courseBoxes.push(...childBoxes);
                }
            }
        }

        return courseBoxes;
    }

    /**
     * Build course boxes for hidden paths (not displayed in UI by default)
     */
    private async buildHiddenCourseBoxes(
        paths: ProcessedPath[], 
        programme: ProcessedProgramme,
        groupType: RequirementGroupType
    ): Promise<any[]> {
        const courseBoxes = [] as CourseBox[];

        // Handle empty paths array
        if (!paths || paths.length === 0) {
            return courseBoxes;
        }

        // Build path hierarchy (easier traversal)
        const pathMap = new Map<string, ProcessedPath>();
        const childrenMap = new Map<string, ProcessedPath[]>();
        
        for (const path of paths) {
            pathMap.set(path.pathId, path);
            
            if (path.parentPathKey) {
                if (!childrenMap.has(path.parentPathKey)) {
                    childrenMap.set(path.parentPathKey, []);
                }
                childrenMap.get(path.parentPathKey)!.push(path);

                if (!programme.childrenMap.has(path.parentPathKey)) {
                    programme.childrenMap.set(path.parentPathKey, []);
                }
                programme.childrenMap.get(path.parentPathKey)!.push(path.pathId);

                const childBoxes = await this.buildBoxesForPath(path, pathMap, childrenMap, programme);
                courseBoxes.push(...childBoxes);
            }
        }

        return courseBoxes;
    }

    /**
     * Build course boxes for a specific path based on its logic type
     * - LEAF -> DropdownBox (Excluding exception_modules)
     * - AND -> recursive children processing
     * - OR -> AltPathBox
     */
    private async buildBoxesForPath(
        path: ProcessedPath,
        pathMap: Map<string, ProcessedPath>,
        childrenMap: Map<string, ProcessedPath[]>,
        programme: ProcessedProgramme
    ): Promise<CourseBox[]> {
        const boxes = [] as CourseBox[];
        switch (path.logicType) {
            case 'LEAF':
                let moduleOptions = path.moduleCodes as ModuleCode[];
                if (path.exceptionModules && path.exceptionModules.length > 0) {
                    const exceptionsSet = new Set(path.exceptionModules as ModuleCode[]);
                    moduleOptions = moduleOptions.filter(module => !exceptionsSet.has(module));
                }
                boxes.push({
                    kind: 'dropdown',
                    boxKey: `${path.pathKey}-dropdown`,
                    pathId: path.pathId,
                    programmeId: programme.programmeId,
                    moduleOptions: path.moduleCodes as ModuleCode[],
                });
                break;

            case 'AND':
                {
                    const andChildren = await this.processAndLogic(
                        path, pathMap, childrenMap, programme
                    );
                    boxes.push(...andChildren);
                }
                break;

            case 'OR':
                {
                    const orChildren = childrenMap.get(path.pathKey) || [];
                    const alternativePathIds = orChildren.map(child => child.pathId);

                    boxes.push({
                        kind: 'altPath',
                        boxKey: `${path.pathKey}-altpath`,
                        pathId: path.pathId,
                        programmeId: programme.programmeId,
                        pathAlternatives: alternativePathIds
                    });
                }
                break;
                
        }
        return boxes;
    }

    /**
     * Process AND logic recursively
     */
    private async processAndLogic(
        andPath: ProcessedPath,
        pathMap: Map<string, ProcessedPath>,
        childrenMap: Map<string, ProcessedPath[]>,
        programme: ProcessedProgramme
    ): Promise<CourseBox[]> {
        const boxes: CourseBox[] = [];
        const children = childrenMap.get(andPath.pathKey) || [];
        
        for (const child of children) {
            if (child.logicType === 'LEAF') {
                let moduleOptions = child.moduleCodes as ModuleCode[];
                if (child.exceptionModules && child.exceptionModules.length > 0) {
                    const exceptionsSet = new Set(child.exceptionModules as ModuleCode[]);
                    moduleOptions = moduleOptions.filter(module => !exceptionsSet.has(module));
                }

                boxes.push({
                    kind: 'dropdown',
                    boxKey: `${child.pathKey}-dropdown`,
                    pathId: child.pathId,
                    programmeId: programme.programmeId,
                    moduleOptions: child.moduleCodes as ModuleCode[],
                });
                
            } else if (child.logicType === 'OR') {
                const orGrandchildren = childrenMap.get(child.pathKey) || [];
                const alternativePathIds = orGrandchildren.map(grandchild => grandchild.pathId);
                
                boxes.push({
                    kind: 'altPath',
                    boxKey: `${child.pathKey}-altpath`,
                    pathId: child.pathId,
                    programmeId: programme.programmeId,
                    pathAlternatives: alternativePathIds
                });
                
            } else if (child.logicType === 'AND') {
                const nestedAndBoxes = await this.processAndLogic(
                    child, pathMap, childrenMap, programme
                );
                boxes.push(...nestedAndBoxes);
            }
        }
        
        return boxes;
    }

    /**
     * Validation result for both vbeValidator and bePopulator
     */
    getValidationResult(): {
        isValid: boolean;
        errors: any[];
        summary: any;
        contextStats: any;
        fullContext: ProcessingContext;
    } {
        return {
            isValid: !this.contextService.hasErrors(),
            errors: this.contextService.getErrors(),
            summary: this.contextService.getSummary(),
            contextStats: this.contextService.getContext().stats,
            fullContext: this.contextService.getContext()
        };
    }

    // Helper
    private groupPathsBySection(paths: ProcessedPath[]): Map<RequirementGroupType, ProcessedPath[]> {
        const grouped = new Map<RequirementGroupType, ProcessedPath[]>();
        
        for (const path of paths) {
            if (!grouped.has(path.groupType)) {
                grouped.set(path.groupType, []);
            }
            grouped.get(path.groupType)!.push(path);
        }
        
        return grouped;
    }
}
