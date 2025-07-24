-- Function to check double counting eligibility
CREATE OR REPLACE FUNCTION check_double_count_eligibility(
    p_plan_id UUID,
    p_module_code TEXT,
    p_programme_ids UUID[]
) RETURNS TABLE (
    programme_id UUID,
    can_double_count BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH programme_caps AS (
        SELECT 
            p.id,
            p.name,
            p.double_count_cap,
            COUNT(pm.id) FILTER (WHERE pm.is_double_counted) as current_double_count
        FROM programmes p
        LEFT JOIN plan_modules pm ON pm.programme_id = p.id 
            AND pm.plan_id = p_plan_id 
            AND pm.is_double_counted = true
        WHERE p.id = ANY(p_programme_ids)
        GROUP BY p.id, p.name, p.double_count_cap
    )
    SELECT 
        pc.id,
        pc.current_double_count < pc.double_count_cap,
        CASE 
            WHEN pc.current_double_count >= pc.double_count_cap 
            THEN 'Double count cap reached (' || pc.double_count_cap || ')'
            ELSE 'Can double count'
        END
    FROM programme_caps pc;
END;
$$ LANGUAGE plpgsql;