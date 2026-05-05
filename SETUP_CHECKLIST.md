# Setup Checklist ✓

Follow these steps in order to enable Google OAuth and user-specific history.

## ☐ Step 1: Google Cloud Console Setup (5 minutes)

1. ☐ Go to https://console.cloud.google.com/
2. ☐ Create a new project or select existing one
3. ☐ Navigate to **APIs & Services** → **Credentials**
4. ☐ Click **Create Credentials** → **OAuth 2.0 Client ID**
5. ☐ Configure OAuth consent screen (if prompted):
   - ☐ User Type: External
   - ☐ App name: Fitty Canvas (or your app name)
   - ☐ User support email: your email
   - ☐ Developer contact: your email
   - ☐ Click Save and Continue
6. ☐ Create OAuth Client ID:
   - ☐ Application type: **Web application**
   - ☐ Name: Fitty Canvas Web Client
   - ☐ Authorized redirect URIs: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
     - Find your project ref in your Supabase Dashboard URL
     - Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   - ☐ Click **Create**
7. ☐ **Copy the Client ID** (save it somewhere)
8. ☐ **Copy the Client Secret** (save it somewhere)

## ☐ Step 2: Supabase Authentication Setup (3 minutes)

1. ☐ Go to https://supabase.com/dashboard
2. ☐ Select your project
3. ☐ Navigate to **Authentication** → **Providers**
4. ☐ Find **Google** in the list
5. ☐ Click to expand Google settings
6. ☐ Toggle **Enable Sign in with Google** to ON
7. ☐ Paste your **Client ID** from Step 1
8. ☐ Paste your **Client Secret** from Step 1
9. ☐ Click **Save**

## ☐ Step 3: Configure Redirect URLs (1 minute)

1. ☐ In Supabase Dashboard → **Authentication** → **URL Configuration**
2. ☐ Under **Site URL**, add: `http://localhost:3001`
3. ☐ Under **Redirect URLs**, add:
   - ☐ `http://localhost:3001`
   - ☐ `http://localhost:3001/**` (with wildcard)
4. ☐ If you have a production URL, add it too
5. ☐ Click **Save**

## ☐ Step 4: Run Database Migration (2 minutes)

1. ☐ In Supabase Dashboard → **SQL Editor**
2. ☐ Click **New Query**
3. ☐ Open the file `supabase/auth-migration.sql` in your code editor
4. ☐ Copy all the SQL code
5. ☐ Paste it into the Supabase SQL Editor
6. ☐ Click **Run** (or press Cmd/Ctrl + Enter)
7. ☐ Verify you see "Success. No rows returned"

## ☐ Step 5: Verify Storage Buckets (1 minute)

1. ☐ In Supabase Dashboard → **Storage**
2. ☐ Check if these buckets exist:
   - ☐ `fitty-uploads`
   - ☐ `fitty-outputs`
3. ☐ If they don't exist, create them:
   - ☐ Click **New bucket**
   - ☐ Name: `fitty-uploads`
   - ☐ Public bucket: **ON**
   - ☐ Click **Create bucket**
   - ☐ Repeat for `fitty-outputs`

## ☐ Step 6: Verify Environment Variables (1 minute)

1. ☐ Open `.env.local` in your code editor
2. ☐ Verify these variables exist and have values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
3. ☐ If any are missing, get them from Supabase Dashboard → **Settings** → **API**

## ☐ Step 7: Restart Development Server (1 minute)

1. ☐ Stop your current dev server (Ctrl+C in terminal)
2. ☐ Run: `npm run dev`
3. ☐ Wait for "Ready in X ms" message
4. ☐ Note the port (should be 3001 or 3000)

## ☐ Step 8: Test the Implementation (5 minutes)

### Test Authentication
1. ☐ Open http://localhost:3001 in your browser
2. ☐ Click **"Sign in with Google"** button in the header
3. ☐ Select your Google account
4. ☐ Authorize the app
5. ☐ Verify you're redirected back to the app
6. ☐ Verify your name/email appears in the header

