import type {
    GeneralModuleCode, 
    RequirementGroupType, 
    ModuleRequirement, 
    ModuleRequirementGroup
} from "../../types/requirement";
import type { 
    CourseInfo,
    TagMeta,
    CapRule,
    PopulatedProgramPayload, 
    CourseBox, 
    RequirementSection,
    AltPathBox
} from "../../types/populator";
import type { PrereqMap, PreclusionMap, TagMap, UnitMap } from "../../types/validator";
import { AcadProgram } from "../../model/acadProgram";

import { 
    collect,
    formDropdownBox, 
    formExactBox, 
    addTag, 
    prettify,
    convertToID,
    computeRequiredUnits,
    collectCapRules
} from "./helpers";
import { fetchPrereqMap, fetchPreclusionMap } from "../query";


export async function buildPopulatedProgramPayload(
    program: AcadProgram
): Promise<PopulatedProgramPayload> {

    // Initialise output payload structure
    const payload: PopulatedProgramPayload = {
        metadata: program.meta,
        requirements: [],
        moduleTags: [],
        lookup: {
            tags: {},
            units: {},
            prereqs: {},
            preclusions: {},
            selected: [], // Initially empty, will be filled with pre-selected courses
            version: 0 // Initial version, will be updated later
        }
    };

    // Data structures for accumulating tags and selection info
    const tagsMap: Map<string, Set<string>> = new Map(); // moduleCode -> tags (just strings, not yet parsed into TagMeta)
    const unitsMap: UnitMap = {}; // moduleCode -> units (non-dynamic, just for easier query)
    const preSelected = new Set<string>(); // courses that are fixed/selected by default (e.g. core essentials)
    const capRules: CapRule[] = []; // to enforce cap (max) rules: strip tags from unselected courses if cap reached

    /* 
    all unique keys, tags or id have the following format:
    key_1-key_2-key_3 (underscores are used to separate words, dashes are used to separate tags)
    */

    // Build CourseBox structures for a ModuleRequirementGroup (handles "AND" and "OR" logic)
    async function buildGroupBoxes(
        group: ModuleRequirementGroup, 
        tagChain: string[]
    ): Promise<CourseBox[]> {
        const boxes: CourseBox[] = [];

        if (group.logic === "OR") {
            // "OR" logic: create an AltPathBox with multiple paths
            const paths: AltPathBox["paths"] = [];

            for (const child of group.children) {
                // For "OR", group's name is NOT added to the tag chain (tag is added by chosen path)
                const childTagChain = [...tagChain];
                const childBoxes = await buildRequirementBoxes(child, childTagChain);

                paths.push({ 
                    id: child.rawTagName, 
                    boxes: childBoxes 
                });
            }

            const altPathBox: AltPathBox = {
                kind: "altPath",
                boxKey: `${tagChain.join("-")}-${group.rawTagName}`,
                paths,
                chosenPathId: undefined,
                UILabel: prettify(group.rawTagName),
                readonly: false
            };
            boxes.push(altPathBox);

        } else if (group.logic === "AND") {
            // "AND" logic: all children must be fulfilled (but group itself is not explicitly rendered)
            // rawTagName will be included in tag chain
            let currentTagChain = [...tagChain];
            if (group.rawTagName && tagChain.length > 0) {
                currentTagChain.push(group.rawTagName);
            }
            for (const child of group.children) {
                const childBoxes = await buildRequirementBoxes(child, currentTagChain);
                boxes.push(...childBoxes);
            }
        }

        return boxes;
    }

    // Build CourseBox structures for a ModuleRequirement (leaf) or nested ModuleRequirementGroup
    async function buildRequirementBoxes(
        node: ModuleRequirementGroup | ModuleRequirement, 
        tagChain: string[]
    ): Promise<CourseBox[]> {
        // Nested ModuleRequirementGroup
        if ("logic" in node) {
            return buildGroupBoxes(node, tagChain);
        }

        // Leaf node (ModuleRequirement of type "min" or "max")
        const boxes: CourseBox[] = [];
        const req = node as ModuleRequirement;

        // Determine tag chain
        let reqTagChain = [...tagChain];
        reqTagChain.push(req.rawTagName);
        // Tag chain only converts to string at the leaf level
        const tagString = reqTagChain.join("-");

        // Retrieve all modules that satisfy this requirement
        const moduleList = await collect(req.modules);
        // Assign tags to all these modules
        for (const mod of moduleList) {
            addTag(tagsMap, mod.courseCode, tagString);
            // Map course to respective units for easier query
            unitsMap[mod.courseCode] = mod.units
        }

        // "max" requirement: not rendered in UI, just a constraint
        if (req.type === "max") {
            // Collect "max" constraints and store in capRules
            collectCapRules(capRules, req, tagString);
            return boxes;
        }

        // "min" requirement: render as CourseBox(es)
        else if (req.type === "min") {
            // Minimum units required from this set of modules
            // No courses available (should not happen in valid data)
            if (moduleList.length === 0) {
                return boxes; 
            }
            // Only one possible course: ExactBox
            if (moduleList.length === 1) {
                const mod = moduleList[0];
                boxes.push(formExactBox(
                    mod, 
                    `${tagString}-${convertToID(mod.courseCode)}`, 
                    false
                ));
                // Mark this course as pre-selected
                preSelected.add(mod.courseCode);
            } 
            // Multiple choices available: DropdownBox
            else {
                const options: CourseInfo[] = moduleList;
                // Determine a user-friendly label for the dropdown
                let dropdownLabel = prettify(req.rawTagName) || "Choose course";
                boxes.push(formDropdownBox(
                    dropdownLabel, 
                    options, 
                    tagString, 
                    false
                ));
            }
        }

        return boxes;
    }

    // Build a top-level RequirementSection (UI section block)
    async function buildRequirementSection(
        sectionType: RequirementGroupType, 
        sectionData: ModuleRequirementGroup | GeneralModuleCode[]
    ){
        // Section keys and respective user-friendly labels
        const sectionLabels: Record<string, string> = {
            commonCore: "Common Curriculum",
            unrestrictedElectives: "Unrestricted Electives",
            coreEssentials: "Core Essentials",
            coreElectives: "Core Electives",
            coreSpecials: "Specialisations",
            coreOthers: "Others"
        };
        const sectionLabel = sectionLabels[sectionType]
        let sectionKeyChain: string[];
        let sectionKeyString: string;
        if (sectionType === "coreEssentials") {
            sectionKeyChain = [convertToID(program.meta.name), convertToID(program.meta.type), convertToID(sectionType)];
            sectionKeyString = `${convertToID(program.meta.name)}-${convertToID(program.meta.type)}-${convertToID(sectionType)}`;  // unique identifier for section
        } else {
            sectionKeyChain = [convertToID(program.meta.name), convertToID(program.meta.type)];
            sectionKeyString = `${convertToID(program.meta.name)}-${convertToID(program.meta.type)}`;  // unique identifier for section
        }
        const sectionNote = (!Array.isArray(sectionData) && sectionData.note) ? sectionData.note : undefined;
        const sectionBoxes: CourseBox[] = [];
        let sectionRequiredUnits = 0;

        // Flat list of modules (coreEssentials)
        if (Array.isArray(sectionData)) {
            for (const gmc of sectionData) {
                // Course with variants: provide a dropdown to choose the specific variant
                if (gmc.type === "variant") {
                    const course = await collect([gmc]);
                    const baseCode = gmc.baseCode;
                    // Label dropdown with base code and title
                    const UIlabel = `${baseCode} variants`;
                    sectionBoxes.push(formDropdownBox(
                        UIlabel, 
                        course, 
                        `${sectionKeyString}-${convertToID(baseCode)}-variants`, 
                        true // readonly since it's a core essential
                    ));
                    // Tag all variant options with section's tag
                    course.forEach(mod => addTag(tagsMap, mod.courseCode, sectionKeyString));
                    // Map all variants to respective units
                    course.forEach(mod => unitsMap[mod.courseCode] = mod.units);
                    sectionRequiredUnits += course[0].units; // Variants should have the same units
                    // Not mark as selected yet
                } 
                // Exact course: create an ExactBox
                else if (gmc.type === "exact") {
                    const course = await collect([gmc]);
                    if (course.length === 1) {
                        sectionBoxes.push(formExactBox(
                            course[0], 
                            `${sectionKeyString}-${convertToID(course[0].courseCode)}`, 
                            true // readonly since it's a core essential
                        ));
                        addTag(tagsMap, course[0].courseCode, sectionKeyString);
                        unitsMap[course[0].courseCode] = course[0].units
                        sectionRequiredUnits += course[0].units;
                        preSelected.add(course[0].courseCode);
                    } else {
                        continue; // should not happen for valid data
                    }
                }
                // Core essentials only have exact or variant types
            }
        } 

        // Nested requirement group (e.g., coreElectives, commonCore, etc.)
        else if (sectionData) {
            const reqGroup = sectionData as ModuleRequirementGroup;
            // Build CourseBox list for this requirement group
            const boxes = await buildGroupBoxes(reqGroup, sectionKeyChain);
            sectionBoxes.push(...boxes);
            // Determine how many AUs are required for this section (for progress tracking)
            sectionRequiredUnits = computeRequiredUnits(reqGroup);
        }

        // Cast the section to into RequirementSection
        const section: RequirementSection = {
            group: sectionType,
            requirementKey: sectionKeyString,
            requiredUnits: sectionRequiredUnits,
            label: sectionLabel,
            boxes: sectionBoxes
        };
        if (sectionNote) {
            section.note = sectionNote;
        }

        // Add section into PopulatedProgramPayload
        payload.requirements.push(section);
    }

    // Build sections for existing top-level requirement group in the program
    if (program.requirement.commonCore) {
        await buildRequirementSection("commonCore", program.requirement.commonCore);
    }
    if (program.requirement.coreEssentials) {
        await buildRequirementSection("coreEssentials", program.requirement.coreEssentials);
    }
    if (program.requirement.coreElectives) {
        await buildRequirementSection("coreElectives", program.requirement.coreElectives);
    }
    if (program.requirement.coreSpecials) {
        await buildRequirementSection("coreSpecials", program.requirement.coreSpecials);
    }
    if (program.requirement.coreOthers) {
        await buildRequirementSection("coreOthers", program.requirement.coreOthers);
    }
    if (program.requirement.unrestrictedElectives) {
        await buildRequirementSection("unrestrictedElectives", program.requirement.unrestrictedElectives);
    }


    // Apply cap rule: if selected courses already fulfill the max, remove tag from other courses in that pool
    for (const cap of capRules) {
        let usedUnits = 0;
        const affectedCodes: string[] = [];
        // Identify all courses tagged under this cap rule
        for (const [courseCode, tagSet] of tagsMap.entries()) {
            for (const tag of tagSet) {
                if (tag === cap.tag) {
                    affectedCodes.push(courseCode);
                    break;
                }
            }
        }
        cap.courses = affectedCodes
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

    // Construct the moduleTags array for UI renderring, consolidating tags for each module
    for (const [moduleCode, tagSet] of tagsMap.entries()) {
        if (tagSet.size === 0) continue;  // Skip modules that ended up with no tags (excluded by cap rules)
        const requirementKeys = Array.from(tagSet);
        const tagMeta: TagMeta = {
            type: "requirementKeys", // type doubleCount is construct by AP Optimiser
            requirementKeys: requirementKeys,
            count: requirementKeys.length
        };
        payload.moduleTags.push({ moduleCode: moduleCode, tags: [tagMeta] });
    }

    // Convert tagsMap (Map<string, Set<string>>) to TagMap (Record<string, string[]>)
    const tagMapObj: TagMap = {};
    for (const [moduleCode, tagSet] of tagsMap.entries()) {
        tagMapObj[moduleCode] = Array.from(tagSet);
    }

    // Populate lookup payload with tags, units, prereqs, and preclusions
    const prereqsMap: PrereqMap = await fetchPrereqMap();
    const preclusionsMap: PreclusionMap = await fetchPreclusionMap();

    payload.lookup = {
        tags: tagMapObj,
        units: unitsMap,
        prereqs: prereqsMap,
        preclusions: preclusionsMap,
        selected: Array.from(preSelected),
        version: 1
    };

    return payload;
}