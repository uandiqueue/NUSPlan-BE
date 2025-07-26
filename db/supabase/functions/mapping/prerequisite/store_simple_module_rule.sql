-- Function to store simple module rules (handles grade requirements)
CREATE OR REPLACE FUNCTION store_simple_module_rule(
    p_module_code TEXT,
    p_module_spec TEXT
) RETURNS VOID AS $$
DECLARE
    v_module_code TEXT;
    v_grade TEXT;
    v_rule_type TEXT := 'simple';
BEGIN
    -- Check if module has grade requirement (e.g., "CS1010S:D")
    IF p_module_spec LIKE '%:%' THEN
        v_module_code := split_part(p_module_spec, ':', 1);
        v_grade := split_part(p_module_spec, ':', 2);
        v_rule_type := 'grade_requirement';
    ELSE
        v_module_code := p_module_spec;
        v_grade := NULL;
    END IF;
    
    -- Handle wildcard patterns (e.g., "UTC11%")
    IF v_module_code LIKE '%\%%' THEN
        INSERT INTO prerequisite_rules (
            module_code, rule_type, module_pattern, grade_required,
            original_text, rule_complexity
        ) VALUES (
            p_module_code, 'wildcard', v_module_code, v_grade,
            p_module_spec, CASE WHEN v_grade IS NOT NULL THEN 'medium' ELSE 'simple' END
        );
    ELSE
        INSERT INTO prerequisite_rules (
            module_code, rule_type, required_modules, grade_required,
            original_text, rule_complexity
        ) VALUES (
            p_module_code, v_rule_type, ARRAY[v_module_code], v_grade,
            p_module_spec, CASE WHEN v_grade IS NOT NULL THEN 'medium' ELSE 'simple' END
        );
    END IF;
END;
$$ LANGUAGE plpgsql;