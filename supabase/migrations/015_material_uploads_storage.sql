-- 015: Storage-Bucket + RLS für Material-Uploads.
--
-- Grund: Dateien > ~4,5 MB können nicht durch die Serverless-Route /api/upload geschickt
-- werden (Vercel-Body-Limit). Stattdessen lädt der Browser die Datei direkt in diesen
-- Bucket; die Route lädt sie serverseitig und extrahiert den Text. Gespeichert wird nur der
-- extrahierte Text in `materials`; die Datei wird nach der Extraktion wieder gelöscht.

-- Privater Bucket, 25 MB Limit. Bewusst KEIN allowed_mime_types (sonst Fehlalarm bei
-- unerwartetem Browser-Content-Type) — das Format prüft die Route per Dateiendung.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 26214400)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- RLS auf storage.objects (ist bei Supabase standardmäßig aktiv): jede:r nur im eigenen
-- Ordner {auth.uid()}/… . idempotent via drop-if-exists.
drop policy if exists "materials_insert_own" on storage.objects;
create policy "materials_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "materials_select_own" on storage.objects;
create policy "materials_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "materials_delete_own" on storage.objects;
create policy "materials_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
