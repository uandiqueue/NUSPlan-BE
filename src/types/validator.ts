// For requirement fulfilment indicator UI
export interface BlockProgress {
    requirementKey: string;
    requiredAU: number;
    currentAU: number;
    fulfilled: boolean;
}
export interface RequirementFulfilmentPayload {
    programmeId: string;
    blocks: Record<string, BlockProgress>;
    doubleCountUsed: number;
    doubleCountCap: number;
    warnings?: string[];
    version: number;
}