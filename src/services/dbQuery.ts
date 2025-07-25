import supabasePublic from "../config/supabasePublic";
import type { ModuleCode } from "../types/nusmods-types";
import type { 
    ModuleData, 
    ProgrammeData, 
    RequirementPathData,
    GMCMappingData,
    ProgrammePreclusionData,
    PrerequisiteRule,
    PreclusionData,
    PrerequisiteData
} from "../types/backend-types";

/**
 * DatabaseQueryService class to handle database queries related to modules.
 * It provides methods to fetch prerequisites, preclusions, module, paths and programmes data from Supabase.
 */
export class DatabaseQueryService {
    
    // PROGRAMME DATA QUERIES

    /**
     * Get programme metadata by IDs
     */
    async getProgrammes(programmeIds: string[]): Promise<ProgrammeData[]> {
        try {
            const { data, error } = await supabasePublic
                .from('programmes')
                .select('id, name, type, required_units, double_count_cap')
                .in('id', programmeIds);
                
            if (error) {
                console.error('Error fetching programmes:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to query programmes:', error);
            return [];
        }
    }

    /**
     * Check programme combination validity
     */
    async getProgrammePreclusions(programmeIds: string[]): Promise<ProgrammePreclusionData[]> {
        if (programmeIds.length < 2) return [];
        
        try {
            const { data, error } = await supabasePublic
                .from('programme_preclusions')
                .select('programme_id, precluded_programme_id')
                .in('programme_id', programmeIds)
                .in('precluded_programme_id', programmeIds);
                
            if (error) {
                console.error('Error checking programme compatibility:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to check programme compatibility:', error);
            return [];
        }
    }

    // REQUIREMENT PATH QUERIES

    /**
     * Get all requirement paths for programmes
     */
    async getRequirementPaths(programmeIds: string[]): Promise<RequirementPathData[]> {
        try {
            const { data, error } = await supabasePublic
                .from('programme_requirement_paths')
                .select(`
                    id, programme_id, path_key, parent_path_key, 
                    display_label, logic_type, rule_type, rule_value, 
                    required_units, depth, is_leaf, is_readonly, 
                    group_type, raw_tag_name, module_codes, module_types,
                    is_overall_source, exception_modules
                `)
                .in('programme_id', programmeIds)
                .order('depth', { ascending: true });
                
            if (error) {
                console.error('Error fetching requirement paths:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to query requirement paths:', error);
            return [];
        }
    }

    // MODULE DATA QUERIES

    /**
     * Batch fetch module details
     */
    async getModulesDetails(moduleCodes: ModuleCode[]): Promise<ModuleData[]> {
        if (moduleCodes.length === 0) return [];
        
        try {
            const { data, error } = await supabasePublic
                .from('modules')
                .select(`
                    module_code, title, module_credit, description, 
                    department, faculty, aliases, 
                    prerequisite, preclusion, semester_data
                `)
                .in('module_code', moduleCodes);
                
            if (error) {
                console.error('Error batch fetching module details:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to batch fetch module details:', error);
            return [];
        }
    }

    /**
     * Get module prerequisites using RPC function
     */
    async getModulePrerequisites(moduleCode: ModuleCode): Promise<PrerequisiteRule[]> {
        try {
            const { data, error } = await supabasePublic.rpc('get_module_prerequisites', {
                p_module_code: moduleCode
            });
            
            if (error) {
                console.error(`Error fetching prerequisites for ${moduleCode}:`, error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error(`Failed to query prerequisites for ${moduleCode}:`, error);
            return [];
        }
    }

    /**
     * Get module preclusions using RPC function
     */
    async getModulePreclusions(moduleCode: ModuleCode): Promise<ModuleCode[]> {
        try {
            const { data, error } = await supabasePublic.rpc('get_module_preclusions', {
                p_module_code: moduleCode
            });
            
            if (error) {
                console.error(`Error fetching preclusions for ${moduleCode}:`, error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error(`Failed to query preclusions for ${moduleCode}:`, error);
            return [];
        }
    }

    /**
     * Batch fetch preclusion data for multiple modules
     */
    async getBatchPreclusions(moduleCodes: ModuleCode[]): Promise<PreclusionData[]> {
        if (moduleCodes.length === 0) return [];
        
        try {
            const { data, error } = await supabasePublic
                .from('preclusion_rules')
                .select('module_code, precluded_modules')
                .in('module_code', moduleCodes);
                
            if (error) {
                console.error('Error fetching batch preclusions:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to query batch preclusions:', error);
            return [];
        }
    }

    /**
     * Batch fetch "simple" prerequisite data for multiple modules
     */
    async getBatchSimplePrerequisites(moduleCodes: ModuleCode[]): Promise<PrerequisiteData[]> {
        if (moduleCodes.length === 0) return [];

        try {
            const { data, error } = await supabasePublic
                .from('prerequisite_rules')
                .select('module_code, required_modules')
                .eq('rule_type', 'simple')
                .in('module_code', moduleCodes);

            if (error) {
                console.error('Error fetching batch simple prerequisites:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Failed to query batch simple prerequisites:', error);
            return [];
        }
    }

    // GMC MAPPING QUERIES

    /**
     * Get GMC mappings for programmes
     */
    async getGMCMappings(programmeIds: string[], gmcCodes?: string[]): Promise<GMCMappingData[]> {
        try {
            let query = supabasePublic
                .from('gmc_mappings')
                .select('gmc_code, gmc_type, module_code, programme_id')
                .in('programme_id', programmeIds);
                
            if (gmcCodes && gmcCodes.length > 0) {
                query = query.in('gmc_code', gmcCodes);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('Error fetching GMC mappings:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Failed to query GMC mappings:', error);
            return [];
        }
    }

    /**
     * Check if modules exist (for exact GMC validation)
     */
    async validateModuleCodes(moduleCodes: string[]): Promise<string[]> {
        if (moduleCodes.length === 0) return [];
        
        try {
            const { data, error } = await supabasePublic
                .from('modules')
                .select('module_code')
                .in('module_code', moduleCodes);
                
            if (error) {
                console.error('Error validating module codes:', error);
                return [];
            }
            
            return data?.map(m => m.module_code) || [];
        } catch (error) {
            console.error('Failed to validate module codes:', error);
            return [];
        }
    }

    // UTILITY QUERIES

    /**
     * Get total programme requirements (excluding UE)
     */
    async calculateProgrammeRequirements(programmeIds: string[]): Promise<Record<string, number>> {
        if (programmeIds.length === 0) return {};
        
        try {
            const { data, error } = await supabasePublic
                .from('programme_requirement_paths')
                .select('programme_id, required_units')
                .in('programme_id', programmeIds)
                .eq('is_leaf', false)
                .not('group_type', 'eq', 'unrestrictedElectives');
                
            if (error) {
                console.error('Error calculating programme requirements:', error);
                return {};
            }
            
            const requirements: Record<string, number> = {};
            programmeIds.forEach(id => requirements[id] = 0);
            
            if (data) {
                for (const path of data) {
                    requirements[path.programme_id] += path.required_units || 0;
                }
            }
            
            return requirements;
        } catch (error) {
            console.error('Failed to calculate programme requirements:', error);
            return {};
        }
    }
}