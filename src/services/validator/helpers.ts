import type { ModuleCode, PrereqTree } from "../../types/nusmods-types";
import type {
    PopulatedProgramPayload,
    RequirementSection,
    CourseBox,
    CapRule
} from "../../types/populator";
import type { TagMap, UnitMap } from "../../types/validator";
import { convertToID } from "../populator/helpers";
import { findExactCourseInfo } from "../query";

// Walk every CourseBox and yield the module codes it contains.
export function* iterateCodes(sec: RequirementSection): Generator<ModuleCode> {
    for (const box of sec.boxes) {
        if (box.kind === "exact") yield box.course.courseCode;
        if (box.kind === "dropdown")
            for (const opt of box.options) yield opt.courseCode;
        if (box.kind === "altPath") {
            for (const p of box.paths) {
            for (const inner of p.boxes) {
                yield* iterateCodes({ ...sec, boxes: [inner] });
            }
            }
        }
    }
}

// Make sure the programme has a writable `coreOthers` section and return it.
export function ensureCoreOthers(payload: PopulatedProgramPayload): RequirementSection {
    let sec = payload.requirements.find((s) => s.group === "coreOthers");
    if (!sec) {
        sec = {
            group: "coreOthers",
            label: "Others",
            requirementKey: `${convertToID(payload.metadata.name)}-${convertToID(payload.metadata.type)}-core_others`,
            requiredUnits: 0,
            boxes: [],
        };
        payload.requirements.push(sec);
    }
    return sec;
}

// Check where to add pre-requisite courses
const SECTION_PRIORITY = [
    "commonCore",
    "coreEssentials",
    "coreElectives",
    "coreSpecials",
] as const;
type PreReqSectionType = (typeof SECTION_PRIORITY)[number] | "coreOthers";
// Returns the highest-priority sectionType hinted by TagMap, or undefined.
export function getSectionTypeFromTags(
    code: ModuleCode,
    tagMap: TagMap
): PreReqSectionType | undefined {
    const allTags = tagMap[code] ?? [];
    for (const priority of SECTION_PRIORITY) {
        if (allTags.some((tag) => tag.includes(convertToID(priority)))) {
            // Return based on priority of section
            return priority;
        }
    }
    return "coreOthers";
}


// Add a particular courses as a prerequisite
async function addLeafPrereq (
    parentCourse: ModuleCode, // The course that has the prerequisite
    code: ModuleCode, 
    payload: PopulatedProgramPayload,
    selected: Set<ModuleCode>,
    electiveSets: Map<PopulatedProgramPayload, Set<ModuleCode>>
): Promise<void> {
    // Pre-process the course code
    code = code.split(":")[0];
    // Check if it is already selected (in any programme)
    if (selected.has(code)) return;

    // If it is not a pre-selected course, add it as a required course (pre-selected)
    // Check if it is already in the core or elective sets
    const elect = electiveSets.get(payload)!;
    if (elect.has(code)) {
        // Remove the prerequisite from all dropdown boxes
        elect.delete(code);
        payload.requirements.forEach((sec) => {
            sec.boxes.forEach((box) => {
                if (box.kind === "dropdown") {
                    box.options = box.options.filter((o) => o.courseCode !== code);
                }
            });
        });
    }
    // Count it as a selected course
    selected.add(code);
    // Add it to the coreOthers section or the relevant section
    const sectionType = getSectionTypeFromTags(code, payload.lookup.tags);
    let target: RequirementSection;
    if (sectionType === "coreOthers") {
        target = ensureCoreOthers(payload);
    } else {
        // Find section matching sectionType
        target = payload.requirements.find(sec => sec.group === sectionType)!;
    }
    // Info about the course
    const course = await findExactCourseInfo(code);
    if (!course) {
        throw new Error(`Course info not found for code: ${code}`);
    }
    // Add the prerequisite course box
    target.boxes.push({
        kind: "exact",
        boxKey: `${target.requirementKey}-${convertToID(parentCourse)}_prereq-${convertToID(code)}`,
        course: course,
        UILabel: `${course.courseCode} - ${course.title}`,
        readonly: true
    } as CourseBox);
    console.info(
        `Added prerequisite ${code} to ${sectionType} of ${payload.metadata.name} (${payload.metadata.type})`
    );
};

