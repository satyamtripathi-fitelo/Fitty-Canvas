# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Header     │    │   Upload     │    │   History    │    │
│  │              │    │   Section    │    │   Section    │    │
│  │ [AuthButton] │    │              │    │              │    │
│  │ [Dark Mode]  │    │ [Uploader]   │    │ [Grid View]  │    │
│  └──────────────┘    │ [Settings]   │    │ [Load More]  │    │
│                      │ [Convert]    │    └──────────────┘    │
│                      └──────────────┘                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AuthContext (useAuth hook)                  │  │
│  │  - user: User | null                                     │  │
│  │  - session: Session | null                               │  │
│  │  - signInWithGoogle()                                    │  │
│  │  - signOut()                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/upload          POST /api/convert                   │
│  ┌──────────────────┐     ┌──────────────────┐                │
│  │ 1. Check auth    │     │ 1. Check auth    │                │
│  │ 2. Upload file   │     │ 2. Load image    │                │
│  │ 3. Create job    │     │ 3. Resize/AI     │                │
│  │ 4. Set user_id   │     │ 4. Save output   │                │
│  └──────────────────┘     │ 5. Update job    │                │
│                           └──────────────────┘                │
│                                                                 │
│  GET /api/history                                              │
│  ┌──────────────────────────────────────────┐                 │
│  │ 1. Check auth (get user_id)              │                 │
│  │ 2. Query: WHERE user_id = current_user   │                 │
│  │ 3. Apply pagination (LIMIT/OFFSET)       │                 │
│  │ 4. Return jobs + metadata                │                 │
│  └──────────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase Backend                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  Authentication                        │   │
│  │  ┌──────────────────────────────────────────────┐     │   │
│  │  │  Google OAuth Provider                       │     │   │
│  │  │  - Client ID / Secret                        │     │   │
│  │  │  - Redirect URLs                             │     │   │
│  │  │  - Session Management                        │     │   │
│  │  └──────────────────────────────────────────────┘     │   │
│  │                                                        │   │
│  │  auth.users table                                     │   │
│  │  ┌────────────────────────────────────────────┐       │   │
│  │  │ id (uuid)                                  │       │   │
│  │  │ email                                      │       │   │
│  │  │ user_metadata (name, avatar, etc.)         │       │   │
│  │  │ created_at                                 │       │   │
│  │  └────────────────────────────────────────────┘       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                     Database                           │   │
│  │                                                        │   │
│  │  image_jobs table                                     │   │
│  │  ┌────────────────────────────────────────────┐       │   │
│  │  │ id (uuid, primary key)                     │       │   │
│  │  │ user_id (uuid, foreign key) ◄──────────────┼───┐   │   │
│  │  │ original_url                               │   │   │   │
│  │  │ output_url                                 │   │   │   │
│  │  │ original_width, original_height            │   │   │   │
│  │  │ target_width, target_height                │   │   │   │
│  │  │ target_ratio                               │   │   │   │
│  │  │ prompt                                     │   │   │   │
│  │  │ output_format                              │   │   │   │
│  │  │ status                                     │   │   │   │
│  │  │ created_at                                 │   │   │   │
│  │  └────────────────────────────────────────────┘   │   │   │
│  │                                                    │   │   │
│  │  Row Level Security (RLS) Policies                │   │   │
│  │  ┌────────────────────────────────────────────┐   │   │   │
│  │  │ SELECT: WHERE auth.uid() = user_id         │───┘   │   │
│  │  │ INSERT: WITH CHECK auth.uid() = user_id    │       │   │
│  │  │ UPDATE: WHERE auth.uid() = user_id         │       │   │
│  │  │ DELETE: WHERE auth.uid() = user_id         │       │   │
│  │  └────────────────────────────────────────────┘       │   │
│  │                                                        │   │
│  │  Indexes for Performance                              │   │
│  │  - idx_image_jobs_user_id                             │   │
│  │  - idx_image_jobs_user_created (user_id, created_at)  │   │
│  │  - idx_image_jobs_status                              │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                      Storage                           │   │
│  │                                                        │   │
│  │  fitty-uploads bucket (public)                        │   │
│  │  ┌────────────────────────────────────────────┐       │   │
│  │  │ Original uploaded images                   │       │   │
│  │  │ - uuid.jpg, uuid.png, etc.                 │       │   │
│  │  └────────────────────────────────────────────┘       │   │
│  │                                                        │   │
│  │  fitty-outputs bucket (public)                        │   │
│  │  ┌────────────────────────────────────────────┐       │   │
│  │  │ Converted/processed images                 │       │   │
│  │  │ - uuid.jpg, uuid.png, etc.                 │       │   │
│  │  └────────────────────────────────────────────┘       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OAuth Flow
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Google OAuth                               │
├─────────────────────────────────────────────────────────────────┤
│  - Consent Screen                                              │
│  - User Authorization                                          │
│  - Token Exchange                                              │
│  - User Profile Data                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐                                                    
│  User    │                                                    
└────┬─────┘                                                    
     │                                                          
     │ 1. Click "Sign in with Google"                          
     ▼                                                          
