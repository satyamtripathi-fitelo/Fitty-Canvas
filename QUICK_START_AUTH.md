# Quick Start: Google OAuth & User History

This guide will help you set up Google OAuth authentication and user-specific image history with pagination.

## What's Been Implemented

✅ Google OAuth sign-in via Supabase  
✅ User-specific image history (users only see their own images)  
✅ Pagination (10 images per page with "Load More" button)  
✅ Row Level Security (RLS) to protect user data  
✅ Authentication required for upload and convert operations  

## Setup Steps

### 1. Configure Google OAuth in Supabase

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
   - Create a new project or select an existing one
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Configure OAuth consent screen if prompted
   - Application type: **Web application**
   - Add authorized redirect URI:
     ```
     https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
     ```
     (Find your project ref in Supabase Dashboard URL)
   - Copy the **Client ID** and **Client Secret**

2. **Configure in Supabase Dashboard**:
   - Go to your Supabase project: https://supabase.com/dashboard
   - Navigate to **Authentication** → **Providers**
   - Find **Google** and click to configure
   - Toggle **Enable Sign in with Google** to ON
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

3. **Set Redirect URLs**:
   - In Supabase Dashboard → **Authentication** → **URL Configuration**
   - Add your site URLs:
     ```
     http://localhost:3001
     https://your-production-domain.com
     ```

### 2. Run Database Migration

1. Open Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/auth-migration.sql`
4. Click **Run** or press `Cmd/Ctrl + Enter`
5. Verify success (you should see "Success. No rows returned")

### 3. Verify Environment Variables

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Restart Your Dev Server

```bash
npm run dev
```

## Testing the Implementation

1. **Open your app**: http://localhost:3001
2. **Sign in**: Click "Sign in with Google" in the header
3. **Authorize**: Allow the app to access your Google account
4. **Upload an image**: You should now be able to upload
5. **Convert the image**: Apply transformations and convert
6. **Check history**: Scroll down to see your conversion history
7. **Test pagination**: After creating 10+ images, you'll see a "Load More" button
8. **Test isolation**: Sign out and sign in with a different Google account - you'll see different images

## Features Explained

### Authentication Flow
- Users must sign in with Google to upload/convert images
- Session is managed automatically by Supabase
- User info is displayed in the header when logged in

### Image History
- Shows only the current user's images
- Loads 10 images at a time
- "Load More" button appears when there are more images
- Images are sorted by creation date (newest first)
- Each image shows the target ratio and output format

### Security
- **Row Level Security (RLS)**: Database-level security ensures users can only access their own data
- **API Authentication**: All upload/convert endpoints check for valid user session
- **No data leakage**: Even if someone tries to access another user's image URL, RLS prevents it

## Troubleshooting

### "Unauthorized" error when uploading
- Make sure you're signed in (check for "Sign in with Google" button)
- Check browser console for errors
- Verify your Supabase environment variables are correct

### Google OAuth not working
- Verify redirect URI matches exactly in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Make sure Client ID and Secret are correct

### History not showing
- Verify you've run the migration SQL
- Check that RLS policies are created (Supabase Dashboard → Database → Policies)
- Make sure you have at least one completed conversion

### "Bucket not found" error
- Create the storage buckets in Supabase Dashboard → Storage
- Bucket names: `fitty-uploads` and `fitty-outputs`
- Make sure both buckets are set to **public**

## Optional: Allow Anonymous Users

If you want to allow users to try the app without signing in (but still encourage login for history):

1. Remove authentication checks from `app/api/upload/route.ts` and `app/api/convert/route.ts`
2. Set `user_id` to `null` for anonymous conversions
3. Only show history for logged-in users (already implemented)
4. Add this policy to allow anonymous inserts:

```sql
CREATE POLICY "Anonymous users can insert"
ON image_jobs
FOR INSERT
WITH CHECK (user_id IS NULL);
```

## Next Steps

- **Customize the UI**: Update colors, fonts, and layout in `app/globals.css`
- **Add more OAuth providers**: Enable GitHub, Facebook, etc. in Supabase
- **Email notifications**: Set up email templates in Supabase for password resets
- **User profiles**: Add a profile page to manage user settings
- **Image deletion**: Add ability for users to delete their own images

## Need Help?

- Supabase Docs: https://supabase.com/docs/guides/auth
- Google OAuth Setup: https://supabase.com/docs/guides/auth/social-login/auth-google
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
