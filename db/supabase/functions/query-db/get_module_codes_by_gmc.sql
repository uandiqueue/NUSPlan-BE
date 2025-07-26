-- Lookup function for module_codes of a specific gmc_code
CREATE OR REPLACE FUNCTION get_module_codes_by_gmc(p_gmc_code TEXT)
RETURNS TABLE (
    module_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT g.module_code
    FROM public.gmc_mappings g
    WHERE g.gmc_code = p_gmc_code
    ORDER BY g.module_code;
END;
$$ LANGUAGE plpgsql;