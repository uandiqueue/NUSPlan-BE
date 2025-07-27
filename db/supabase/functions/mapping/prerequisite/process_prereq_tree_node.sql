-- Function to process prerequisite tree nodes recursively
CREATE OR REPLACE FUNCTION process_prereq_tree_node(
    p_module_code TEXT,
    p_node JSONB,
    p_depth INTEGER,
    p_parent_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Prevent infinite recursion
    IF p_depth > 10 THEN
        RETURN;
    END IF;

    IF jsonb_typeof(p_node) = 'string' THEN
        PERFORM store_single_module_rule(p_module_code, p_node #>> '{}', p_depth, p_parent_id);
        RETURN;
    END IF;

    IF jsonb_typeof(p_node) = 'object' THEN
        IF p_node ? 'and' THEN
            PERFORM store_and_or_rule(p_module_code, p_node->'and', 'AND', p_depth, p_parent_id);
            RETURN;
        ELSIF p_node ? 'or' THEN
            PERFORM store_and_or_rule(p_module_code, p_node->'or', 'OR', p_depth, p_parent_id);
            RETURN;
        ELSIF p_node ? 'nOf' THEN
            PERFORM store_n_of_rule(
                p_module_code,
                (p_node->'nOf'->>0)::INTEGER,
                p_node->'nOf'->>1,
                p_depth,
                p_parent_id
            );
            RETURN;
        END IF;
    END IF;

    IF jsonb_typeof(p_node) = 'array' THEN
        PERFORM store_and_or_rule(p_module_code, p_node, 'OR', p_depth, p_parent_id);
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;