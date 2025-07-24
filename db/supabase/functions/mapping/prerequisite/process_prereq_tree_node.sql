-- Function to process prerequisite tree nodes recursively
CREATE OR REPLACE FUNCTION process_prereq_tree_node(
    p_module_code TEXT,
    p_node JSONB,
    p_depth INTEGER
) RETURNS VOID AS $$
DECLARE
    v_node_type TEXT;
    v_child_node JSONB;
    v_modules TEXT[];
    v_grade_modules TEXT[];
    v_n_value INTEGER;
    v_options JSONB;
    v_rule_id UUID;
BEGIN
    -- Prevent infinite recursion
    IF p_depth > 10 THEN
        RETURN;
    END IF;
    
    -- Handle string nodes (simple module codes)
    IF jsonb_typeof(p_node) = 'string' THEN
        PERFORM store_simple_module_rule(p_module_code, p_node #>> '{}');
        RETURN;
    END IF;
    
    -- Handle array nodes (list of modules)
    IF jsonb_typeof(p_node) = 'array' THEN
        -- Extract modules and process them
        SELECT array_agg(value #>> '{}') 
        INTO v_modules
        FROM jsonb_array_elements(p_node);
        
        PERFORM store_module_list_rule(p_module_code, v_modules, 'OR');
        RETURN;
    END IF;
    
    -- Handle object nodes (logical operators)
    IF jsonb_typeof(p_node) = 'object' THEN
        
        -- Handle OR logic
        IF p_node ? 'or' THEN
            INSERT INTO prerequisite_rules (
                module_code, rule_type, logic_operator, 
                original_text, rule_complexity
            ) VALUES (
                p_module_code, 'complex_or', 'OR',
                p_node #>> '{}', 'complex'
            ) RETURNING id INTO v_rule_id;
            
            -- Process each OR option
            FOR v_child_node IN SELECT value FROM jsonb_array_elements(p_node -> 'or')
            LOOP
                PERFORM process_prereq_tree_node(
                    p_module_code, 
                    v_child_node,
                    p_depth + 1
                );
            END LOOP;
            
        -- Handle AND logic
        ELSIF p_node ? 'and' THEN
            INSERT INTO prerequisite_rules (
                module_code, rule_type, logic_operator,
                original_text, rule_complexity
            ) VALUES (
                p_module_code, 'complex_and', 'AND',
                p_node #>> '{}', 'complex'
            ) RETURNING id INTO v_rule_id;
            
            -- Process each AND requirement
            FOR v_child_node IN SELECT value FROM jsonb_array_elements(p_node -> 'and')
            LOOP
                PERFORM process_prereq_tree_node(
                    p_module_code, 
                    v_child_node,
                    p_depth + 1
                );
            END LOOP;
            
        -- Handle nOf logic (choose N out of options)
        ELSIF p_node ? 'nOf' THEN
            v_n_value := (p_node -> 'nOf' -> 0)::INTEGER;
            v_options := p_node -> 'nOf' -> 1;
            
            -- Extract modules from nOf options
            SELECT array_agg(value #>> '{}') 
            INTO v_modules
            FROM jsonb_array_elements(v_options);
            
            INSERT INTO prerequisite_rules (
                module_code, rule_type, logic_operator, quantity_required,
                required_modules, original_text, rule_complexity
            ) VALUES (
                p_module_code, 'n_of', 'N_OF', v_n_value,
                v_modules, p_node #>> '{}', 'complex'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
