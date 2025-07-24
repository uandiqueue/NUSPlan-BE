-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_programmes_updated_at 
    BEFORE UPDATE ON programmes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();