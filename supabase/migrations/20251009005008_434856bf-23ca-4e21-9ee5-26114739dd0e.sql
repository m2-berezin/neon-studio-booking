-- Enable the http extension to allow HTTP requests from database functions
-- This creates the 'net' schema with http_post, http_get, etc.
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant usage on the extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Grant execute on http functions to authenticated users and service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;