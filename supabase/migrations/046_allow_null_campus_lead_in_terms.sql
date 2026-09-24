-- ============================================================================
-- Migration: 046_allow_null_campus_lead_in_terms.sql
-- Description: Allow campus_lead_id in public.terms to be nullable so an active
--              term can remain in place with a vacant Campus Lead position when
--              a lead is demoted or removed from HQ User Control.
-- ============================================================================

ALTER TABLE public.terms ALTER COLUMN campus_lead_id DROP NOT NULL;
