-- Lookup function for prerequisites
CREATE OR REPLACE FUNCTION get_module_prerequisites(p_module_code TEXT)
RETURNS TABLE (
    id UUID,
    module_code TEXT,
    rule_type TEXT,
    rule_complexity TEXT,
    depth INTEGER,
    required_modules TEXT[],
    children UUID[],
    quantity_required INTEGER,
    module_pattern TEXT,
    grade_required TEXT[],
    original_text TEXT,
    parent_rule_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id,
        pr.module_code,
        pr.rule_type,
        pr.rule_complexity,
        pr.depth,
        pr.required_modules,
        pr.children,
        pr.quantity_required,
        pr.module_pattern,
        pr.grade_required,
        pr.original_text,
        pr.parent_rule_id
    FROM public.prerequisite_rules pr
    WHERE pr.module_code = p_module_code
    ORDER BY pr.depth, pr.id;
END;
$$ LANGUAGE plpgsql;