┌─────────────────┐                                            
│  AuthButton     │                                            
│  Component      │                                            
└────┬────────────┘                                            
     │                                                          
     │ 2. Call signInWithGoogle()                              
     ▼                                                          
┌─────────────────┐                                            
│  AuthContext    │                                            
│  (useAuth)      │                                            
└────┬────────────┘                                            
     │                                                          
     │ 3. supabase.auth.signInWithOAuth({ provider: 'google' })
     ▼                                                          
┌─────────────────┐                                            
│  Supabase       │                                            
│  Auth Client    │                                            
└────┬────────────┘                                            
     │                                                          
     │ 4. Redirect to Google OAuth                             
     ▼                                                          
┌─────────────────┐                                            
│  Google         │                                            
│  Consent Screen │                                            
└────┬────────────┘                                            
     │                                                          
     │ 5. User authorizes                                      
     ▼                                                          
┌─────────────────┐                                            
│  Google         │                                            
│  Returns token  │                                            
└────┬────────────┘                                            
     │                                                          
     │ 6. Redirect to callback URL                             
     ▼                                                          
┌─────────────────┐                                            
│  Supabase       │                                            
│  Auth Callback  │                                            
└────┬────────────┘                                            
     │                                                          
     │ 7. Create/update user session                           
     ▼                                                          
┌─────────────────┐                                            
│  Supabase       │                                            
│  Sets cookie    │                                            
└────┬────────────┘                                            
     │                                                          
     │ 8. Redirect back to app                                 
     ▼                                                          
┌─────────────────┐                                            
│  App Homepage   │                                            
└────┬────────────┘                                            
     │                                                          
     │ 9. AuthContext detects session                          
     ▼                                                          
┌─────────────────┐                                            
│  UI Updates     │                                            
│  - Show user    │                                            
│  - Load history │                                            
└─────────────────┘                                            
```

## Data Flow: Upload & Convert

```
┌──────────┐                                                    
│  User    │                                                    
└────┬─────┘                                                    
     │                                                          
     │ 1. Upload image file                                    
     ▼                                                          
┌─────────────────┐                                            
│  ImageUploader  │                                            
│  Component      │                                            
└────┬────────────┘                                            
     │                                                          
     │ 2. POST /api/upload                                     
     ▼                                                          
┌─────────────────┐                                            
│  Upload API     │                                            
│  Route          │                                            
└────┬────────────┘                                            
     │                                                          
     │ 3. Check auth.getSession()                              
     ├─── ❌ No session → Return 401                           
     │                                                          
     │ 4. ✅ Has session                                       
     ▼                                                          
┌─────────────────┐                                            
│  Upload to      │                                            
│  Storage        │                                            
└────┬────────────┘                                            
     │                                                          
     │ 5. Create image_jobs record                             
     │    WITH user_id = session.user.id                       
     ▼                                                          
