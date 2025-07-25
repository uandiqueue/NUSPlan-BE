// Run this script to seed all programme from seed-data directory
// Usage: 
// ts-node scripts/seedAllProgrammes.ts

import fs from 'fs/promises';
import path from 'path';
import { mainSingle } from './seedProgramme';

const BASE_DIR = path.join(__dirname, '../db/seed-data/programmes/');

async function getAllJsonFiles(dir: string, prefix = ''): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(prefix, entry.name);

        if (entry.isDirectory()) {
            const subfiles = await getAllJsonFiles(fullPath, relativePath);
            files.push(...subfiles);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(relativePath);
            console.log(`Found JSON file: ${relativePath}`);
        }
    }
    return files;
}

async function main() {
    try {
        const jsonFiles = await getAllJsonFiles(BASE_DIR);
        if (jsonFiles.length === 0) {
            console.log('No files found.');
            return;
        }
        for (const jsonPath of jsonFiles) {
            await mainSingle(jsonPath);
        }
        console.log(`All ${jsonFiles.length} programmes seeded.`);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

main();