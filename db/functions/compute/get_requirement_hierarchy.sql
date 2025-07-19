-- Function to get required units for nested UI
CREATE OR REPLACE FUNCTION get_requirement_hierarchy(
    p_programme_id UUID,
    p_include_progress BOOLEAN DEFAULT false,
    p_picked_modules TEXT[] DEFAULT NULL
) RETURNS TABLE (
    path_key TEXT,
    parent_path_key TEXT,
    depth INTEGER,
    display_label TEXT,
    required_units INTEGER,
    logic_type TEXT,
    is_leaf BOOLEAN,
    child_count INTEGER,
    fulfilled_units INTEGER,
    progress_percent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH base_hierarchy AS (
        SELECT 
            prp.path_key,
            prp.parent_path_key,
            prp.depth,
            prp.display_label,
            prp.required_units,
            prp.logic_type,
            prp.is_leaf,
            prp.child_count
        FROM programme_requirement_paths prp
        WHERE prp.programme_id = p_programme_id
    ),
    progress_calc AS (
        SELECT 
            bh.*,
            CASE 
                WHEN p_include_progress AND p_picked_modules IS NOT NULL THEN
                    COALESCE((
                        SELECT SUM(m.module_credit::INTEGER)
                        FROM modules m
                        WHERE m.module_code = ANY(p_picked_modules)
                        AND m.module_code = ANY(
                            SELECT unnest(module_codes) 
                            FROM programme_requirement_paths 
                            WHERE path_key = bh.path_key
                        )
                    ), 0)
                ELSE 0
            END as fulfilled_units
        FROM base_hierarchy bh
    )
    SELECT 
        pc.*,
        CASE 
            WHEN pc.required_units = 0 THEN 100
            ELSE LEAST(100, (pc.fulfilled_units * 100 / pc.required_units))
        END as progress_percent
    FROM progress_calc pc
    ORDER BY pc.depth, pc.path_key;
END;
$$ LANGUAGE plpgsql;