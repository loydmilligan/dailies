-- Initialize Dailies database
-- This script will be run when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE dailies TO dailies_user;

-- Import the complete schema
\i /docker-entrypoint-initdb.d/schema.sql