┌─────────────────┐                                            
│  Database       │                                            
│  (RLS checks    │                                            
│   user_id)      │                                            
└────┬────────────┘                                            
     │                                                          
     │ 6. Return job info                                      
     ▼                                                          
┌─────────────────┐                                            
│  User sees      │                                            
│  uploaded image │                                            
└────┬────────────┘                                            
     │                                                          
     │ 7. Click "Convert Image"                                
     ▼                                                          
┌─────────────────┐                                            
│  POST /api/     │                                            
│  convert        │                                            
└────┬────────────┘                                            
     │                                                          
     │ 8. Check auth.getSession()                              
     ├─── ❌ No session → Return 401                           
     │                                                          
     │ 9. ✅ Has session                                       
     ▼                                                          
┌─────────────────┐                                            
│  Process image  │                                            
│  (resize/AI)    │                                            
└────┬────────────┘                                            
     │                                                          
     │ 10. Upload to outputs bucket                            
     ▼                                                          
┌─────────────────┐                                            
│  Update job     │                                            
│  status = done  │                                            
│  output_url     │                                            
└────┬────────────┘                                            
     │                                                          
     │ 11. Return output URL                                   
     ▼                                                          
┌─────────────────┐                                            
│  User sees      │                                            
│  converted      │                                            
│  image          │                                            
└─────────────────┘                                            
```

## Data Flow: History with Pagination

```
┌──────────┐                                                    
│  User    │                                                    
│  (logged │                                                    
│   in)    │                                                    
└────┬─────┘                                                    
     │                                                          
     │ 1. Page loads / User signs in                           
     ▼                                                          
┌─────────────────┐                                            
│  useEffect      │                                            
│  triggers       │                                            
└────┬────────────┘                                            
     │                                                          
     │ 2. GET /api/history?page=1&limit=10                     
     ▼                                                          
┌─────────────────┐                                            
│  History API    │                                            
│  Route          │                                            
└────┬────────────┘                                            
     │                                                          
     │ 3. Check auth.getSession()                              
     ├─── ❌ No session → Return 401                           
     │                                                          
     │ 4. ✅ Has session (user_id = abc123)                    
     ▼                                                          
┌─────────────────┐                                            
│  Query DB:      │                                            
│  SELECT *       │                                            
│  FROM jobs      │                                            
│  WHERE          │                                            
│   user_id =     │                                            
│   'abc123'      │                                            
│  ORDER BY       │                                            
│   created_at    │                                            
│   DESC          │                                            
│  LIMIT 10       │                                            
│  OFFSET 0       │                                            
└────┬────────────┘                                            
     │                                                          
     │ 5. RLS Policy checks:                                   
     │    auth.uid() = user_id ✅                              
     ▼                                                          
┌─────────────────┐                                            
│  Return:        │                                            
│  {              │                                            
│   jobs: [...]   │  (10 items)                                
│   total: 25     │                                            
│   page: 1       │                                            
│   limit: 10     │                                            
│   hasMore: true │  (25 > 10)                                 
│  }              │                                            
└────┬────────────┘                                            
     │                                                          
     │ 6. Display first 10 images                              
     │    Show "Load More" button                              
     ▼                                                          
┌─────────────────┐                                            
│  User clicks    │                                            
│  "Load More"    │                                            
└────┬────────────┘                                            
     │                                                          
     │ 7. GET /api/history?page=2&limit=10                     
     ▼                                                          
┌─────────────────┐                                            
│  Query DB:      │                                            
│  ... same ...   │                                            
│  LIMIT 10       │                                            
│  OFFSET 10      │  (skip first 10)                           
└────┬────────────┘                                            
     │                                                          
     │ 8. Return next 10 images                                
     ▼                                                          
┌─────────────────┐                                            
│  Append to      │                                            
│  existing list  │                                            
│  (now 20 total) │                                            
└────┬────────────┘                                            
     │                                                          
     │ 9. hasMore: true (25 > 20)                              
     │    Show "Load More" again                               
     ▼                                                          
┌─────────────────┐                                            
│  User clicks    │                                            
│  "Load More"    │                                            
│  again          │                                            
└────┬────────────┘                                            
     │                                                          
     │ 10. GET /api/history?page=3&limit=10                    
     ▼                                                          
