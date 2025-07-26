// Run this script with CAUTION

import supabaseAdmin from '../src/config/supabaseAdmin';

// DELETE ALL DATA FROM MODULES TABLES
async function resetEntireModulesDatabase() {
    try {
        // Clear modules
        const { error: modError } = await supabaseAdmin
            .from('modules')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (modError) {
            console.error('Failed to clear modules:', modError);
        } else {
            console.log('Cleared modules table');
        }
    } catch (error) {
        console.error('Clear operation failed:', error);
        process.exit(1);
    }
}

resetEntireModulesDatabase();
