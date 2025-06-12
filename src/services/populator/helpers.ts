import {
  getCourseInfoByPrefix,
  findExactCourseInfo,
  loadCommonCore
} from "../query";
import type { CourseInfo, ExactBox, DropdownBox, CapRule } from "../../types/payloads";
import type { 
    GeneralModuleCode, 
    ModuleRequirementGroup,
    ModuleRequirement
} from "../../types/requirement";

// Flatten requirement tree
function flatten(
    node: ModuleRequirementGroup | ModuleRequirement
): GeneralModuleCode[] {
    return "children" in node
    ? node.children.flatMap(flatten)
    : node.modules ?? [];
}

// Matching one GeneralModuleCode to modules
export async function matchGeneralCode(
    gmc: GeneralModuleCode
): Promise<CourseInfo[]> {
    switch (gmc.type) {
        case "exact": {
            // Exact code: find the specific module
            const m = await findExactCourseInfo(gmc.code);
            return m ? [m] : [];
        }
        case "wildcard": {
            // Wildcard prefix: get all modules starting with prefix
            // only base code (if contains variants, e.g. only "CS1010" not "CS1010S")
            const m = await getCourseInfoByPrefix(gmc.prefix);
            return m.filter(m => !/[A-Z]$/.test(m.courseCode));
        }
        case "variant": {
            // Variant base code: get base and all variant modules for that base code
            return getCourseInfoByPrefix(gmc.baseCode)
        }
        case "other": {
            // case for commonCore codes, e.g. "common-soc"
            const m = gmc.code.match(/^common-(.+)$/);
            if (m) {
                const fac = m[1];
                const codes = await loadCommonCore(fac);
                const flattened = await Promise.all(
                    flatten(codes).map(matchGeneralCode)
                );
                return flattened.flat();
            }
            // non-common “other” tokens (UPIP, etc.) ignored for now
            return [];
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
        boxKey: `${keyChain}-${course.courseCode}`,
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
        boxKey: `${keyChain}-dropdown`,
        options: options,
        UILabel: UILabel,
        readonly: isReadonly
    };
}

// Prettify a string by adding spaces between snake_case or camelCase words and capitalizing the first letter
export function prettify(str: string): string {
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
    node: ModuleRequirementGroup | ModuleRequirement
): number {
    if ("children" in node) {
        // Separate children into leaves (ModuleRequirement) and groups (ModuleRequirementGroup)
        const leaves = node.children.filter((child) => !("children" in child));
        const groups = node.children.filter((child) => "children" in child);

        // Case 1: There are leaves in the children - required units is sum of the "min" values of leaves
        if (leaves.length > 0) {
            return leaves.reduce((sum, leaf) => {
                if (!("type" in leaf)) return sum;
                return leaf.type === "min" ? sum + leaf.value : sum;
            }, 0);
        }

        // Case 2: All children are groups - recursively compute each group’s required units
        if (leaves.length === 0 && groups.length === node.children.length) {
            return node.children.reduce(
                (sum, childGroup) => sum + computeRequiredUnits(childGroup), 
                0
            );
        }

        // Case 3: No rule applies (e.g. "OR" group), return 0.
        return 0;
    } else {
        // For leaf requirements, return the value if it's a "min" requirement
        return node.type === "min" ? node.value : 0;
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