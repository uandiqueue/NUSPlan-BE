-- Recursive function to process requirement groups
CREATE OR REPLACE FUNCTION process_requirement_group(
    p_programme_id UUID,
    p_base_key TEXT,
    p_group_type TEXT,
    p_group_data JSONB,
    p_parent_key TEXT,
    p_depth INTEGER,
    p_is_override_source BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
    v_current_key TEXT;
    v_raw_tag_name TEXT;
    v_has_overall_child BOOLEAN := false;
    v_logic_type TEXT;
    v_is_leaf BOOLEAN;
    v_child RECORD;
    v_module_codes TEXT[];
    v_module_types TEXT[];
    v_child_is_override BOOLEAN;
BEGIN
    -- Handle coreEssentials (array of modules)
    IF p_group_type = 'coreEssentials' AND jsonb_typeof(p_group_data) = 'array' THEN
        v_current_key := p_base_key || '-core_essentials'; -- e.g. "computer_science-major-core_essentials"

        -- Extract module codes
        SELECT 
            array_agg(DISTINCT
                CASE 
                    WHEN module_obj->>'type' = 'exact' THEN module_obj->>'code'
                    WHEN module_obj->>'type' = 'wildcard' THEN module_obj->>'prefix'
                    WHEN module_obj->>'type' = 'variant' THEN module_obj->>'baseCode'
                    WHEN module_obj->>'type' = 'other' THEN module_obj->>'code'
                    ELSE NULL
                END
            ),
            array_agg(module_obj->>'type')
        INTO v_module_codes, v_module_types
        FROM jsonb_array_elements(p_group_data) AS module_obj
        WHERE module_obj->>'type' IS NOT NULL;

        -- Insert path
        INSERT INTO programme_requirement_paths (
            programme_id, path_key, parent_path_key, depth,
            group_type, raw_tag_name, display_label, logic_type,
            is_leaf, module_codes, module_types, child_count, is_override_source
        ) VALUES (
            p_programme_id, v_current_key, p_parent_key, p_depth,
            'coreEssentials', 'core_essentials', 'Core Essentials', 'LEAF',
            true, v_module_codes, v_module_types, 0, p_is_override_source
        );

        -- Map modules to this path
        INSERT INTO module_path_mappings (programme_id, module_code, path_keys)
        SELECT p_programme_id, unnest(v_module_codes), ARRAY[v_current_key]
        ON CONFLICT (programme_id, module_code) 
        DO UPDATE SET path_keys = array_append(module_path_mappings.path_keys, v_current_key);

        RETURN;
    END IF;

    -- Handle nested requirement groups (non-coreEssentials)
    v_raw_tag_name := COALESCE(
        p_group_data->>'rawTagName', -- Normal case: rawTagName is already snake_case
        LOWER(REGEXP_REPLACE(p_group_type, '([A-Z])', '_\1', 'g')) -- Convert to snake_case
    );
    v_logic_type := COALESCE(p_group_data->>'logic', 'LEAF');
    v_current_key := CASE 
        WHEN p_parent_key IS NULL THEN p_base_key || '-' || v_raw_tag_name
        ELSE p_parent_key || '-' || v_raw_tag_name
    END;

    -- Extract module codes for leaf node (min/max rule)
    v_is_leaf := (p_group_data->>'type' IS NOT NULL AND p_group_data->'modules' IS NOT NULL);
    IF v_is_leaf THEN
        SELECT 
            array_agg(DISTINCT
                CASE 
                    WHEN module_obj->>'type' = 'exact' THEN module_obj->>'code'
                    WHEN module_obj->>'type' = 'wildcard' THEN module_obj->>'prefix'
                    WHEN module_obj->>'type' = 'variant' THEN module_obj->>'baseCode'
                    WHEN module_obj->>'type' = 'other' THEN module_obj->>'code'
                    ELSE NULL
                END
            ),
            array_agg(module_obj->>'type')
        INTO v_module_codes, v_module_types
        FROM jsonb_array_elements(p_group_data->'modules') AS module_obj
        WHERE module_obj->>'type' IS NOT NULL;
    END IF;

    -- Insert current node
    INSERT INTO programme_requirement_paths (
        programme_id, path_key, parent_path_key, depth,
        group_type, raw_tag_name, display_label, logic_type,
        rule_type, rule_value, is_leaf, module_codes, module_types,
        child_count, note, is_override_source
    ) VALUES (
        p_programme_id, v_current_key, p_parent_key, p_depth,
        CASE WHEN p_depth = 0 THEN p_group_type ELSE NULL END, -- only top-level groups (coreEssentials, etc.)
        v_raw_tag_name,
        initcap(replace(v_raw_tag_name, '_', ' ')),
        v_logic_type,
        p_group_data->>'type',
        (p_group_data->>'value')::INTEGER,
        v_is_leaf,
        v_module_codes,
        v_module_types,
        COALESCE(jsonb_array_length(p_group_data->'children'), 0),
        p_group_data->>'note',
        p_is_override_source
    );

    -- Map modules to this path if leaf
    IF v_is_leaf AND v_module_codes IS NOT NULL THEN
        INSERT INTO module_path_mappings (programme_id, module_code, path_keys)
        SELECT p_programme_id, unnest(v_module_codes), ARRAY[v_current_key]
        ON CONFLICT (programme_id, module_code) 
        DO UPDATE SET path_keys = array_append(module_path_mappings.path_keys, v_current_key);
    END IF;

    -- Check if overall:true and mark has_override
    IF p_group_data->'children' IS NOT NULL AND jsonb_array_length(p_group_data->'children') > 0 THEN
        FOR v_child IN SELECT * FROM jsonb_array_elements(p_group_data->'children')
        LOOP
            v_child_is_override := false;

            IF v_child.value @> '{"overall": true}'::jsonb THEN
                v_child_is_override := true;
                v_has_overall_child := true;
            END IF;

            -- Process child recursively
            PERFORM process_requirement_group(
                p_programme_id,
                p_base_key,
                p_group_type,
                v_child.value,
                v_current_key,
                p_depth + 1,
                v_child_is_override
            );             
        END LOOP;

        -- Update parent to mark it has override children
        IF v_has_overall_child THEN
            UPDATE programme_requirement_paths
            SET has_override = true
            WHERE programme_id = p_programme_id 
            AND path_key = v_current_key;
        END IF;      
    END IF;
END;
$$ LANGUAGE plpgsql;