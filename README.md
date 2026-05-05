# Fitty Canvas

AI-powered image resizing and enhancement tool with Google OAuth authentication.

## Features

- 🎨 **AI-Powered Image Processing** - Choose between Gemini or OpenAI models
- 🔐 **Google OAuth Authentication** - Secure user authentication via Supabase
- 📊 **Multiple Aspect Ratios** - 12+ preset ratios plus custom dimensions
- 🖼️ **Smart Resizing** - AI-enhanced outpainting and background filling
- 💾 **User History** - View your previous conversions with pagination
- 📥 **Direct Download** - Download converted images instantly
- 🎯 **Simple Formats** - Export as JPG, PNG, or WEBP

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Models**: Google Gemini & OpenAI
- **Image Processing**: Sharp

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- Google Cloud Console account (for OAuth)
- Gemini API key
- OpenAI API key (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/satyamtripathi-fitelo/Fitty-Canvas.git
cd Fitty-Canvas
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Storage Buckets (optional, defaults to fitty-uploads and fitty-outputs)
SUPABASE_STORAGE_BUCKET_UPLOADS=fitty-uploads
SUPABASE_STORAGE_BUCKET_OUTPUTS=fitty-outputs

# AI Models
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

4. **Set up Supabase**

Run this SQL in your Supabase SQL Editor:

```sql
-- Create image_jobs table
create table if not exists image_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  original_url text not null,
  output_url text,
  original_width int,
  original_height int,
  target_ratio text,
  target_width int,
  target_height int,
  prompt text,
  output_format text default 'jpg',
  status text default 'pending',
  created_at timestamptz default now()
);

-- Create indexes
CREATE INDEX idx_image_jobs_user_id ON image_jobs(user_id);
CREATE INDEX idx_image_jobs_user_created ON image_jobs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own images"
ON image_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
ON image_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
ON image_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('fitty-uploads', 'fitty-uploads', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('fitty-outputs', 'fitty-outputs', true)
on conflict (id) do nothing;
```

5. **Configure Google OAuth**

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
- Copy Client ID and Secret
- In Supabase Dashboard → Authentication → Providers → Google
- Enable Google provider and paste credentials

6. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In** - Click "Sign in with Google" to authenticate
2. **Upload Image** - Drag & drop or click to upload an image
3. **Choose Settings**:
   - Select aspect ratio (or use custom dimensions)
   - Choose AI model (Gemini or OpenAI)
   - Add optional prompt for AI enhancement
   - Select output format (JPG, PNG, or WEBP)
4. **Convert** - Click "Convert Image" to process
5. **Download** - Click the download button on the converted image
6. **View History** - Scroll down to see your previous conversions

## Features in Detail

### AI Model Selection
- **Gemini 3.1 Flash Image Preview**: Google's latest multimodal AI model with image generation (default)
- **OpenAI gpt-image-2**: OpenAI's ChatGPT Images 2.0 with native reasoning and 2K resolution
- Toggle between models based on your preference and API availability

### Aspect Ratios
- Original (keeps source ratio)
- Square (1:1)
- Landscape (16:9)
- Portrait (9:16)
- Instagram (4:5, 5:4)
- Classic (4:3, 3:4, 3:2, 2:3)
- Cinematic (21:9)
- Document (A4)
- Custom (specify width × height)

### Image Processing
- Smart background filling using AI
- Automatic rotation correction
- Quality optimization
- Format conversion

### User History
- View all your converted images
- Pagination (10 images per page)
- Click to view full-size image
- Organized by date (newest first)

## Project Structure

```
fitty-canvas/
├── app/
│   ├── api/
│   │   ├── convert/      # Image conversion endpoint
│   │   ├── history/      # User history endpoint
│   │   └── upload/       # Image upload endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout with auth provider
│   └── page.tsx          # Main application page
├── components/
│   ├── AuthButton.tsx           # Sign in/out button
│   ├── ConvertButton.tsx        # Convert action button
│   ├── DownloadButton.tsx       # Download button
│   ├── FittyCanvasLogo.tsx      # App logo
│   ├── FormatSelector.tsx       # Format selection (JPG/PNG/WEBP)
│   ├── ImagePreviewPanel.tsx    # Image preview with actions
│   ├── ImageUploader.tsx        # Drag & drop uploader
│   ├── ModelSelector.tsx        # AI model selector
│   ├── PromptInput.tsx          # Prompt input field
│   └── RatioSelector.tsx        # Aspect ratio selector
├── lib/
│   ├── auth-context.tsx         # Authentication context
│   ├── client-api.ts            # API client utilities
│   ├── gemini.ts                # Gemini AI integration
│   ├── server-log.ts            # Server logging
│   ├── sharp-utils.ts           # Image processing utilities
│   ├── storage-download.ts      # Storage download helpers
│   ├── supabase-server.ts       # Server-side Supabase client
│   ├── supabase.ts              # Supabase client
│   └── utils.ts                 # General utilities
├── types/
│   └── index.ts                 # TypeScript type definitions
└── public/
    └── brand/                   # Brand assets
```

## API Endpoints

### POST /api/upload
Upload an image to Supabase Storage.

**Request**: FormData with `file` field  
**Response**: `{ jobId, originalUrl, originalWidth, originalHeight, fileName, fileSize }`

### POST /api/convert
Convert and process an image using AI.

**Request**:
```json
{
  "jobId": "uuid",
  "imageUrl": "url",
  "targetRatio": "16:9",
  "targetWidth": 1920,
  "targetHeight": 1080,
  "prompt": "optional prompt",
  "outputFormat": "jpg",
  "quality": 90,
  "aiModel": "gemini"
}
```

**Response**: `{ outputUrl, width, height, format, jobId }`

### GET /api/history
Get user's conversion history with pagination.

**Query Params**: `?page=1&limit=10`  
**Response**: `{ jobs: [], total, page, limit, hasMore }`

## Security

- **Row Level Security (RLS)**: Database-level security ensures users can only access their own data
- **Authentication Required**: All operations require valid user session
- **Secure Storage**: Images stored in Supabase with proper access controls
- **API Protection**: All endpoints validate authentication

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to add all environment variables from `.env.local` to your Vercel project settings.

## Troubleshooting

### "Unauthorized" error when uploading
- Make sure you're signed in with Google
- Check that your Supabase credentials are correct
- Verify Google OAuth is properly configured

### Images not showing in history
- Ensure you've run the database migration SQL
- Check that RLS policies are enabled
- Verify you have completed at least one conversion

### "Bucket not found" error
- Create storage buckets in Supabase Dashboard → Storage
- Bucket names: `fitty-uploads` and `fitty-outputs`
- Make sure both buckets are set to **public**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ by Fitelo Team**
