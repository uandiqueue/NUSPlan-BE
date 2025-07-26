import supabaseAdmin from '../src/config/supabaseAdmin';

const FETCH_PAGE_SIZE = 1000; // Number of modules to fetch per page from Supabase

/**
 * Fetches all modules with the specified rule type from the database.
 * This function handles pagination to ensure all modules are retrieved.
 */
export async function fetchAllModulesForRules(
    ruleType: 'preclusion_rule' | 'prereq_tree'
): Promise<Array<{module_code: string, rule: any}>> {
    const allModules: Array<{module_code: string, rule: any}> = [];
    let start = 0;
    let hasMore = true;

    console.log('Fetching all modules...');

    while (hasMore) {
        const end = start + FETCH_PAGE_SIZE - 1;
        
        console.log(`Fetching modules ${start + 1} to ${end + 1}...`);
        
        const { data: modulesBatch, error: fetchError } = await supabaseAdmin
            .from('modules')
            .select(`module_code, ${ruleType}`)
            .not(ruleType, 'is', null)
            .range(start, end)
            .order('module_code'); // Consistent ordering for pagination

        if (fetchError) {
            throw new Error(`Error fetching modules batch: ${fetchError.message}`);
        }

        if (!modulesBatch || modulesBatch.length === 0) {
            console.log('No more modules found');
            hasMore = false;
        } else {
            console.log(`Fetched ${modulesBatch.length} modules in this batch`);
            allModules.push(
                ...modulesBatch.map((m: any) => ({
                    module_code: m.module_code,
                    rule: m[ruleType]
                }))
            );
            
            // Reached the end
            if (modulesBatch.length < FETCH_PAGE_SIZE) {
                console.log('Last batch');
                hasMore = false;
            } else {
                start += FETCH_PAGE_SIZE;
            }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return allModules;
}