// Run this script to parse prerequisites from prereq_tree from all modules
// Usage: 
// ts-node scripts/parseAllPrerequisites.ts

import supabaseAdmin from '../src/config/supabaseAdmin';
import { fetchAllModulesForRules } from './fetchAllModulesForRules';

const BATCH_SIZE = 50;

async function parseAllPrerequisites() {
    try {
        // Fetch all modules using pagination
        const allModules = await fetchAllModulesForRules('prereq_tree');

        if (allModules.length === 0) {
            console.log('No modules found with prereq_tree');
            return;
        }

        console.log(`Found ${allModules.length} modules with prereq_tree`);

        // Clear existing rules
        await supabaseAdmin.from('prerequisite_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('Cleared existing prerequisite_rules');

        let parsedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allModules.length; i += BATCH_SIZE) {
            const batch = allModules.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allModules.length/BATCH_SIZE)}`);

            // Process each module in the batch sequentially to avoid overwhelming the RPC
            for (const mod of batch) {
                try {
                    const { error: rpcError } = await supabaseAdmin.rpc('new_parse_prerequisite_tree', {
                        p_module_code: mod.module_code,
                        p_prereq_tree: mod.rule
                    });

                    if (rpcError) {
                        console.warn(`Failed to parse ${mod.module_code}:`, rpcError.message);
                        errorCount++;
                    } else {
                        parsedCount++;
                    }
                } catch (error) {
                    console.warn(`Fail in parsing ${mod.module_code}:`, error);
                    errorCount++;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`Parsed: ${parsedCount}, Errors: ${errorCount}`);

    } catch (error) {
        console.error('Error in parseAllPrerequisites:', error);
        throw error;
    }
}

async function main() {
    try {
        await parseAllPrerequisites();
    } catch (error) {
        console.error('Prerequisite parsing failed:', error);
        process.exit(1);
    }
}

main();