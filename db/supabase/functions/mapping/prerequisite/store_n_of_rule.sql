-- Function to store nOf rules
CREATE OR REPLACE FUNCTION store_n_of_rule(
    p_module_code TEXT,
    p_number INTEGER,
    p_group JSONB,
    p_depth INTEGER,
    p_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_parent_id UUID;
    v_arr JSONB := (p_group->1)::TEXT::JSONB;
    v_all_string BOOLEAN := TRUE;
    v_codes TEXT[] := '{}';
    v_grades TEXT[] := '{}';
    v_elem_text TEXT;
    v_code TEXT;
    v_grade TEXT;
BEGIN
    -- Placeholder parent (update later)
    INSERT INTO prerequisite_rules(
        module_code, rule_type, rule_complexity, depth,
        required_modules, grade_required,
        quantity_required, original_text, parent_rule_id
    ) VALUES (
        p_module_code,
        'n_of',
        'complex',
        p_depth,
        '{}'::TEXT[],
        NULL,
        p_number,
        p_group::TEXT,
        p_parent_id
    ) RETURNING id INTO v_parent_id;

    -- Link to parent
    IF p_parent_id IS NOT NULL THEN
        UPDATE prerequisite_rules SET children = array_append(children, v_parent_id)
        WHERE id = p_parent_id;
    END IF;

    -- Check if have any objects (nested rules, not found at least until now))
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_arr) AS e
        WHERE jsonb_typeof(e) = 'object'
    ) THEN
        v_all_string := FALSE;
        UPDATE prerequisite_rules
            SET rule_type = 'n_of',
                rule_complexity = 'extreme',
                required_modules = '{}',
                grade_required = '{}'
        WHERE id = v_parent_id;
    ELSE
        -- Only modules
        FOR v_elem_text IN SELECT * FROM jsonb_array_elements_text(v_arr) LOOP
            v_code := split_part(v_elem_text, ':', 1);
            v_grade := NULLIF(split_part(v_elem_text, ':', 2), '');
            v_codes := array_append(v_codes, v_code);
            v_grades := array_append(v_grades, v_grade);
        END LOOP;

        UPDATE prerequisite_rules
            SET rule_type = 'n_of',
                rule_complexity = 'medium',
                required_modules = v_codes,
                grade_required = v_grades
        WHERE id = v_parent_id;
    END IF;

    RETURN v_parent_id;
END;
$$ LANGUAGE plpgsql;