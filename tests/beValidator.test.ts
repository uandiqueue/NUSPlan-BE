import { BackendValidator } from '../src/services/beValidator';
import { DatabaseQueryService } from '../src/services/dbQuery';

// Spy on DatabaseQueryService to mock return
const spy = <K extends keyof DatabaseQueryService>(
    method: K,
    value: Awaited<ReturnType<DatabaseQueryService[K]>> | (() => any)
) =>
    jest.spyOn(DatabaseQueryService.prototype, method)
        .mockResolvedValue(typeof value === 'function' ? value() : value);

afterEach(() => jest.restoreAllMocks());

// Mock data
const CS = { 
    id: 'CS', 
    name: 'Computer Science', 
    type: 'major', 
    required_units: 160, 
    double_count_cap: 64, 
    honours: true, 
    nus_taught_fraction: '0.60', 
    requirement_data: '...', 
    version: 0
};
const IS = { 
    id: 'IS', 
    name: 'Information Security', 
    type: 'major', 
    required_units: 160, 
    double_count_cap: 64, 
    honours: true, 
    nus_taught_fraction: '0.60', 
    requirement_data: '...', 
    version: 0
};
const CS_minor = { 
    id: 'CSminor', 
    name: 'Computer Science', 
    type: 'minor', 
    required_units: 20, 
    double_count_cap: 8, 
    honours: false,
    nus_taught_fraction: '0.60',
    requirement_data: '...',
    version: 0
};

describe('BackendValidator (simple)', () => {
    // Valid programmes
    it('builds programme and pulls prerequisites', async () => {
        spy('getProgrammes', [CS]);
        spy('getProgrammePreclusions', []); // no programme preclusions
        spy('getRequirementPaths', [
            {
                id: 'id1',
                programme_id: 'CS',
                path_key: 'computer_science-major-core_essentials',
                parent_path_key: undefined,
                display_label: 'Core Essentials',
                logic_type: 'LEAF',
                rule_type: undefined,
                rule_value: undefined,
                required_units: 0,
                depth: 0,
                is_leaf: true,
                is_readonly: true,
                group_type: 'coreEssentials',
                raw_tag_name: 'core_essentials',
                module_codes: ['CS2040S'],
                module_types: ['exact'],
                is_overall_source: false,
                exception_modules: [],
            },
        ]);
        spy('getBatchDirectPrerequisites', [
            { module_code: 'CS2040S', required_modules: ['CS1010'] },
        ]);
        spy('getBatchPreclusions', []); // no cross-module clash
        const ctx = await new BackendValidator().validateProgrammes(['CS']);
        expect(ctx.hasErrors()).toBe(false);

        // preselected set should include both leaf and its prereq
        const selected = Array.from(ctx.getPreselectedModules().keys());
        expect(selected).toEqual(expect.arrayContaining(['CS2040S', 'CS1010']));
    });

    // Hard error - multiple majors
    it('throws hard error for multiple majors', async () => {
        spy('getProgrammes', [CS, IS]);
        spy('getProgrammePreclusions', []);
        const ctx = await new BackendValidator().validateProgrammes(['CS', 'IS']);
        expect(ctx.hasErrors()).toBe(true);
        const [err] = ctx.getErrors();
        expect(err.type).toBe('INVALID_PROGRAMME_COMBINATION');
    });

    // Hard error - preselected preclusion
    it('throws hard error for preselected preclusion', async () => {
        spy('getProgrammes', [CS, CS_minor]);
        spy('getProgrammePreclusions', []);

        // Each minor has one preselected module that precludes the other
        spy('getRequirementPaths', [
            {
                id: 'id1',
                programme_id: 'CS',
                path_key: 'computer_science-major-core_essentials',
                parent_path_key: undefined,
                display_label: 'Core Essentials',
                logic_type: 'LEAF',
                rule_type: undefined,
                rule_value: undefined,
                required_units: 0,
                depth: 0,
                is_leaf: true,
                is_readonly: true,
                group_type: 'coreEssentials',
                raw_tag_name: 'core_essentials',
                module_codes: ['CS2040S'],
                module_types: ['exact'],
                is_overall_source: false,
                exception_modules: [],
            },
            {
                id: 'id2',
                programme_id: 'CS_minor',
                path_key: 'computer_science-minor-core_essentials',
                parent_path_key: undefined,
                display_label: 'Core Essentials',
                logic_type: 'LEAF',
                rule_type: undefined,
                rule_value: undefined,
                required_units: 0,
                depth: 0,
                is_leaf: true,
                is_readonly: true,
                group_type: 'coreEssentials',
                raw_tag_name: 'core_essentials',
                module_codes: ['CS2040'],
                module_types: ['exact'],
                is_overall_source: false,
                exception_modules: [],
            },
        ]);
        spy('getBatchDirectPrerequisites', []);
        spy('getBatchPreclusions', [
            { module_code: 'CS2040', precluded_modules: ['CS2040S'] },
        ]);
        const ctx = await new BackendValidator().validateProgrammes(['CS_minor', 'minor_2']);
        expect(ctx.hasErrors()).toBe(true);
        expect(ctx.getErrors().length).toBeGreaterThan(0);
    });
});
