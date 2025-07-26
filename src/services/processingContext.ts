import type { ModuleCode } from "../types/nusmods-types";
import type { 
    ProcessingContext, 
    ProcessedProgramme, 
    InternalMaxRule, 
    ValidationError 
} from "../types/backend-types";

/**
 * ProcessingContextService class for managing validation state across programmes.
 */
export class ProcessingContextService {
    private context: ProcessingContext;

    constructor() {
        this.context = {
            programmes: new Map(),
            preselectedModules: new Map(),
            maxRules: [],
            errors: [],
            stats: {
                processedPaths: 0,
                processedModules: 0,
                startTime: Date.now()
            }
        };
    }

    // PROGRAMME MANAGEMENT

    addProgramme(programme: ProcessedProgramme): void {
        this.context.programmes.set(programme.programmeId, programme);
    }

    getProgramme(programmeId: string): ProcessedProgramme | undefined {
        return this.context.programmes.get(programmeId);
    }

    getAllProgrammes(): ProcessedProgramme[] {
        return Array.from(this.context.programmes.values());
    }

    getProgrammeIds(): string[] {
        return Array.from(this.context.programmes.keys());
    }

    // PRESELECTED MODULE MANAGEMENT

    /**
     * Add a preselected module from a specific programme
     */
    addPreselectedModule(moduleCode: ModuleCode, programmeId: string): void {
        if (!this.context.preselectedModules.has(moduleCode)) {
            this.context.preselectedModules.set(moduleCode, []);
        }
        
        const programmes = this.context.preselectedModules.get(moduleCode)!;
        if (!programmes.includes(programmeId)) {
            programmes.push(programmeId);
        }
    }

    /**
     * Get all preselected modules with their associated programmes
     */
    getPreselectedModules(): Map<ModuleCode, string[]> {
        return new Map(this.context.preselectedModules);
    }

    /**
     * Check if a module is preselected
     */
    isModulePreselected(moduleCode: ModuleCode): boolean {
        return this.context.preselectedModules.has(moduleCode);
    }

    /**
     * Get programmes that have preselected a specific module
     */
    getProgrammesForModule(moduleCode: ModuleCode): string[] {
        return this.context.preselectedModules.get(moduleCode) || [];
    }

    // MAX RULE MANAGEMENT

    addMaxRule(maxRule: InternalMaxRule): void {
        this.context.maxRules.push(maxRule);
    }

    /**
     * Get all max rules
     */
    getMaxRules(): InternalMaxRule[] {
        return [...this.context.maxRules];
    }

    /**
     * Get max rules that affect a specific module
     */
    getMaxRulesForModule(moduleCode: ModuleCode): InternalMaxRule[] {
        return this.context.maxRules.filter(rule => 
            rule.affectedModules.includes(moduleCode)
        );
    }

    // ERROR MANAGEMENT

    addError(error: ValidationError): void {
        this.context.errors.push(error);
    }

    /**
     * Get all errors
     */
    getErrors(): ValidationError[] {
        return [...this.context.errors];
    }

    hasErrors(): boolean {
        return this.context.errors.length > 0;
    }

    /**
     * Clear all errors
     */
    clearErrors(): void {
        this.context.errors = [];
    }

    /**
     * Check for preclusion conflicts between preselected modules
     */
    checkPreselectedConflicts(preclusionMap: Map<string, string[]>): ValidationError[] {
        const conflicts: ValidationError[] = [];
        
        for (const [moduleCode, programmes] of this.context.preselectedModules) {
            let precludedModules = preclusionMap.get(moduleCode) || [];
            // Fallback: filter out the module itself from its own preclusion list
            precludedModules = precludedModules.filter(m => m !== moduleCode);
            
            for (const precludedModule of precludedModules) {
                if (this.context.preselectedModules.has(precludedModule as ModuleCode)) {
                    const conflictingProgrammes = this.context.preselectedModules.get(precludedModule as ModuleCode) || [];
                    
                    conflicts.push({
                        type: 'INVALID_PROGRAMME_COMBINATION',
                        message: `${moduleCode} and ${precludedModule} are precluded but both required`,
                        moduleCode: moduleCode,
                        programmeIds: [...programmes, ...conflictingProgrammes]
                    });
                }
            }
        }
        
        return conflicts;
    }

    // STATISTICS AND METRICS

    incrementProcessedPaths(): void {
        this.context.stats.processedPaths++;
    }

    incrementProcessedModules(count: number = 1): void {
        this.context.stats.processedModules += count;
    }

    getProcessingStats(): {
        processedPaths: number;
        processedModules: number;
        totalProgrammes: number;
        totalPreselected: number;
        totalMaxRules: number;
        totalErrors: number;
        processingTimeMs: number;
    } {
        return {
            processedPaths: this.context.stats.processedPaths,
            processedModules: this.context.stats.processedModules,
            totalProgrammes: this.context.programmes.size,
            totalPreselected: this.context.preselectedModules.size,
            totalMaxRules: this.context.maxRules.length,
            totalErrors: this.context.errors.length,
            processingTimeMs: Date.now() - this.context.stats.startTime
        };
    }

    // UTILITY METHODS

    /**
     * Get the raw processing context
     */
    getContext(): ProcessingContext {
        return this.context;
    }

    /**
     * Reset the processing context
     */
    reset(): void {
        this.context = {
            programmes: new Map(),
            preselectedModules: new Map(),
            maxRules: [],
            errors: [],
            stats: {
                processedPaths: 0,
                processedModules: 0,
                startTime: Date.now()
            }
        };
    }

    /**
     * Get summary of processing context (for debugging)
     */
    getSummary(): {
        programmes: Array<{ id: string; name: string; type: string }>;
        preselectedCount: number;
        maxRulesCount: number;
        errorsCount: number;
        isValid: boolean;
    } {
        const programmes = Array.from(this.context.programmes.values()).map(p => ({
            id: p.programmeId,
            name: p.metadata.name,
            type: p.metadata.type
        }));

        return {
            programmes,
            preselectedCount: this.context.preselectedModules.size,
            maxRulesCount: this.context.maxRules.length,
            errorsCount: this.context.errors.length,
            isValid: this.context.errors.length === 0
        };
    }
}