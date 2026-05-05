-- Migration to add user authentication and Row Level Security
-- Run this in Supabase SQL Editor after enabling Google OAuth

-- Step 1: Add user_id column to image_jobs table
ALTER TABLE image_jobs 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_id ON image_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_jobs_user_created ON image_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON image_jobs(status);

-- Step 3: Enable Row Level Security
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view own images" ON image_jobs;
DROP POLICY IF EXISTS "Users can insert own images" ON image_jobs;
DROP POLICY IF EXISTS "Users can update own images" ON image_jobs;
DROP POLICY IF EXISTS "Users can delete own images" ON image_jobs;

-- Step 5: Create RLS policies

-- Policy: Users can only view their own images
CREATE POLICY "Users can view own images"
ON image_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own images
CREATE POLICY "Users can insert own images"
ON image_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own images
CREATE POLICY "Users can update own images"
ON image_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own images (optional)
CREATE POLICY "Users can delete own images"
ON image_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- Step 6: Optional - If you want to migrate existing anonymous data to a test user
-- Uncomment and replace 'YOUR_USER_ID' with an actual user ID from auth.users
-- UPDATE image_jobs 
-- SET user_id = 'YOUR_USER_ID'
-- WHERE user_id IS NULL;

-- Verification queries (run these to check your setup)
-- SELECT COUNT(*) as total_jobs, user_id FROM image_jobs GROUP BY user_id;
-- SELECT * FROM image_jobs WHERE user_id IS NULL; -- Should be empty after migration
