-- Function to parse preclusion strings
CREATE OR REPLACE FUNCTION parse_preclusion_string(
    p_module_code TEXT,
    p_preclusion_text TEXT
) RETURNS JSONB AS $$
DECLARE
    v_precluded_modules TEXT[];
    v_result JSONB;
BEGIN
    -- Extract module codes from preclusion text
    v_precluded_modules := extract_all_modules_from_text(p_preclusion_text);
    
    -- Store in preclusion_rules table
    IF array_length(v_precluded_modules, 1) > 0 THEN
        INSERT INTO preclusion_rules (
            module_code, precluded_modules, original_text
        ) VALUES (
            p_module_code, v_precluded_modules, p_preclusion_text
        );
    END IF;
    
    v_result := jsonb_build_object(
        'precluded_modules', COALESCE(v_precluded_modules, ARRAY[]::TEXT[]),
        'original_text', p_preclusion_text,
        'parsed_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;