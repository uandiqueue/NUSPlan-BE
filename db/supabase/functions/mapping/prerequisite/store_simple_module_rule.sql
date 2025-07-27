-- Function to store single module rules
CREATE OR REPLACE FUNCTION store_single_module_rule(
    p_module_code TEXT,
    p_module_spec TEXT,
    p_depth INTEGER,
    p_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_code TEXT := split_part(p_module_spec,':',1);
    v_grade TEXT := NULL;
    v_type TEXT := 'simple';
    v_id UUID;
BEGIN
    IF p_module_spec LIKE '%:%' THEN
        v_grade := split_part(p_module_spec,':',2);
    END IF;

    IF v_code LIKE '%\%%' THEN
        v_type := 'wildcard';
    END IF;

    INSERT INTO prerequisite_rules(
        module_code, rule_type, rule_complexity, depth,
        required_modules, grade_required,
        module_pattern, original_text, parent_rule_id
    ) VALUES (
        p_module_code,
        v_type,
        CASE WHEN v_type = 'simple' THEN 'simple' ELSE 'complex' END,
        p_depth,
        CASE WHEN v_type = 'simple' THEN ARRAY[v_code] ELSE ARRAY[]::TEXT[] END,
        CASE WHEN v_grade IS NOT NULL THEN ARRAY[v_grade] ELSE NULL END,
        CASE WHEN v_type = 'wildcard' THEN v_code ELSE NULL END,
        p_module_spec,
        p_parent_id
    ) RETURNING id INTO v_id;

    IF p_parent_id IS NOT NULL THEN
        UPDATE prerequisite_rules
        SET children = array_append(children, v_id)
        WHERE id = p_parent_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;