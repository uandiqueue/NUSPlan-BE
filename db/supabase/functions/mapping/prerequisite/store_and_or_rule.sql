-- Function to store AND/OR rules
CREATE OR REPLACE FUNCTION store_and_or_rule(
    p_module_code TEXT,
    p_array JSONB,
    p_logic TEXT, -- 'AND/OR'
    p_depth INTEGER,
    p_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_parent_id UUID;
    v_codes TEXT[] := '{}';
    v_grades TEXT[] := '{}';
    v_elem JSONB;
    v_has_wild BOOLEAN := false;
    v_encounter_child BOOLEAN := false;
    v_raw TEXT;
    v_code TEXT;
    v_grade TEXT;
BEGIN
    -- Placeholder parent (update later)
    INSERT INTO prerequisite_rules(
        module_code, rule_type, rule_complexity, depth,
        required_modules, original_text, parent_rule_id
    ) VALUES (
        p_module_code,
        CASE WHEN p_logic='AND' THEN 'complex_and' ELSE 'complex_or' END,
        'complex',
        p_depth,
        '{}'::TEXT[],
        p_array::TEXT,
        p_parent_id
    ) RETURNING id INTO v_parent_id;

    -- Link to parent
    IF p_parent_id IS NOT NULL THEN
        UPDATE prerequisite_rules SET children = array_append(children, v_parent_id) 
        WHERE id = p_parent_id;
    END IF;

    -- Process each element
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_array) LOOP
        IF jsonb_typeof(v_elem) = 'string' THEN
            v_raw := v_elem #>> '{}';
            v_code := split_part(v_raw, ':', 1);
            v_grade := NULLIF(split_part(v_raw, ':', 2), '');
            v_codes := array_append(v_codes, v_code);
            v_grades := array_append(v_grades, v_grade);
            IF (v_elem #>> '{}') LIKE '%\%%' THEN
                v_has_wild := true;
            END IF;
            PERFORM store_single_module_rule(p_module_code, v_elem #>> '{}', p_depth+1, v_parent_id);
        ELSE
            v_encounter_child := true;
            -- Recurse
            PERFORM process_prereq_tree_node(p_module_code, v_elem, p_depth+1, v_parent_id);
        END IF;
    END LOOP;

    -- Post‑process classification
    IF NOT v_has_wild THEN
        DECLARE
            v_child_types TEXT[];
            v_all_child_simple_and BOOLEAN;
        BEGIN
            SELECT array_agg(DISTINCT rule_type)
                INTO v_child_types
                FROM prerequisite_rules r
                WHERE r.id = ANY(COALESCE((SELECT children 
                    FROM prerequisite_rules WHERE id = v_parent_id), '{}'::UUID[]));

            v_all_child_simple_and := (
                v_child_types IS NULL OR 
                (array_length(v_child_types,1) = 1 AND v_child_types[1] = 'simple_and')
            );

            -- Update parent rule type based on children
            UPDATE prerequisite_rules
                SET rule_type = CASE
                    WHEN v_has_wild THEN 'wildcard'
                    WHEN p_logic='AND' AND NOT v_encounter_child THEN 'simple_and'
                    WHEN p_logic='AND' AND v_all_child_simple_and THEN 'simple_and'
                    WHEN p_logic='OR' AND NOT v_encounter_child THEN 'simple_or'
                    ELSE CASE WHEN p_logic='AND' THEN 'complex_and' ELSE 'complex_or' END
                END,
                    rule_complexity = CASE
                        WHEN rule_type IN ('simple_and','simple_or') THEN 'medium'
                        WHEN rule_type = 'wildcard' THEN 'complex'
                        ELSE 'complex'
                    END,
                    required_modules = v_codes,
                    grade_required = v_grades
                WHERE id = v_parent_id;
        END;
    ELSE
        -- Wildcard overrides everything
        UPDATE prerequisite_rules
            SET rule_type = 'wildcard', rule_complexity='complex', required_modules = ARRAY[]::TEXT[]
            WHERE id = v_parent_id;
    END IF;

    RETURN v_parent_id;
END;
$$ LANGUAGE plpgsql;
