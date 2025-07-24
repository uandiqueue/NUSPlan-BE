// Run this script to seed a programme from a JSON file
// Replace `fileName` with the `type/name.json` to be seeded
let fileName = "secondMajor/Life Sciences.json"
// Usage: 
// 1. Replace fileName
// 2. ts-node scripts/seedProgrammes.ts

import fs from 'fs/promises';
import path from 'path';
import supabaseAdmin from '../src/config/supabaseAdmin';
import type { ProgrammeType } from '../src/types/shared-types';

const DEFAULT_NUS_TAUGHT_FRACTION = 0.6;

// Interface just for seeding
interface ProgrammeFile {
    meta: {
        name: string;
        type: ProgrammeType;
        requiredUnits: number;
        doubleCountCap: number;
        honours?: boolean;
        nusTaughtFraction?: number;
    };
    requirement: any; // JSON requirement structure
}

// Seed a single programme from a formatted JSON file
async function seedProgramme(jsonPath: string) {
    const filePath = path.join(__dirname, '../db/seed-data/programmes/', jsonPath);

    try {
        await fs.access(filePath);
    } catch {
        console.error('File not found');
        return;
    }

    const file = JSON.parse(
        await fs.readFile(
            filePath,
            'utf8')
    ) as ProgrammeFile;    

    const { error } = await supabaseAdmin.rpc('migrate_programme_json', {
        p_name: file.meta.name,
        p_type: file.meta.type,
        p_required_units: file.meta.requiredUnits,
        p_double_count_cap: file.meta.doubleCountCap,
        p_honours: file.meta.honours ?? (file.meta.type === 'major'),
        p_requirement_data: file.requirement
    });

    if (error) throw error;
    console.log(`Successfully seeded: ${file.meta.name} (${file.meta.type})`);
}

async function main(fileStr: string) {
    try {
        await seedProgramme(fileStr);
    } catch (error) {
        console.error('Modules seeding failed:', error);
        process.exit(1);
    }
}

main(fileName);