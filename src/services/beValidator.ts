import { DatabaseQueryService } from "./dbQuery";
import { ProcessingContextService } from "./processingContext";
import type { ModuleCode } from "../types/nusmods-types";
import type { 
    ProcessedProgramme, 
    ValidationError
} from "../types/backend-types";

/**
 * Backend Validator focused on programme validation and hard conflict detection.
 * 1. Validate programme combinations
 * 2. Builds basic programme metadata 
 * 3. Extracts preselected modules from coreEssentials
 * 4. Resolves simple prerequisites for preselected modules
 * 5. Checks for hard conflicts (including prerequisites)
 */
export class BackendValidator {
    private dbQuery: DatabaseQueryService;
    private context: ProcessingContextService;

    constructor() {
        this.dbQuery = new DatabaseQueryService();
        this.context = new ProcessingContextService();
    }

    /**
     * Main validation entry point
     */
    async validateProgrammes(programmeIds: string[]): Promise<ProcessingContextService> {
        try {
            // Step 1: Validate programme combinations
            await this.validateProgrammeCombinations(programmeIds);
            if (this.context.hasErrors()) return this.context;

            // Step 2: Build programme metadata and extract preselected modules
            for (const programmeId of programmeIds) {
                await this.processProgramme(programmeId);
                if (this.context.hasErrors()) return this.context;
            }

            // Step 3: Check for hard conflicts between preselected modules
            await this.validatePreselectedConflicts();

        } catch (error) {
            this.context.addError({
                type: 'HARD_ERROR',
                message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                programmeIds
            });
        }

        return this.context;
    }

    /**
     * Validates programme combinations to prevent invalid combinations
     */
    private async validateProgrammeCombinations(programmeIds: string[]): Promise<void> {
        // Check if programmes exist
        const programmes = await this.dbQuery.getProgrammes(programmeIds);
        const foundIds = programmes.map(p => p.id);
        const missingIds = programmeIds.filter(id => !foundIds.includes(id));
        
        if (missingIds.length > 0) {
            this.context.addError({
                type: 'HARD_ERROR',
                message: `Programmes not found: ${missingIds.join(', ')}`,
                programmeIds: missingIds
            });
            return;
        }

        // Check if more than one major is present
        const majorProgrammes = programmes.filter(p => p.type === 'major');
        if (majorProgrammes.length > 1) {
            this.context.addError({
                type: 'INVALID_PROGRAMME_COMBINATION',
                message: `Only one major programme can be selected. Found: ${majorProgrammes.map(p => p.id).join(', ')}`,
                programmeIds: majorProgrammes.map(p => p.id)
            });
            return;
        }

        // Check programme combination preclusions
        const preclusions = await this.dbQuery.getProgrammePreclusions(programmeIds);
        
        for (const preclusion of preclusions) {
            // Find programme names for better error messages
            const programmeA = programmes.find(p => p.id === preclusion.programme_id);
            const programmeB = programmes.find(p => p.id === preclusion.precluded_programme_id);

            this.context.addError({
            type: 'INVALID_PROGRAMME_COMBINATION',
            message: `${programmeA?.name ?? preclusion.programme_id} (${programmeA?.type ?? 'unknown'}) 
                        and ${programmeB?.name ?? preclusion.precluded_programme_id} (${programmeB?.type ?? 'unknown'}) 
                        cannot be taken together`,
            programmeIds: [preclusion.programme_id, preclusion.precluded_programme_id]
            });
        }
    }

    /**
     * Build programme metadata and extract preselected modules from coreEssentials
     */
    private async processProgramme(programmeId: string): Promise<void> {
        // Get programme metadata
        const programmes = await this.dbQuery.getProgrammes([programmeId]);
        const programme = programmes[0];
        
        if (!programme) {
            this.context.addError({
                type: 'HARD_ERROR',
                message: `Programme not found: ${programmeId}`,
                programmeIds: [programmeId]
            });
            return;
        }

        

        // Initialize basic programme structure (metadata only)
        const processedProgramme: ProcessedProgramme = {
            programmeId,
            metadata: {
                name: programme.name,
                type: programme.type as 'major' | 'secondMajor' | 'minor',
                requiredUnits: programme.required_units,
                doubleCountCap: programme.double_count_cap
            },
            processedPaths: [], // Filled by populator
            maxRules: [], // Filled by populator
            preselectedModules: [],
            prerequisiteModules: [],
            childrenMap: new Map<string, string[]>() // Filled by populator
        };

        // Extract preselected modules from coreEssentials (readonly paths)
        await this.extractPreselectedModules(programmeId, processedProgramme);

        // Add to context
        this.context.addProgramme(processedProgramme);
    }

