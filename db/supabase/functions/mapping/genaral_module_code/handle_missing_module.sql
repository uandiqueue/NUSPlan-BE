-- Function to ensure missing modules are handled
CREATE OR REPLACE FUNCTION handle_missing_module(p_module_code TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO modules (
        module_code,
        acad_year,
        title,
        description,
        module_credit,
        additional_info,
        is_nusmods
    )
    VALUES (
        p_module_code,
        'Please check official website.',
        p_module_code,
        'Please check official website for more details.',
        4,
        'Please check official website for more details, prerequisites and approval.',
        false
    )
    ON CONFLICT (module_code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;