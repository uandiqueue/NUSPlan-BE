-- Function to expand GMCs to actual module codes
CREATE OR REPLACE FUNCTION expand_general_module_codes(
    p_programme_id UUID
) RETURNS VOID AS $$
DECLARE
    v_programme RECORD;
    v_gmc RECORD;
    v_path_key TEXT;
    v_matched_count INTEGER;
BEGIN
    -- Get programme data
    SELECT * INTO v_programme 
    FROM programmes 
    WHERE id = p_programme_id;

    -- Clear existing GMC mappings
    DELETE FROM gmc_mappings WHERE programme_id = p_programme_id;
    
    -- Process all GMCs from requirement paths
    FOR v_gmc IN 
        SELECT 
            prp.path_key,
            prp.module_codes,
            prp.module_types,
            prp.group_type
        FROM programme_requirement_paths prp
        WHERE prp.programme_id = p_programme_id
        AND prp.is_leaf = true
        AND prp.module_codes IS NOT NULL
    LOOP
        -- Process each module in this path
        FOR i IN 1..array_length(v_gmc.module_codes, 1) LOOP
            PERFORM map_single_gmc(
                p_programme_id,
                v_gmc.path_key,
                v_gmc.module_types[i],
                v_gmc.module_codes[i]
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;