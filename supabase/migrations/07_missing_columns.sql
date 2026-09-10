-- Migration 07: Add missing columns

-- 1. tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'deneme';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'credit_purchase';

-- 3. attendances check_in_type check constraint
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_check_in_type_check;
ALTER TABLE attendances ADD CONSTRAINT attendances_check_in_type_check CHECK (check_in_type IN ('qr', 'pin', 'checkout'));
