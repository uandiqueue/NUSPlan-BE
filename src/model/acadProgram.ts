import type { 
    ProgramRequirement, 
    ProgramMeta, 
    ProgramType 
} from "../types/requirement";

// Represents an academic program, such as a Major, Second Major, or Minor.
export class AcadProgram {
    meta: ProgramMeta;
    requirement: ProgramRequirement;

    constructor(meta: ProgramMeta, requirement: ProgramRequirement) {
        this.meta = meta;
        this.requirement = requirement;
    }

    getProgramType(): ProgramType {
        return this.meta.type;
    }

    getMinRequiredUnits(): number {
        return this.meta.requiredUnits;
    }

    getMaxDoubleCountUnits(): number {
        return this.meta.doubleCountCap;
    }

    getMinNUSUnits(): number {
        return Math.ceil(this.meta.requiredUnits * this.meta.nusTaughtFraction);
    }
}