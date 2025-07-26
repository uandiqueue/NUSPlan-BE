-- Helper function to map a single GMC -> module codes
CREATE OR REPLACE FUNCTION map_single_gmc(
    p_programme_id UUID,
    p_path_key TEXT,
    p_gmc_type TEXT,
    p_gmc_code TEXT
) RETURNS VOID AS $$
DECLARE
    v_module RECORD;
    v_match_count INTEGER := 0;
BEGIN
    CASE p_gmc_type
        WHEN 'exact' THEN
            -- Exact match - find the specific module
            PERFORM handle_missing_module(p_gmc_code);
            
        WHEN 'wildcard' THEN
            -- Wildcard - match all modules with prefix, excluding variants
            INSERT INTO gmc_mappings (
                programme_id, gmc_type, gmc_code, module_code, path_key
            )
            SELECT 
                p_programme_id, 'wildcard', p_gmc_code, module_code, p_path_key
            FROM modules
            WHERE module_code LIKE p_gmc_code || '%'
            AND module_code !~ '[A-Z]$'  -- Exclude variant modules
            ON CONFLICT DO NOTHING;
            
        WHEN 'variant' THEN
            -- Variant - match base code and all its variants
            INSERT INTO gmc_mappings (
                programme_id, gmc_type, gmc_code, module_code, path_key
            )
            SELECT 
                p_programme_id, 'variant', p_gmc_code, module_code, p_path_key
            FROM modules
            WHERE module_code LIKE p_gmc_code || '%'
            ON CONFLICT DO NOTHING;

        WHEN 'other' THEN
            -- Other - special cases like UPIP, requires approval
            PERFORM handle_missing_module(p_gmc_code);
            INSERT INTO gmc_mappings (
                programme_id, gmc_type, gmc_code, module_code, path_key, requires_approval
            )
            VALUES (
                p_programme_id, 'other', p_gmc_code, p_gmc_code, p_path_key, true
            )
            ON CONFLICT DO NOTHING;
    END CASE;
END;
$$ LANGUAGE plpgsql;