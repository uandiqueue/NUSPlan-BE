-- Function to store module list rules
CREATE OR REPLACE FUNCTION store_module_list_rule(
    p_module_code TEXT,
    p_modules TEXT[],
    p_logic TEXT
) RETURNS VOID AS $$
DECLARE
    v_clean_modules TEXT[];
    v_grade_modules TEXT[];
    v_has_grades BOOLEAN := false;
    v_module_spec TEXT;
    v_module_code TEXT;
    v_grade TEXT;
BEGIN
    -- Process each module to separate codes and grades
    FOREACH v_module_spec IN ARRAY p_modules
    LOOP
        IF v_module_spec LIKE '%:%' THEN
            v_module_code := split_part(v_module_spec, ':', 1);
            v_grade := split_part(v_module_spec, ':', 2);
            v_has_grades := true;
            v_grade_modules := array_append(v_grade_modules, v_module_spec);
        ELSE
            v_module_code := v_module_spec;
        END IF;
        
        v_clean_modules := array_append(v_clean_modules, v_module_code);
    END LOOP;
    
    -- Store the rule
    INSERT INTO prerequisite_rules (
        module_code, rule_type, required_modules, logic_operator,
        grade_required, original_text, rule_complexity
    ) VALUES (
        p_module_code, 
        CASE WHEN v_has_grades THEN 'grade_requirement' ELSE 'simple' END,
        v_clean_modules, 
        p_logic,
        CASE WHEN v_has_grades THEN array_to_string(v_grade_modules, ',') ELSE NULL END,
        array_to_string(p_modules, ' OR '),
        CASE WHEN v_has_grades OR array_length(p_modules, 1) > 3 THEN 'medium' ELSE 'simple' END
    );
END;
$$ LANGUAGE plpgsql;