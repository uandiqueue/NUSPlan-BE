-- Helper function to extract all modules from complex text
CREATE OR REPLACE FUNCTION extract_all_modules_from_text(p_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
    v_modules TEXT[];
BEGIN
    SELECT array_agg(DISTINCT match[1])
    INTO v_modules
    FROM regexp_matches(p_text, '([A-Z]{2,4}\d{4}[A-Z]{0,3})', 'g') AS match;
    
    RETURN COALESCE(v_modules, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;