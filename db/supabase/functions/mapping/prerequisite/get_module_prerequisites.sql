-- Lookup function for prerequisites
CREATE OR REPLACE FUNCTION get_module_prerequisites(p_module_code TEXT)
RETURNS TABLE(
    rule_type TEXT,
    required_modules TEXT[],
    logic_operator TEXT,
    quantity_required INTEGER,
    module_pattern TEXT,
    grade_required TEXT,
    pattern_quantity INTEGER,
    original_text TEXT,
    rule_complexity TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.rule_type,
        pr.required_modules,
        pr.logic_operator,
        pr.quantity_required,
        pr.module_pattern,
        pr.grade_required,
        pr.pattern_quantity,
        pr.original_text,
        pr.rule_complexity
    FROM prerequisite_rules pr
    WHERE pr.module_code = p_module_code
    ORDER BY pr.rule_type, pr.id;
END;
$$ LANGUAGE plpgsql;