// Process the prerequisite tree recursively
export async function processPrereqTree(
    parentCourse: ModuleCode,
    tree: PrereqTree,
    payload: PopulatedProgramPayload,
    elect: Map<PopulatedProgramPayload, Set<ModuleCode>>,
    globalSelected: Set<ModuleCode>,
    parentKey: string,
    target: RequirementSection
): Promise<void> {
    // Leaf node (single course prerequisite)
    if (typeof tree === "string") {
        await addLeafPrereq(parentCourse, tree, payload, globalSelected, elect);
        return;
    }

    // AND nodes (all children must be satisfied)
    if (tree.and) {
        for (const child of tree.and) {
        await processPrereqTree(
            parentCourse,
            child,
            payload,
            elect,
            globalSelected,
            parentKey,
            target
        );
        }
        return;
    }

    // OR nodes (any child can be satisfied)
    if (tree.or) {
        // if every child is a leaf, then single dropdown
        if (tree.or.every((c) => typeof c === "string")) {
            const opts = await Promise.all(
                (tree.or as string[]).map(async (code) => {
                    // Pre-process the course code
                    code = code.split(":")[0];
                    const c = await findExactCourseInfo(code);
                    if (!c) {
                        console.error(`Course info not found for code: ${code}, skipping.`);
                        return null;
                    }
                    return c;
                })
            );
            target.boxes.push({
                kind: "dropdown",
                boxKey: `${parentKey}-${convertToID(parentCourse)}_prereq-dropdown`,
                options: opts,
                UILabel: `${parentCourse} - Choose a prerequisite`,
                readonly: true
            } as CourseBox);
        } else {
            // Nested options, then altPath
            const alt: CourseBox = {
                kind: "altPath",
                boxKey: `${parentKey}-${convertToID(parentCourse)}_prereq-pathways`,
                paths: [],
                UILabel: `${parentCourse} - Choose a prerequisite pathway`,
                readonly: true
            };
            let idx = 0;
            for (const child of tree.or) {
                idx++;
                const subSec: RequirementSection = {
                    group: target.group,
                    requirementKey: `${target.requirementKey}-${convertToID(parentCourse)}_prereq-pathways-${idx}`,
                    requiredUnits: target.requiredUnits,
                    label: target.label,
                    boxes: [],
                };
                await processPrereqTree(
                    parentCourse,
                    child,
                    payload,
                    elect,
                    globalSelected,
                    `${parentKey}-${convertToID(parentCourse)}_prereq-pathways-${idx}`,
                    subSec
                );
                if (subSec.boxes.length) alt.paths.push({
                    id: `${parentKey}-${convertToID(parentCourse)}_prereq-pathways-${idx}`,
                    boxes: subSec.boxes
                });
            }
            if (alt.paths.length) target.boxes.push(alt);
        }
        return;
    }

    // nOf nodes (select at least n of the children)
    if (tree.nOf) {
        const [minReq, list] = tree.nOf;
        const alt: CourseBox = {
            kind: "altPath",
            boxKey: `${parentKey}-${convertToID(parentCourse)}_prereq-nOf-${minReq}`,
            paths: [],
            UILabel: `${parentCourse} - Select any ${minReq} prerequisites`,
            readonly: true
        };
        let idx = 0;
        for (const child of list) {
            idx++;
            const subSec: RequirementSection = {
                group: target.group,
                requirementKey: `${target.requirementKey}-${convertToID(parentCourse)}_prereq-nOf_pathways-${idx}`,
                requiredUnits: target.requiredUnits,
                label: target.label,
                boxes: [],
            };
            await processPrereqTree(
                parentCourse,
                child,
                payload,
                elect,
                globalSelected,
                `${parentKey}-${convertToID(parentCourse)}_prereq-nOf_pathways-${idx}`,
                subSec
            );
            if (subSec.boxes.length) alt.paths.push({
                id: `${parentKey}-${convertToID(parentCourse)}_prereq-nOf_pathways-${idx}`,
                    boxes: subSec.boxes
                });
            }
            if (alt.paths.length) target.boxes.push(alt);
    }
}

// Helper function to apply cap rules
export function applyCapRules(
    capRules: CapRule[],
    tagsMap: Map<ModuleCode, Set<string>>,
    unitsMap: UnitMap,
    preSelected: Set<ModuleCode>
) {
    for (const cap of capRules) {
        let usedUnits = 0;
        const affectedCodes: ModuleCode[] = [];
        // Identify all courses tagged under this cap rule
        for (const [courseCode, tagSet] of tagsMap.entries()) {
            for (const tag of tagSet) {
                if (tag === cap.tag) {
                    affectedCodes.push(courseCode);
                    break;
                }
            }
        }
        cap.courses = affectedCodes;
        // Calculate total units from this group that are already selected
        for (const code of affectedCodes) {
            if (preSelected.has(code)) {
                usedUnits += unitsMap[code] || 0;
            }
        }
        // If cap reached or exceeded, strip this cap's tags from all unselected modules in the group
        if (usedUnits >= cap.maxUnits) {
            for (const code of affectedCodes) {
                if (!preSelected.has(code)) {
                    const newTags = new Set<string>();
                    tagsMap.get(code)?.forEach(tag => {
                        if (!(tag === cap.tag)) {
                            newTags.add(tag);
                        }
                    });
                    tagsMap.set(code, newTags);
                }
            }
        }
    }
}