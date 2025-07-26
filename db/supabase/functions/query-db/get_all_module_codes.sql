-- Lookup function for module_code of all modules
CREATE OR REPLACE FUNCTION get_all_module_codes()
RETURNS TEXT[] AS $$
DECLARE
    v_result TEXT[];
BEGIN
    SELECT array_agg(DISTINCT module_code)
    INTO v_result
    FROM public.modules;

    RETURN COALESCE(v_result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;