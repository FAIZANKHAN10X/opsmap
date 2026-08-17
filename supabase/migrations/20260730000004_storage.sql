-- Storage buckets for document binaries and generated reports.
--
-- The old backend wrote files to a local `uploads/` directory. In the new
-- stack documents and report JSON live in Supabase Storage. Buckets are private
-- (public = false); reads are served through server route handlers that use
-- the service-role client, so no client-side storage RLS is required.

-- documents bucket: original files + image derivatives (resized/thumbnail).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'text/plain'
]::text[])
on conflict (id) do nothing;

-- reports bucket: generated JSON report summaries.
insert into storage.buckets (id, name, public, file_size_limit)
values ('reports', 'reports', false, 10485760)
on conflict (id) do nothing;