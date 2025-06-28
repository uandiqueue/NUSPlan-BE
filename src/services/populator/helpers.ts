import {
    getCourseInfoByPrefix,
    findExactCourseInfo,
} from "../query";
import type { CourseInfo, ExactBox, DropdownBox, CapRule } from "../../types/populator";
import type { 
    GeneralModuleCode, 
    ModuleRequirementGroup,
    ModuleRequirement
} from "../../types/requirement";

// Matching one GeneralModuleCode to modules
export async function matchGeneralCode(
    gmc: GeneralModuleCode
): Promise<CourseInfo[]> {
    switch (gmc.type) {
        case "exact": {
            // Exact code: find the specific module
            console.info(`Finding exact module: ${gmc.code}`);
            const m = await findExactCourseInfo(gmc.code);
            console.info(`Found exact module: ${m?.courseCode}`);
            return m ? [m] : [];
        }
        case "wildcard": {
            // Wildcard prefix: get all modules starting with prefix
            // only base code (if contains variants, e.g. only "CS1010" not "CS1010S")
            console.info(`Finding wildcard modules with prefix: ${gmc.prefix}`);
            const m = await getCourseInfoByPrefix(gmc.prefix);
            console.info(`Found ${m.length} modules with prefix: ${gmc.prefix}`);
            return m.filter(m => !/[A-Z]$/.test(m.courseCode));
        }
        case "variant": {
            // Variant base code: get base and all variant modules for that base code
            console.info(`Finding variant modules for base code: ${gmc.baseCode}`);
            return getCourseInfoByPrefix(gmc.baseCode)
        }
        case "other": {
            // non-common “other” tokens (UPIP, etc.)
            return [{
                courseCode: gmc.code,
                title: "Undefined - Please check relevant website",
                units: 4 // Default units for undefined modules
            }];
        }
    }
}


// Retrieve all CourseInfo[] from GeneralModuleCode[]
// Guarantees the same module never appears twice in the resulting array, 
// even if two rules overlap (e.g. "CS1010" variant and wildcard "CS10").
// return an array with unique modules for a requirement (e.g. coreEssentials)
export async function collect(codes: GeneralModuleCode[]): Promise<CourseInfo[]> {
    const seen = new Set<string>(); // to track module codes appeared
    const res: CourseInfo[] = [];

    for (const c of codes) {
        for (const mod of await matchGeneralCode(c)) {
            if (!seen.has(mod.courseCode)) { // if not seen before
                seen.add(mod.courseCode);
                res.push(mod);
            }
        }
    }
    return res;
}

export function addTag(
    map: Map<string, Set<string>>,
    moduleCode: string,
    requirementKey: string
) {
    const set = map.get(moduleCode) ?? new Set<string>();
    set.add(requirementKey);
    map.set(moduleCode, set);
}

// Forming CourseBox helpers
export function formExactBox(
    course: CourseInfo,
    keyChain: string,
    isReadonly: boolean = false
): ExactBox {
    return {
        kind: "exact",
        boxKey: `${keyChain}`,
        course: course,
        UILabel: `${course.courseCode} - ${course.title}`,
        readonly: isReadonly
    };
}
export function formDropdownBox(
    UILabel: string,
    options: CourseInfo[],
    keyChain: string,
    isReadonly: boolean = false
): DropdownBox {
    return {
        kind: "dropdown",
        boxKey: `${keyChain}`,
        options: options,
        UILabel: UILabel,
        readonly: isReadonly
    };
}

// Prettify a string by adding spaces between snake_case or camelCase words and capitalizing the first letter
export function prettify(str: string): string {
    if (!str) console.warn(`Prettify called with ${str}`);
    return str
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

// Convert a string to a valid ID format (snake_case with underscores)
/* 
all unique keys, tags or id have the following format:
key_1-key_2-key_3 (underscores are used to separate words, dashes are used to separate tags)
*/
export function convertToID(str: string): string {
    return str
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase words
    .toLowerCase()
    .trim()
    .replace(/\s/g, "_");
}

// Compute the total required units for a requirement group
export function computeRequiredUnits(
    node: ModuleRequirementGroup | ModuleRequirement,
): number {
    // Leaf: min value
    if (!("children" in node)) {
        return node.type === "min" ? node.value : 0;
    }

    // Helper to obtain the min units required of one direct child
    const needOf = (child: ModuleRequirementGroup | ModuleRequirement) =>
        "children" in child ? computeRequiredUnits(child)
                            : child.type === "min" ? child.value 
                            : 0;

    // AND: sum of min values,  OR: minimum of min values
    if (node.logic === "AND") {
        return node.children.reduce((sum, ch) => sum + needOf(ch), 0);
    } else {
        return node.children
                   .map(needOf)
                   .reduce((min, n) => Math.min(min, n), Infinity);
    }
}

// Collect all max constraints from requirement structure with their tag prefix and unit cap
export function collectCapRules(
    store: CapRule[],
    node: ModuleRequirement, 
    tagChain: string
) {
    // "max" leaf node not rendered but is enforced as cap rule
    if (node.type === "max") {
        store.push({ 
            tag: tagChain, 
            maxUnits: node.value,
            courses: []
        });
    }
}