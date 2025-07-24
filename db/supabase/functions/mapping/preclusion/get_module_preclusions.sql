-- Lookup function for preclusions
CREATE OR REPLACE FUNCTION get_module_preclusions(p_module_code TEXT)
RETURNS TEXT[] AS $$
DECLARE
    v_result TEXT[];
BEGIN
    SELECT array_agg(DISTINCT unnest(precluded_modules))
    INTO v_result
    FROM preclusion_rules
    WHERE module_code = p_module_code;
    
    RETURN COALESCE(v_result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;