### Test Image Upload
7. ☐ Upload an image (drag & drop or click to browse)
8. ☐ Verify upload completes successfully
9. ☐ Verify image preview appears

### Test Image Conversion
10. ☐ Select a ratio (e.g., "16:9")
11. ☐ Optionally add a prompt
12. ☐ Click **"Convert Image"**
13. ☐ Wait for conversion to complete
14. ☐ Verify converted image appears on the right

### Test History
15. ☐ Scroll down to the **"Your History"** section
16. ☐ Verify your converted image appears
17. ☐ Click on the image thumbnail
18. ☐ Verify it opens in a new tab

### Test Pagination (if you have 10+ images)
19. ☐ Convert at least 10 images
20. ☐ Verify **"Load More"** button appears
21. ☐ Click **"Load More"**
22. ☐ Verify more images load

### Test User Isolation
23. ☐ Click **"Sign Out"**
24. ☐ Sign in with a different Google account
25. ☐ Verify history is empty (or shows different images)
26. ☐ Upload and convert an image
27. ☐ Verify only this account's images appear in history

## ☐ Step 9: Verify Security (2 minutes)

1. ☐ In Supabase Dashboard → **Database** → **Tables**
2. ☐ Click on `image_jobs` table
3. ☐ Click **Policies** tab
4. ☐ Verify these policies exist:
   - ☐ "Users can view own images"
   - ☐ "Users can insert own images"
   - ☐ "Users can update own images"
5. ☐ All policies should show status: **Enabled**

## ☐ Step 10: Production Deployment (when ready)

When you're ready to deploy to production:

1. ☐ Add your production domain to Google Cloud Console:
   - ☐ Go to Google Cloud Console → Credentials
   - ☐ Edit your OAuth Client ID
   - ☐ Add authorized redirect URI: `https://your-domain.com/auth/callback`
   
2. ☐ Add your production domain to Supabase:
   - ☐ Supabase Dashboard → Authentication → URL Configuration
   - ☐ Add your production URL to Site URL and Redirect URLs

3. ☐ Update environment variables in your hosting platform
   - ☐ Add all variables from `.env.local`

4. ☐ Deploy your app

5. ☐ Test authentication on production

## Troubleshooting

### ❌ "Unauthorized" error when uploading
- ☐ Make sure you're signed in
- ☐ Check browser console for errors
- ☐ Verify environment variables are correct
- ☐ Try signing out and signing in again

### ❌ Google OAuth not working
- ☐ Verify redirect URI matches exactly (check for typos)
- ☐ Make sure Google provider is enabled in Supabase
- ☐ Check Client ID and Secret are correct
- ☐ Try clearing browser cookies and cache

### ❌ History not showing
- ☐ Verify you ran the migration SQL
- ☐ Check RLS policies exist in Supabase
- ☐ Make sure you have at least one completed conversion
- ☐ Check browser console for API errors

### ❌ "Bucket not found" error
- ☐ Create buckets in Supabase Dashboard → Storage
- ☐ Make sure bucket names match: `fitty-uploads` and `fitty-outputs`
- ☐ Verify buckets are set to **public**

### ❌ Database errors
- ☐ Check Supabase Dashboard → Logs for error details
- ☐ Verify migration SQL ran successfully
- ☐ Check that `user_id` column exists in `image_jobs` table

## 🎉 Success!

If all checkboxes are checked and tests pass, you're done! Your app now has:
- ✅ Google OAuth authentication
- ✅ User-specific image history
- ✅ Pagination (10 images per page)
- ✅ Row Level Security
- ✅ Production-ready security

## Need More Help?

- 📖 Read **QUICK_START_AUTH.md** for detailed explanations
- 📖 Read **IMPLEMENTATION_SUMMARY.md** to understand what changed
- 📖 Read **GOOGLE_OAUTH_SETUP.md** for in-depth setup guide
- 🔗 Supabase Docs: https://supabase.com/docs/guides/auth
- 🔗 Google OAuth Guide: https://supabase.com/docs/guides/auth/social-login/auth-google

---

**Estimated Total Time: 20-25 minutes**
