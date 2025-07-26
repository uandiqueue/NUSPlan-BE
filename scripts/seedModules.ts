// Run this script to seed the entire detailed module list from NUSMods
// Usage: 
// ts-node scripts/seedModules.ts

import fs from 'fs/promises';
import path from 'path';
import supabaseAdmin from '../src/config/supabaseAdmin';
import type { Module } from '../src/types/nusmods-types';

// Seed the entire detailed module list from NUSMods
const BATCH_SIZE = 50; // In batches to prevent timeouts

async function seedModules() {
    const filePath = path.join(__dirname, '../db/seed-data/modules/ultraDetailedModuleList.json');
    
    try {
        await fs.access(filePath);
    } catch {
        console.error('File not found');
        return;
    }
    
    const raw = await fs.readFile(filePath, 'utf-8');
    const modules: Module[] = JSON.parse(raw);
    
    console.log(`Found ${modules.length} modules to process`);
    
    // Check if modules already exist on supabase
    const { data: existingModules } = await supabaseAdmin
        .from('modules')
        .select('module_code')
        .limit(1);

    if (existingModules && existingModules.length > 0) {
        console.log("Database already seeded with modules.");
        return;
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < modules.length; i += BATCH_SIZE) {
        const batch = modules.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(modules.length/BATCH_SIZE)}`);
        
        const batchData = batch.map(mod => ({
            module_code: mod.moduleCode,
            title: mod.title,
            description: mod.description ?? '',
            module_credit: parseInt(mod.moduleCredit) || 4,
            department: mod.department,
            faculty: mod.faculty,
            workload: mod.workload ?? [],
            aliases: mod.aliases ?? [],
            grading_basis: mod.gradingBasisDescription ?? '',
            attributes: mod.attributes ?? {},
            additional_info: mod.additionalInformation ?? '',
            acad_year: mod.acadYear,
            prerequisite: mod.prerequisite ?? '',
            prerequisite_rule: mod.prerequisiteRule ?? '',
            prerequisite_advisory: mod.prerequisiteAdvisory ?? '',
            corequisite: mod.corequisite ?? '',
            corequisite_rule: mod.corequisiteRule ?? '',
            preclusion: mod.preclusion ?? '',
            preclusion_rule: mod.preclusionRule ?? '',
            semester_data: mod.semesterData ?? [],
            prereq_tree: mod.prereqTree ?? null,
            fulfill_requirements: mod.fulfillRequirements ?? []
        }));

        const { error, count } = await supabaseAdmin
            .from('modules')
            .insert(batchData);

        if (error) {
            console.error(`Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, error.message);
            failed += batch.length;
        } else {
            console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1} success: ${count} modules`);
            successful += batch.length;
        }
        
        processed += batch.length;
        
        // Small delay between batches (SADLY free tier supabase)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Processed: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
}

async function main() {
    try {
        await seedModules();
    } catch (error) {
        console.error('Modules seeding failed:', error);
        process.exit(1);
    }
}

main();