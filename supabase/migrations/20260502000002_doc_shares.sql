-- doc_shares: persists document share tokens (replaces in-memory store)
-- Accessed server-side only via service role key — RLS not required

CREATE TABLE IF NOT EXISTS public.doc_shares (
  token        TEXT        PRIMARY KEY,
  document_id  TEXT        NOT NULL,
  user_id      TEXT        NOT NULL,
  pin_hash     TEXT        NOT NULL,
  document_name TEXT       NOT NULL,
  document_type TEXT,
  signed_url   TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_shares_expires_at ON public.doc_shares (expires_at);
CREATE INDEX IF NOT EXISTS idx_doc_shares_user_id    ON public.doc_shares (user_id);
