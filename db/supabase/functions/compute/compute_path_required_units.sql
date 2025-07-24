-- Function to compute for a single path
CREATE OR REPLACE FUNCTION compute_path_required_units(
    p_path_id UUID,
    p_path_key TEXT,
    p_programme_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_path RECORD;
    v_child RECORD;
    v_required_units INTEGER := 0;
    v_has_override BOOLEAN := false;
    v_override_source TEXT;
    v_child_units INTEGER;
BEGIN
    -- Get current path details
    SELECT * INTO v_path 
    FROM programme_requirement_paths 
    WHERE id = p_path_id;

    -- Case 1: Core Essentials leaf (compute with units in modules)
    IF v_path.group_type = 'coreEssentials' AND v_path.is_leaf THEN
        v_required_units := (
            SELECT COALESCE(SUM(DISTINCT m.module_credit::INT), 0)
            FROM   module_path_mappings mp
            JOIN   modules m
                ON m.module_code = mp.module_code
            WHERE  mp.programme_id = p_programme_id
            AND  mp.path_keys @> ARRAY[p_path_key]
        );

    -- Case 2: Leaf node with min rule
    ELSIF v_path.is_leaf AND v_path.rule_type = 'min' THEN
        v_required_units := v_path.rule_value;
    
    -- Case 3: Has children - need to aggregate
    ELSIF v_path.child_count > 0 THEN
        -- First check for override (overall: true)
        FOR v_child IN 
            SELECT * FROM programme_requirement_paths 
            WHERE programme_id = p_programme_id 
            AND parent_path_key = p_path_key
        LOOP
            -- Check if this child has override rule
            IF v_child.is_override_source THEN
                v_required_units := v_child.rule_value;
                v_has_override := true;
                v_override_source := v_child.path_key;
                EXIT; -- Stop after finding the override source
            END IF;
        END LOOP;
        
        -- If no override, compute based on logic type
        IF NOT v_has_override THEN
            IF v_path.logic_type = 'AND' THEN
                -- Sum all children
                SELECT COALESCE(SUM(required_units), 0) INTO v_required_units
                FROM programme_requirement_paths
                WHERE programme_id = p_programme_id 
                AND parent_path_key = p_path_key;
                
            ELSIF v_path.logic_type = 'OR' THEN
                -- Take minimum of children
                SELECT COALESCE(MIN(required_units), 0) INTO v_required_units
                FROM programme_requirement_paths
                WHERE programme_id = p_programme_id 
                AND parent_path_key = p_path_key
                AND required_units > 0;
            END IF;
        END IF;
    END IF;
    
    -- Update the path with computed values
    UPDATE programme_requirement_paths 
    SET 
        required_units = v_required_units,
        has_override = v_has_override,
        override_source = v_override_source
    WHERE id = p_path_id;
    
    RETURN v_required_units;
END;
$$ LANGUAGE plpgsql;