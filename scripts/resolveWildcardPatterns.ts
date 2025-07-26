// Run this script to resolve all wildcard-type prerequisites to fill required_modules and pattern_quantity
// Usage: 
// ts-node scripts/resolveWildcardPatterns.ts

import supabaseAdmin from '../src/config/supabaseAdmin';

export async function resolveAllWildcardPatterns(): Promise<void> {
    const cache = new Map<string, string[]>();

    const { data: rules, error } = await supabaseAdmin
        .from('prerequisite_rules')
        .select('id, module_pattern')
        .eq('rule_type', 'wildcard')
        .not('module_pattern', 'is', null)
        .is('required_modules', null);

    if (error) {
        console.error('Failed to fetch wildcard rules:', error);
        return;
    }

    if (!rules || rules.length === 0) {
        console.log('No unresolved wildcard rules found.');
        return;
    }

    for (const { id, module_pattern: pattern } of rules) {
        if (!pattern) continue;

        // Check cache
        let matches = cache.get(pattern);
        if (!matches) {
            const { data, error: fetchError } = await supabaseAdmin
                .from('modules')
                .select('module_code')
                .like('module_code', pattern)
                .limit(500);

            if (fetchError) {
                console.error(`Error fetching modules for pattern "${pattern}":`, fetchError);
                continue;
            }

            matches = data?.map(m => m.module_code) || [];
            cache.set(pattern, matches);
        }

        if (matches.length === 0) continue;

        const { error: updateError } = await supabaseAdmin
            .from('prerequisite_rules')
            .update({
                required_modules: matches,
                pattern_quantity: matches.length
            })
            .eq('id', id);

        if (updateError) {
            console.error(`Failed to update rule ${id}:`, updateError);
        } else {
            console.log(`Resolved pattern "${pattern}" with ${matches.length} modules`);
        }
    }
}

async function main() {
    try {
        await resolveAllWildcardPatterns();
    } catch (error) {
        console.error('Prerequisite wildcard resolving failed:', error);
        process.exit(1);
    }
}

main();