    /**
     * Extract preselected modules from coreEssentials (readonly paths)
     */
    private async extractPreselectedModules(programmeId: string, processedProgramme: ProcessedProgramme): Promise<void> {
        // Get all readonly paths (coreEssentials) for this programme
        const readonlyPaths = await this.dbQuery.getRequirementPaths([programmeId]);
        const coreEssentialPaths = readonlyPaths.filter(path => 
            path.is_readonly && 
            path.is_leaf && 
            path.group_type === 'coreEssentials'
        );

        const directPreselectedModules = new Set<ModuleCode>();

        // Extract direct preselected modules from coreEssentials
        for (const path of coreEssentialPaths) {
            // Only extract exact module codes (non-GMC codes are handled by populator)
            if (path.module_codes) {
                for (let i = 0; i < path.module_codes.length; i++) {
                    const moduleCode = path.module_codes[i];
                    const moduleType = path.module_types?.[i] || 'exact';
                    
                    if (moduleType === 'exact') {
                        directPreselectedModules.add(moduleCode as ModuleCode);
                    }
                }
            }
        }

        // Resolve simple prerequisites for preselected modules recursively
        const allPreselectedModules = new Set<ModuleCode>(directPreselectedModules);
        const prerequisiteModules = await this.resolveSimplePrereq(
            Array.from(directPreselectedModules)
        );

        // Add prerequisites to the set of all preselected modules
        for (const prereq of prerequisiteModules) {
            allPreselectedModules.add(prereq);
        }

        // Store in programme
        processedProgramme.preselectedModules = Array.from(allPreselectedModules);
        processedProgramme.prerequisiteModules = prerequisiteModules;

        // Store in context for conflict checking
        for (const moduleCode of allPreselectedModules) {
            this.context.addPreselectedModule(moduleCode, programmeId);
        }
    }

    /**
     * Resolve simple prerequisites recursively using batch fetching for optimal performance
     */
    private async resolveSimplePrereq(
        moduleCodes: ModuleCode[]
    ): Promise<ModuleCode[]> {
        if (moduleCodes.length === 0) return [];

        const prerequisites = new Set<ModuleCode>();
        const visited = new Set<ModuleCode>();
        const toProcess = new Set<ModuleCode>(moduleCodes);

        // Build prerequisite map by fetching all prerequisites in batches
        const prereqMap = new Map<ModuleCode, ModuleCode[]>();
        
        while (toProcess.size > 0) {
            const currentBatch = Array.from(toProcess);
            toProcess.clear();

            try {
                // Batch fetch simple prerequisites for current modules
                const prereqData = await this.dbQuery.getBatchSimplePrerequisites(currentBatch);
                
                // Build prerequisite map from batch results
                for (const data of prereqData) {
                    const moduleCode = data.module_code as ModuleCode;
                    const requiredModules = (
                        data.required_modules || []
                    ).map(m => m as ModuleCode);
                    prereqMap.set(moduleCode, requiredModules);
                }

                // Process each module in current batch
                for (const moduleCode of currentBatch) {
                    if (visited.has(moduleCode)) continue;
                    visited.add(moduleCode);

                    const modulePrereqs = prereqMap.get(moduleCode) || [];
                    
                    for (const prereqModule of modulePrereqs) {
                        prerequisites.add(prereqModule);
                        
                        // Add to next batch if not already visited
                        if (!visited.has(prereqModule)) {
                            toProcess.add(prereqModule);
                        }
                    }
                }

            } catch (error) {
                console.error(`Error resolving prerequisites for batch ${currentBatch.join(', ')}:`, error);
                
                this.context.addError({
                    type: 'SOFT_ERROR',
                    message: 
                        `Failed to resolve prerequisites for modules: 
                        ${currentBatch.join(', ')} - ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                break; // Avoid infinite loops
            }
        }

        return Array.from(prerequisites);
    }

    /**
     * Check for hard conflicts between preselected modules across programmes
     */
    private async validatePreselectedConflicts(): Promise<void> {
        const preselectedModules = Array.from(this.context.getPreselectedModules().keys());
        
        if (preselectedModules.length === 0) return;

        // Get preclusion data for all preselected modules
        const preclusions = await this.dbQuery.getBatchPreclusions(preselectedModules);
        
        // Build preclusion map for efficient lookup
        const preclusionMap = new Map<string, string[]>();
        for (const preclusion of preclusions) {
            preclusionMap.set(preclusion.module_code, preclusion.precluded_modules);
        }

        // Context service method to check conflicts
        const conflicts = this.context.checkPreselectedConflicts(preclusionMap);
        
        // Add conflicts to context errors
        for (const conflict of conflicts) {
            this.context.addError(conflict);
        }
    }

    /**
     * Get processing context service for populator
     */
    getContextService(): ProcessingContextService {
        return this.context;
    }

    /**
     * Check if validation was successful
     */
    isValid(): boolean {
        return !this.context.hasErrors();
    }

    /**
     * Get validation errors
     */
    getErrors(): ValidationError[] {
        return this.context.getErrors();
    }
}
