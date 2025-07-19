// Run this script with CAUTION

import supabaseAdmin from '../src/services/supabase/supabaseAdmin';

// DELETE ALL DATA FROM PROGRAMMES TABLES
async function resetEntireProgrammesDatabase() {
    try {
        // Clear programmes
        const { error: progError } = await supabaseAdmin
            .from('programmes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
        if (progError) {
            console.error('Failed to clear programmes:', progError);
        } else {
            console.log('Cleared programmes table');
        }    
    } catch (error) {
        console.error('Clear operation failed:', error);
        process.exit(1);
    }
}

resetEntireProgrammesDatabase();