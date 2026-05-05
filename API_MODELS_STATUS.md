# AI Models Implementation Status

## ✅ Implemented Models

### 1. Google Gemini 3.1 Flash Image Preview (Default)
**Model ID**: `gemini-3.1-flash-image-preview`  
**Status**: ✅ Fully Implemented  
**Released**: 2026  
**Capabilities**:
- Native image generation and editing
- Up to 4K resolution (512, 1K, 2K, 4K)
- Advanced text rendering
- Grounding with Google Search
- Thinking mode for complex prompts
- Up to 14 reference images
- Multiple aspect ratios (1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9)

**Configuration**:
```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-image-preview  # Optional, this is the default
```

**Alternative Models**:
- `gemini-3-pro-image-preview` - Professional asset production with advanced reasoning
- `gemini-2.5-flash-image` - Speed and efficiency optimized

**Implementation**: `lib/gemini.ts`

---

### 2. OpenAI gpt-image-2 (ChatGPT Images 2.0)
**Model ID**: `gpt-image-2`  
**Status**: ✅ Fully Implemented  
**Released**: April 21, 2026  
**Replaces**: DALL-E 3 (deprecated May 12, 2026)

**Capabilities**:
- Native reasoning for image generation
- 2K resolution output (1024x1024, 1024x1792, 1792x1024, 2048x2048, 2048x1536, 1536x2048)
- Multi-image consistency
- Improved text rendering in 12+ languages
- Image editing capabilities
- Web search integration

**Configuration**:
```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-image-2  # Optional, this is the default
```

**Alternative Models**:
- `gpt-5.4-image-2` - Combined with GPT-5.4 reasoning (if available)

**Implementation**: `lib/openai.ts`

---

## API Endpoints

### POST /api/convert
Converts and resizes images using AI models.

**Request Body**:
```json
{
  "jobId": "optional-job-id",
  "imageUrl": "https://storage.url/image.jpg",
  "targetRatio": "16:9",
  "targetWidth": 1920,
  "targetHeight": 1080,
  "prompt": "Optional AI enhancement prompt",
  "outputFormat": "jpg",
  "quality": 100,
  "aiModel": "gemini"  // or "openai"
}
```

**Response**:
```json
{
  "outputUrl": "https://storage.url/converted.jpg",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "jobId": "job-id"
}
```

---

## Testing the APIs

### Test Gemini API
```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "imageUrl": "https://your-image-url.jpg",
    "targetWidth": 1024,
    "targetHeight": 1024,
    "targetRatio": "1:1",
    "outputFormat": "jpg",
    "quality": 100,
    "aiModel": "gemini",
    "prompt": "Enhance this image"
  }'
```

### Test OpenAI API
```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "imageUrl": "https://your-image-url.jpg",
    "targetWidth": 1024,
    "targetHeight": 1024,
    "targetRatio": "1:1",
    "outputFormat": "jpg",
    "quality": 100,
    "aiModel": "openai",
    "prompt": "Enhance this image"
  }'
```

---

## Model Selection in UI

The `ModelSelector` component allows users to toggle between Gemini and OpenAI:

```tsx
<ModelSelector 
  model={aiModel} 
  onModelChange={setAiModel} 
/>
```

The selected model is passed to the `/api/convert` endpoint in the request body.

---

## Error Handling

Both implementations include fallback to Sharp-based resizing if AI generation fails:

1. **AI Generation Attempted**: If prompt is provided or dimensions change
2. **AI Generation Fails**: Falls back to Sharp canvas resize
3. **No AI Needed**: Uses Sharp directly for simple format conversion

---

## Environment Variables Summary

Required for Gemini:
```env
GEMINI_API_KEY=your-gemini-api-key
```

Required for OpenAI:
```env
OPENAI_API_KEY=your-openai-api-key
```

Optional model overrides:
```env
GEMINI_MODEL=gemini-3.1-flash-image-preview
OPENAI_MODEL=gpt-image-2
```

---

## Pricing Considerations

### Gemini 3.1 Flash Image Preview
- **512 resolution**: 747 tokens
- **1K resolution**: 1,120 tokens
- **2K resolution**: 1,680 tokens
- **4K resolution**: 2,520 tokens
- Thinking tokens are billed separately

### OpenAI gpt-image-2
- Pricing based on resolution and complexity
- Check OpenAI pricing page for current rates
- Generally more expensive than Gemini for equivalent quality

---

## Next Steps

1. ✅ Both models are implemented and ready to use
2. ⚠️ Test with actual API keys to verify responses
3. ⚠️ Monitor API costs and rate limits
4. ⚠️ Update Supabase Site URL for OAuth redirect fix
5. ✅ Deploy to Vercel (automatic on git push)

---

## Troubleshooting

### Gemini API Issues
- Verify `GEMINI_API_KEY` is set correctly
- Check model ID is valid (gemini-3.1-flash-image-preview)
- Ensure API key has image generation permissions

### OpenAI API Issues
- Verify `OPENAI_API_KEY` is set correctly
- Ensure you have access to gpt-image-2 model
- Check API rate limits and quotas
- DALL-E 3 is deprecated - use gpt-image-2 instead

### Authentication Issues
- Ensure cookies are being sent with requests (`credentials: "include"`)
- Verify Supabase SSR is configured correctly
- Check that user is authenticated before making requests

---

## Documentation Links

- [Gemini Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [OpenAI gpt-image-2 Announcement](https://openai.com/index/introducing-chatgpt-images-2-0/)
- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
