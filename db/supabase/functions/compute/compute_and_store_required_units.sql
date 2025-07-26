-- Function to compute and store required units
CREATE OR REPLACE FUNCTION compute_and_store_required_units(
    p_programme_id UUID
) RETURNS VOID AS $$
DECLARE
    v_path RECORD;
BEGIN
    FOR v_path IN 
        SELECT * FROM programme_requirement_paths 
        WHERE programme_id = p_programme_id
        ORDER BY depth DESC -- Start from leaves
    LOOP
        PERFORM compute_path_required_units(v_path.id, v_path.path_key, p_programme_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;