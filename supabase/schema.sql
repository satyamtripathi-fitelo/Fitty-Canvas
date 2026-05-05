create table if not exists image_jobs (
  id uuid primary key default gen_random_uuid(),
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

-- Buckets used by the app (defaults). Create via Dashboard → Storage → New bucket,
-- or run the inserts below in SQL Editor (Storage must be enabled).

insert into storage.buckets (id, name, public)
values ('fitty-uploads', 'fitty-uploads', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('fitty-outputs', 'fitty-outputs', true)
on conflict (id) do nothing;

-- Optional: if your buckets use other names, set in .env.local:
-- SUPABASE_STORAGE_BUCKET_UPLOADS=my-upload-bucket
-- SUPABASE_STORAGE_BUCKET_OUTPUTS=my-output-bucket
