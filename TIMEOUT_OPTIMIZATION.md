# Timeout Optimization Guide

## 504 Gateway Timeout Error - Causes and Solutions

### Problem
Getting 504 errors when using Gemini for image generation means the request is exceeding Vercel's serverless function timeout limits.

---

## Vercel Timeout Limits

| Plan | Timeout Limit |
|------|---------------|
| Hobby (Free) | **10 seconds** |
| Pro | 60 seconds (configurable up to 300s) |
| Enterprise | Custom |

**Current Setting**: `maxDuration = 60` (requires Pro plan)

---

## Solutions Implemented

### 1. ✅ Switched to Faster Model
**Changed default from**: `gemini-3.1-flash-image-preview`  
**Changed default to**: `gemini-2.5-flash-image` (faster, lower latency)

```env
# Use faster model (default)
GEMINI_MODEL=gemini-2.5-flash-image

# Or use higher quality model (slower)
GEMINI_MODEL=gemini-3.1-flash-image-preview
```

### 2. ✅ Image Size Optimization
- Automatically limits processing to 2K resolution (2048px max dimension)
- Larger images are downscaled for AI processing
- Result is upscaled back to target size using Sharp (fast)

**Example**:
- Request: 4096x4096 image
- Process: 2048x2048 with AI (faster)
- Upscale: 4096x4096 with Sharp (instant)

### 3. ✅ Timeout Handler
- Added 50-second timeout for AI generation
- Automatic fallback to Sharp-only resize if timeout occurs
- User still gets a result (without AI enhancement)

### 4. ✅ Better Error Messages
- Clear indication when timeout occurs
- Suggests using smaller images or Sharp-only mode
- Logs show exactly where the timeout happened

---

## Recommended Configurations

### For Vercel Hobby (Free) Plan

**Option A: Use Sharp-Only Mode**
```typescript
// Don't add prompts, just resize
// This uses Sharp directly (instant, no AI)
{
  targetWidth: 1920,
  targetHeight: 1080,
  outputFormat: "jpg",
  // No prompt = no AI = fast
}
```

**Option B: Use Smaller Images**
```typescript
// Keep images under 1024x1024 for faster AI processing
{
  targetWidth: 1024,
  targetHeight: 1024,
  prompt: "Your prompt here",
  aiModel: "gemini"
}
```

**Option C: Upgrade to Vercel Pro**
- $20/month
- 60-second timeout (configurable up to 300s)
- Better for AI-heavy workloads

### For Vercel Pro Plan

**Optimal Settings**:
```typescript
// In app/api/convert/route.ts
export const maxDuration = 60; // or up to 300

// In .env.local
GEMINI_MODEL=gemini-3.1-flash-image-preview  // Higher quality
```

---

## Performance Benchmarks

### Gemini 2.5 Flash Image (Fast)
- 1024x1024: ~5-10 seconds
- 2048x2048: ~10-20 seconds
- 4096x4096: ~20-40 seconds (with optimization)

### Gemini 3.1 Flash Image Preview (Quality)
- 1024x1024: ~10-15 seconds
- 2048x2048: ~20-30 seconds
- 4096x4096: ~40-60 seconds (with optimization)

### Sharp-Only (No AI)
- Any size: <1 second

---

## Troubleshooting

### Still Getting 504 Errors?

**1. Check Your Vercel Plan**
```bash
# In Vercel dashboard, check your plan
# Hobby plan = 10s limit (too short for AI)
# Pro plan = 60s+ limit (works for AI)
```

**2. Reduce Image Size**
```typescript
// Try smaller target dimensions
targetWidth: 1024,  // Instead of 4096
targetHeight: 1024  // Instead of 4096
```

**3. Use Faster Model**
```env
GEMINI_MODEL=gemini-2.5-flash-image
```

**4. Remove Prompt for Simple Resizes**
```typescript
// If you just need to resize without AI enhancement
{
  targetWidth: 1920,
  targetHeight: 1080,
  // No prompt = uses Sharp only = instant
}
```

**5. Check API Response Time**
```bash
# Check Vercel logs for timing
# Look for: gemini:generate:start and gemini:generate:success
# Time difference shows how long Gemini took
```

---

## Code Changes Made

### 1. Faster Default Model
```typescript
// lib/gemini.ts
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-image"; // Changed from 3.1
```

### 2. Size Optimization
```typescript
// app/api/convert/route.ts - resizeWithGemini()
const maxDimension = 2048;
if (targetWidth > maxDimension || targetHeight > maxDimension) {
  // Downscale for AI processing
  // Upscale result with Sharp
}
```

### 3. Timeout Handler
```typescript
// app/api/convert/route.ts
const timeoutMs = 50000; // 50 seconds
resized = await Promise.race([
  resizeWithAI(...),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout")), timeoutMs)
  )
]);
```

---

## Alternative Solutions

### Option 1: Use Background Jobs
For very large images or complex prompts:
1. Accept the request immediately
2. Process in background
3. Notify user when complete (webhook/polling)

### Option 2: Use Edge Runtime
```typescript
export const runtime = "edge"; // Instead of "nodejs"
```
- Faster cold starts
- But limited to 30s on Hobby, 60s on Pro

### Option 3: Use OpenAI Instead
OpenAI gpt-image-2 might be faster for some operations:
```typescript
aiModel: "openai" // Instead of "gemini"
```

---

## Monitoring

### Check Logs in Vercel
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs"
4. Look for:
   - `gemini:generate:start` - When AI starts
   - `gemini:generate:success` - When AI completes
   - `gemini:generate:error` - If AI fails
   - `fallback:sharp-resize` - If using fallback

### Example Log Output
```
[INFO] gemini:generate:start { model: 'gemini-2.5-flash-image', targetWidth: 1024, targetHeight: 1024 }
[INFO] gemini:generate:success { outputBytes: 245678 }
[INFO] request:success { jobId: 'abc123', width: 1024, height: 1024 }
```

---

## Summary

**Immediate Actions**:
1. ✅ Switched to faster Gemini 2.5 Flash Image model
2. ✅ Added automatic size optimization (2K limit)
3. ✅ Added 50-second timeout with fallback
4. ✅ Better error messages

**If Still Having Issues**:
1. Upgrade to Vercel Pro ($20/month)
2. Use smaller image sizes (<1024px)
3. Remove prompts for simple resizes
4. Try OpenAI model instead

**Best Practice**:
- For production with AI features: **Vercel Pro plan required**
- For simple resizing: **Hobby plan works fine** (uses Sharp only)
