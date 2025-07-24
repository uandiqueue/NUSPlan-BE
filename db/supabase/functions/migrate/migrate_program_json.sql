CREATE OR REPLACE FUNCTION migrate_programme_json(
    p_name TEXT,
    p_type TEXT,
    p_required_units INTEGER,
    p_double_count_cap INTEGER,
    p_honours BOOLEAN,
    p_requirement_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_programme_id UUID;
BEGIN
    -- Insert or update programme
    INSERT INTO programmes (
        name, type, required_units, double_count_cap, honours, requirement_data
    ) VALUES (
        p_name, p_type, p_required_units, p_double_count_cap, p_honours, p_requirement_data
    )
    ON CONFLICT (name, type) DO UPDATE SET
        required_units = EXCLUDED.required_units,
        double_count_cap = EXCLUDED.double_count_cap,
        honours = EXCLUDED.honours,
        requirement_data = EXCLUDED.requirement_data,
        version = programmes.version + 1
    RETURNING id INTO v_programme_id;
    
    -- Build requirement paths
    PERFORM build_requirement_paths(v_programme_id);

    -- Mark coreEssentials modules as readonly
    PERFORM mark_readonly_modules(v_programme_id);
    
    -- Compute and store required units
    PERFORM compute_and_store_required_units(v_programme_id);
    RETURN v_programme_id;
END;
$$ LANGUAGE plpgsql;