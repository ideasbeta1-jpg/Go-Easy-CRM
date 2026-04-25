-- Add source and UTM tracking columns to leads table
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source       text,
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term     text,
  ADD COLUMN IF NOT EXISTS utm_content  text;
