-- Mark all coreEssentials modules as readonly
CREATE OR REPLACE FUNCTION mark_readonly_modules(
    p_programme_id UUID
) RETURNS VOID AS $$
DECLARE
    v_module_code TEXT;
    v_prereq_codes TEXT[];
    v_readonly_count INTEGER := 0;
BEGIN
    UPDATE programme_requirement_paths
    SET is_readonly = true
    WHERE programme_id = p_programme_id
    AND group_type = 'coreEssentials'
    AND is_leaf = true;
END;
$$ LANGUAGE plpgsql;