┌─────────────────┐                                            
│  Return last    │                                            
│  5 images       │                                            
│  hasMore: false │  (25 = 25)                                 
└────┬────────────┘                                            
     │                                                          
     │ 11. Hide "Load More" button                             
     ▼                                                          
┌─────────────────┐                                            
│  All 25 images  │                                            
│  displayed      │                                            
└─────────────────┘                                            
```

## Security: Row Level Security (RLS)

```
┌─────────────────────────────────────────────────────────┐
│                    Database Query                       │
│                                                         │
│  User A (id: aaa-111) tries to:                        │
│  SELECT * FROM image_jobs WHERE user_id = 'bbb-222'    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              RLS Policy Evaluation                      │
│                                                         │
│  Policy: "Users can view own images"                   │
│  Condition: auth.uid() = user_id                       │
│                                                         │
│  Check: auth.uid() = 'aaa-111'                         │
│         user_id in query = 'bbb-222'                   │
│                                                         │
│  Result: 'aaa-111' ≠ 'bbb-222' ❌                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Query Result                           │
│                                                         │
│  Return: [] (empty array)                              │
│  User A cannot see User B's images                     │
│                                                         │
│  Even if User A knows the image URL, they cannot       │
│  access it through the database                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Database Query                       │
│                                                         │
│  User A (id: aaa-111) tries to:                        │
│  SELECT * FROM image_jobs WHERE user_id = 'aaa-111'    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              RLS Policy Evaluation                      │
│                                                         │
│  Policy: "Users can view own images"                   │
│  Condition: auth.uid() = user_id                       │
│                                                         │
│  Check: auth.uid() = 'aaa-111'                         │
│         user_id in query = 'aaa-111'                   │
│                                                         │
│  Result: 'aaa-111' = 'aaa-111' ✅                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Query Result                           │
│                                                         │
│  Return: [image1, image2, image3, ...]                 │
│  User A can see their own images                       │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App (layout.tsx)
└── AuthProvider
    └── Page (page.tsx)
        ├── Header
        │   ├── FittyCanvasLogo
        │   ├── Navigation
        │   ├── AuthButton ◄── useAuth()
        │   └── DarkModeToggle
        │
        ├── Main Content
        │   ├── ImagePreviewPanel (Original)
        │   ├── ImagePreviewPanel (Converted)
        │   │
        │   ├── Upload Section
        │   │   └── ImageUploader
        │   │
        │   └── Settings Sidebar
        │       ├── RatioSelector
        │       ├── PromptInput
        │       ├── FormatSelector
        │       ├── ConvertButton
        │       ├── DownloadButton
        │       └── ResetButton
        │
        └── History Section ◄── useAuth()
            ├── If not logged in: Sign-in prompt
            ├── If logged in:
            │   ├── Image Grid
            │   └── Load More Button
            └── If no images: Empty state
```

## Key Files and Their Roles

```
lib/auth-context.tsx
├── Creates React Context for auth state
├── Manages user session
├── Provides signInWithGoogle() and signOut()
└── Used by: All components that need auth

components/AuthButton.tsx
├── Displays sign-in/sign-out button
├── Shows user profile when logged in
└── Uses: useAuth() hook

app/layout.tsx
├── Wraps entire app with AuthProvider
└── Makes auth available everywhere

app/page.tsx
├── Main application UI
├── Uses useAuth() to get user state
├── Conditionally renders based on auth
└── Manages history pagination

app/api/upload/route.ts
├── Checks authentication
├── Associates uploads with user_id
└── Returns 401 if not authenticated

app/api/convert/route.ts
├── Checks authentication
├── Processes images for authenticated users
└── Returns 401 if not authenticated

app/api/history/route.ts
├── Checks authentication
├── Filters by user_id
├── Implements pagination
└── Returns user-specific images only

supabase/auth-migration.sql
├── Adds user_id column
├── Creates indexes
├── Enables RLS
└── Creates security policies
```
