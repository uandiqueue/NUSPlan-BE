import type { ProgramRequirement } from "./requirements-types";

export type ProgramType = "major" | "secondMajor" | "minor";

// Abstract base for any academic program (Major, Second Major, Minor).
export abstract class AcadProgram {
    // University-wide units cap on Level-1000 modules across any program 
    static readonly MAX_LEVEL_1000_UNITS = 60;
    // Fraction of units that must be NUS-taught
    static readonly NUS_TAUGHT_FRACTION = 0.6;

    name: string;
    requirements: ProgramRequirement;

    constructor(name: string, requirements: ProgramRequirement) {
        this.name = name;
        this.requirements = requirements;
    }

    abstract getProgramType(): ProgramType;

    // Total units required for this program
    abstract getMinRequiredUnits(): number;

    // Maximum units that may be double-counted across programs 
    abstract getMaxDoubleCountUnits(): number;

    // Minimum units that must be NUS-taught: 60% of total
    getMinNUSUnits(): number {
        return Math.ceil(this.getMinRequiredUnits() * AcadProgram.NUS_TAUGHT_FRACTION);
    }

    // Maximum allowable Level-1000 units
    static getMaxLevel1000Units(): number {
        return AcadProgram.MAX_LEVEL_1000_UNITS;
    }
}


/* 
Primary Major:
- 120 units (non-Honours) or 160 units (Honours)
- No inherent double-count cap (handled by secondary programs) 
- unless DDPs
*/
export class Major extends AcadProgram {
    honours: boolean;

    constructor(
        name: string,
        requirements: ProgramRequirement,
        honours: boolean = true
    ) {
        super(name, requirements);
        this.honours = honours;
    }

    getProgramType(): ProgramType {
        return "major";
    }

    getMinRequiredUnits(): number {
        if (this.honours) {
            return 160;
        } else {
            return 120;
        }
    }

    // Primary majors do not have a double-count cap by default
    // unless they are part of a Double Degree Program (DDP)
    getMaxDoubleCountUnits(): number {
        // 40% of total units assuming DDP
        return (this.getMinRequiredUnits() * 0.4); 
    }
}

/*
Second Major:
- 40 units
- Max 16 units double-counted (40%)
- Min 12 units at Level-3000 or above (not implemented yet)
*/
export class SecondMajor extends AcadProgram {
    getProgramType(): ProgramType {
        return "secondMajor";
    }

    getMinRequiredUnits(): number {
        return 40;
    }

    getMaxDoubleCountUnits(): number {
        return 16;
    }
}

/*
Minor:
- 20 units
- Max 8 units double-counted (40%)
- Min 12 units not listed in other programs' course sets (not implemented yet)
*/
export class Minor extends AcadProgram {
    getProgramType(): ProgramType {
        return "minor";
    }

    getMinRequiredUnits(): number {
        return 20;
    }

    getMaxDoubleCountUnits(): number {
        return 8;
    }
}
