# Deployment Guide

## Vercel Deployment

### 1. Environment Variables

Add these to your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pbkpznjgtyzcpuupisz g.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET_UPLOADS=fitty-uploads
SUPABASE_STORAGE_BUCKET_OUTPUTS=fitty-outputs
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

### 2. Supabase Configuration

#### A. Update Site URL
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `https://your-app.vercel.app`

#### B. Add Redirect URLs
Add these URLs to the **Redirect URLs** list:
```
https://your-app.vercel.app
https://your-app.vercel.app/**
http://localhost:3000
http://localhost:3000/**
http://localhost:3001
http://localhost:3001/**
```

### 3. Google OAuth Configuration

The Google OAuth redirect URI should already be configured as:
```
https://pbkpznjgtyzcpuupisz g.supabase.co/auth/v1/callback
```

Verify this in Google Cloud Console → APIs & Services → Credentials.

### 4. Deploy

```bash
git push origin main
```

Vercel will automatically deploy your changes.

### 5. Test

1. Visit your Vercel deployment URL
2. Click "Sign in with Google"
3. You should be redirected back to your app after authentication

## Troubleshooting

### Redirecting to localhost after login

**Problem**: After Google OAuth, you're redirected to `localhost:3000` instead of your Vercel URL.

**Solution**:
1. Update Site URL in Supabase to your Vercel URL
2. Add your Vercel URL to Redirect URLs in Supabase
3. Clear browser cache and cookies
4. Try again

### "Unauthorized" errors

**Problem**: Getting 401 errors when uploading/converting.

**Solution**:
1. Verify all environment variables are set in Vercel
2. Check that Supabase credentials are correct
3. Ensure Google OAuth is properly configured
4. Redeploy after making changes

### Images not loading

**Problem**: Images don't appear in history or previews.

**Solution**:
1. Check that storage buckets exist in Supabase
2. Verify buckets are set to **public**
3. Check bucket names match environment variables

## Production Checklist

- [ ] All environment variables added to Vercel
- [ ] Supabase Site URL updated to production URL
- [ ] Redirect URLs added in Supabase
- [ ] Google OAuth redirect URI verified
- [ ] Storage buckets created and public
- [ ] Database tables and RLS policies created
- [ ] Test sign in with Google
- [ ] Test image upload
- [ ] Test image conversion
- [ ] Test history pagination
- [ ] Test download functionality

## Support

If you encounter issues, check:
1. Vercel deployment logs
2. Supabase logs (Dashboard → Logs)
3. Browser console for errors
4. Network tab for failed requests
