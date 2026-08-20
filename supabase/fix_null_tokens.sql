-- Fix for "converting NULL to string is unsupported" error
-- Supabase Auth expects these tokens to be empty strings, not NULL

UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;

UPDATE auth.users
SET recovery_token = ''
WHERE recovery_token IS NULL;

UPDATE auth.users
SET email_change_token_new = ''
WHERE email_change_token_new IS NULL;

UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;