-- Function to build requirement paths from JSON
CREATE OR REPLACE FUNCTION build_requirement_paths(
    p_programme_id UUID
) RETURNS VOID AS $$
DECLARE
    v_programme RECORD;
    v_programme_key TEXT;
BEGIN
    -- Get programme data
    SELECT * INTO v_programme
    FROM programmes 
    WHERE id = p_programme_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Programme not found: %', p_programme_id;
    END IF;
    
    -- Build programme key prefix (e.g. "computer_science-major")
    v_programme_key := LOWER(REPLACE(v_programme.name, ' ', '_')) || '-' || v_programme.type;
    
    -- Clear existing pathss
    DELETE FROM programme_requirement_paths WHERE programme_id = p_programme_id;
    DELETE FROM module_path_mappings WHERE programme_id = p_programme_id;
    DELETE FROM gmc_mappings WHERE programme_id = p_programme_id;
    
    -- Process each requirement group
    BEGIN
        PERFORM process_requirement_group(
            p_programme_id,
            v_programme_key,
            key::TEXT,
            value,
            NULL,
            0
        )
        FROM jsonb_each(v_programme.requirement_data) AS x(key, value); -- e.g. key = "coreEssentials", value = JSONB of requirement
    END;

    -- Expand GMCs to actual modules
    PERFORM expand_general_module_codes(p_programme_id);
    
    -- Update module_path_mappings with expanded modules
    INSERT INTO module_path_mappings (programme_id, module_code, path_keys)
    SELECT 
        gmm.programme_id,
        gmm.module_code,
        array_agg(DISTINCT gmm.path_key)
    FROM gmc_mappings gmm
    WHERE gmm.programme_id = p_programme_id
    GROUP BY gmm.programme_id, gmm.module_code
    ON CONFLICT (programme_id, module_code) 
    DO UPDATE SET path_keys = EXCLUDED.path_keys;

END;
$$ LANGUAGE plpgsql;