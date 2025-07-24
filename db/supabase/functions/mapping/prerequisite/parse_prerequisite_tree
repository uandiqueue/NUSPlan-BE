-- Function to parse structured prereq_tree JSONB data
CREATE OR REPLACE FUNCTION parse_prerequisite_tree(
    p_module_code TEXT,
    p_prereq_tree JSONB
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_complexity TEXT := 'simple';
    v_has_grades BOOLEAN := false;
    v_rule_count INTEGER := 0;
BEGIN
    -- Initialize result
    v_result := jsonb_build_object(
        'module_code', p_module_code,
        'original_tree', p_prereq_tree,
        'parsed_at', NOW()
    );

    -- Clear existing rules for this module (Should have been done)
    DELETE FROM prerequisite_rules WHERE module_code = p_module_code;
    
    -- Process the prerequisite tree recursively
    PERFORM process_prereq_tree_node(
        p_module_code, 
        p_prereq_tree,
        1::INTEGER
    );
    
    -- Analyze complexity and grade requirements
    SELECT 
        COUNT(*),
        BOOL_OR(grade_required IS NOT NULL),
        CASE 
            WHEN COUNT(*) = 1 AND MAX(rule_type) = 'simple' THEN 'simple'
            WHEN COUNT(*) <= 3 THEN 'medium'
            ELSE 'complex'
        END
    INTO v_rule_count, v_has_grades, v_complexity
    FROM prerequisite_rules 
    WHERE module_code = p_module_code;
    
    -- Update modules table with flags
    UPDATE modules 
    SET 
        has_complex_prereqs = (v_complexity != 'simple'),
        has_grade_requirements = v_has_grades,
        prerequisite_parsed = v_result
    WHERE module_code = p_module_code;
    
    -- Build final result
    v_result := v_result || jsonb_build_object(
        'complexity', v_complexity,
        'has_grades', v_has_grades,
        'rule_count', v_rule_count
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;