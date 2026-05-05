# Google OAuth & Paginated History Implementation Guide

## Part 1: Supabase Dashboard Setup

### Step 1: Enable Google OAuth Provider

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to configure
5. Toggle **Enable Sign in with Google** to ON
6. You'll need to create a Google OAuth app:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Configure OAuth consent screen if prompted
   - Application type: **Web application**
   - Add authorized redirect URIs:
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**
7. Paste the Client ID and Client Secret into Supabase
8. Click **Save**

### Step 2: Update Database Schema

Run this SQL in Supabase SQL Editor (**Database** → **SQL Editor** → **New Query**):

```sql
-- Add user_id column to image_jobs table
ALTER TABLE image_jobs 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX idx_image_jobs_user_id ON image_jobs(user_id);
CREATE INDEX idx_image_jobs_user_created ON image_jobs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own images
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

-- Optional: Allow anonymous users to create jobs (if you want to support non-logged-in users)
-- CREATE POLICY "Anonymous users can insert"
-- ON image_jobs
-- FOR INSERT
-- WITH CHECK (user_id IS NULL);
```

### Step 3: Configure Redirect URLs

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your local development URL:
   ```
   http://localhost:3001
   ```
3. Add your production URL when you deploy

## Part 2: Environment Variables

Update your `.env.local` file (already exists in your project):

```env
# These should already be set
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Add these for storage buckets (if not already set)
SUPABASE_STORAGE_BUCKET_UPLOADS=fitty-uploads
SUPABASE_STORAGE_BUCKET_OUTPUTS=fitty-outputs
```

## Part 3: Code Implementation

I'll now create the necessary files and update existing ones to implement:
- Google OAuth login/logout
- User profile display
- User-specific image history
- Pagination (10 images at a time with "Load More" button)

The implementation will include:
1. Auth context provider for managing user state
2. Login/Logout components
3. Updated API routes to filter by user
4. Pagination logic in history endpoint
5. Updated UI with "Load More" functionality

## Testing the Implementation

1. Start your dev server: `npm run dev`
2. Open http://localhost:3001
3. Click "Sign in with Google"
4. Authorize the app
5. Upload and convert images
6. Check the history section - you should only see your images
7. After 10 images, a "Load More" button will appear
8. Log out and log in with a different Google account - you'll see different images

## Security Notes

- Row Level Security (RLS) ensures users can only access their own images
- The service role key bypasses RLS, so be careful with admin operations
- Never expose the service role key in client-side code
- All user authentication is handled securely by Supabase

## Optional: Allow Anonymous Users

If you want to allow users to use the app without logging in (but still encourage login for history):
1. Don't require authentication for upload/convert
2. Set `user_id` to NULL for anonymous conversions
3. Only show history for logged-in users
4. Add a policy to allow anonymous inserts (see commented SQL above)
