import type {
    PopulatedProgramPayload
} from "../../types/populator";
import type {
    ModuleCode
} from "../../types/nusmods-types";

import {
    iterateCodes,
    processPrereqTree
} from "./helpers";
import {
    fetchPrereqMap,
    fetchPreclusionMap
} from "../query";

// Cleans a set of programmes and throws error if a hard conflict is found.
export async function validatePopulatedPayload(
    payloads: PopulatedProgramPayload[]
): Promise<void> {

    // Fetch prerequisite and preclusion maps
    const prereqMap = await fetchPrereqMap();
    const preclusionMap = await fetchPreclusionMap();

    // Build global lookup sets
    // per-programme pre-selected (core essentials and others)
    const selectedSets = new Map<
        PopulatedProgramPayload,
        Set<ModuleCode>
    >(); 
    // per-programme electives (dropdown and altPath options)
    const electiveSets = new Map<
        PopulatedProgramPayload,
        Set<ModuleCode>
    >(); 
    // across ALL programmes (major, second major and minors)
    const globalSelected = new Set<ModuleCode>(); 
    // walk through all programmes and collect selected and elective courses
    for (const p of payloads) {
        const selected = new Set<ModuleCode>(p.lookup.selected);
        const elect = new Set<ModuleCode>();
        p.requirements.forEach((sec) => {
            for (const code of iterateCodes(sec)) {
                if (selected.has(code)) {
                    // already in selected set
                } else {
                    elect.add(code);
                }
            }
        });
        selectedSets.set(p, selected);
        electiveSets.set(p, elect);
        // Add to global selected set
        for (const s of selected) globalSelected.add(s);
    }

    // Hard conflict checking (if two programmes have selected courses that preclude each other)
    // Should not happen if data is correct
    for (const selected of globalSelected) {
        for (const pre of preclusionMap[selected] ?? []) {
            if (globalSelected.has(pre) && pre !== selected) {
                throw new Error(
                    `Programme selection impossible: selected module ${selected} precludes selected module ${pre}`
                );
            }
        }
    }

    // Soft conflict checking (if courses in course pool and selected courses preclude each other)
    for (const [payload, electSet] of electiveSets) {
        for (const selected of globalSelected) {
            for (const pre of preclusionMap[selected] ?? []) {
                if (electSet.has(pre)) {
                    // remove it from every dropdown/altPath it appears in
                    payload.requirements.forEach((sec) => {
                        sec.boxes.forEach((box) => {
                            if (box.kind === "dropdown") {
                                box.options = box.options.filter((o) => o.courseCode !== pre);
                            }
                            if (box.kind === "altPath") {
                                box.paths = box.paths.filter((p) => {
                                    for (const b of p.boxes) {
                                        if (b.kind === "exact" && b.course.courseCode === pre) return false;
                                        if (b.kind === "dropdown") {
                                            b.options = b.options.filter((o) => o.courseCode !== pre);
                                            if (b.options.length === 0) return false;
                                        }
                                    }
                                    return true;
                                });
                            }
                        });
                    });
                    // remove it from tags (strip away its tags)
                    delete payload.lookup.tags[pre];
                    payload.moduleTags = payload.moduleTags.filter(
                        (tag) => tag.moduleCode !== pre
                    );
                    electSet.delete(pre);
                    console.info(
                        `Removed elective ${pre} (precluded by selected ${selected})`
                    );
                }
            }
        }
    }

    // Add missing prerequisites to relevant or coreOthers section
    for (const payload of payloads) {
        const selected = globalSelected;

        // only check modules that are preSelected
        for (const sec of payload.requirements) {
            for (const box of sec.boxes) {
                if (box.kind === "exact" && payload.lookup.selected.includes(box.course.courseCode)) {
                    const parentCode = box.course.courseCode;
                    const prereqTree = prereqMap[parentCode];
                    if (prereqTree) {
                        processPrereqTree(
                            parentCode,
                            prereqTree,
                            payload,
                            electiveSets,
                            selected,
                            `${sec.requirementKey}`,
                            sec
                        );
                    }
                }
            }
        }
    }
}

