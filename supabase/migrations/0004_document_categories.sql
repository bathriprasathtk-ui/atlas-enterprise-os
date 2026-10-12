-- =========================================================
-- Atlas Enterprise OS — document categories
--
-- Database-Design.md (5.6 Documents) calls for a category/
-- tag facet on documents; the Knowledge Hub's category chips
-- previously had nothing to filter on. Adds a nullable
-- category column (preset values chosen in the upload UI).
--
-- RLS policies on documents reference only uploaded_by, so
-- no policy changes are required.
--
-- Idempotent: safe to run more than once.
-- =========================================================

begin;

alter table public.documents
    add column if not exists category text
    check (
        category is null
        or char_length(trim(category)) between 1 and 60
    );

commit;
