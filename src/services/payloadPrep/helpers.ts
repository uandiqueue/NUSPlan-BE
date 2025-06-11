import {
  getCourseInfoByPrefix,
  findExactCourseInfo,
  loadCommonCore
} from "../query";
import type { CourseInfo, ExactBox, DropdownBox, AltPathBox, RequirementSection } from "../../types/payloads";
import type { 
    GeneralModuleCode, 
    RequirementGroupType,
    ModuleRequirementGroup,
    ModuleRequirement
} from "../../types/requirement";

// Flatten requirement tree
function flatten(
    node: ModuleRequirementGroup | ModuleRequirement
): GeneralModuleCode[] {
    if ("children" in node) {
        return node.children.flatMap(flatten);
    }
    return node.modules ?? []; // if it's a leaf node, return the modules directly
}

// Matching one GeneralModuleCode to modules
async function matchGeneralCode(gmc: GeneralModuleCode): Promise<CourseInfo[]> {
    switch (gmc.type) {
        case "exact": {
            const m = await findExactCourseInfo(gmc.code);
            return m ? [m] : [];
        }
        case "wildcard":
            return getCourseInfoByPrefix(gmc.prefix);
        case "variant":
            return getCourseInfoByPrefix(gmc.baseCode);
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

// Forming CourseBox helpers
export function formExactBox(
    course: CourseInfo,
    section: RequirementSection,
    isReadonly: boolean = false
): ExactBox {
    return {
        kind: "exact",
        boxKey: `${section.requirementKey}-${course.courseCode}`,
        course: course,
        UILabel: `${course.courseCode} - ${course.title}`,
        readonly: isReadonly
    };
}
export function formDropdownBox(
    key: string,
    UILabel: string,
    options: CourseInfo[],
    section: RequirementSection,
    isReadonly: boolean = false
): DropdownBox {
    return {
        kind: "dropdown",
        boxKey: `${section.requirementKey}-${key}-dropdown`,
        options: options,
        UILabel: UILabel,
        readonly: isReadonly
    };
}

// Determine if a requirement group should be displayed as a dropdown
export function shouldDropdown(
    group: RequirementGroupType,
    mods: CourseInfo[]
): boolean {
    const alwaysDropdown: RequirementGroupType[] = [
        "commonCore",
        "unrestrictedElectives",
        "coreElectives",
        "coreSpecials",
        "coreOthers"
    ];
    return alwaysDropdown.includes(group) || mods.length > 20;
}

// Prettify a string by adding spaces between camelCase words and capitalizing the first letter
export function prettify(str: string): string {
    return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function convertToID(str: string): string {
    return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim()
    .replace(/\s/g, "_");
}