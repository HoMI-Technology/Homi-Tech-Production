-- =============================================================================
-- 00001_enums.sql — HōMI enum types
-- Idempotent: safe to re-run against an existing database.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'partner', 'employee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'plus', 'pro', 'family');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM ('in_progress', 'completed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verdict_type AS ENUM ('READY', 'ALMOST_THERE', 'BUILD_FIRST', 'NOT_YET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dimension_type AS ENUM ('financial', 'emotional', 'timing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE org_kind AS ENUM ('employer', 'partner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
