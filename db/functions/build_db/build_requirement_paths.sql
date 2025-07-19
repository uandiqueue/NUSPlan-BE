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
    
    -- Build programme key prefix
    v_programme_key := LOWER(REPLACE(v_programme.name, ' ', '_')) || '-' || v_programme.type;
    
    -- Clear existing paths (To be run when there is update to programme data)
    DELETE FROM programme_requirement_paths WHERE programme_id = p_programme_id;
    DELETE FROM module_path_mappings WHERE programme_id = p_programme_id;
    
    -- Process each requirement group
    PERFORM process_requirement_group(
        p_programme_id,
        v_programme_key,
        key::TEXT,
        value,
        NULL,
        0
    )
    FROM jsonb_each(v_programme.requirement_data) AS x(key, value);
    
END;
$$ LANGUAGE plpgsql;