-- Create a function to check application limit
CREATE OR REPLACE FUNCTION check_application_limit()
RETURNS TRIGGER AS $$
DECLARE
    app_count INTEGER;
BEGIN
    -- Count applications for this user in the last 3 months
    SELECT COUNT(*)
    INTO app_count
    FROM applications
    WHERE user_id = NEW.user_id
    AND created_at >= (NOW() - INTERVAL '3 months');

    -- If count is already 2 (or more), raise an exception
    -- Note: We check >= 2 because we are about to insert the 3rd one
    IF app_count >= 2 THEN
        RAISE EXCEPTION 'Application limit reached. You can only submit 2 applications every 3 months.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_application_limit ON applications;

CREATE TRIGGER enforce_application_limit
BEFORE INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION check_application_limit();
