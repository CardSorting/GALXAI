-- Private, durable conversation and draft checkpoints. No client/Data API grants.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
ALTER TABLE private.galx_site_workspaces
  ADD COLUMN IF NOT EXISTS project_notes text NOT NULL DEFAULT '' CHECK (octet_length(project_notes)<=2000),
  ADD COLUMN IF NOT EXISTS context_summary text NOT NULL DEFAULT '' CHECK (octet_length(context_summary)<=2000),
  ADD COLUMN IF NOT EXISTS context_start_turn integer NOT NULL DEFAULT 0 CHECK (context_start_turn>=0),
  ADD COLUMN IF NOT EXISTS turn_count integer NOT NULL DEFAULT 0 CHECK (turn_count>=0),
  ADD COLUMN IF NOT EXISTS document_version integer NOT NULL DEFAULT 0 CHECK (document_version>=0),
  ADD COLUMN IF NOT EXISTS published_version integer CHECK (published_version IS NULL OR published_version>0),
  ADD COLUMN IF NOT EXISTS operation_intent text NOT NULL DEFAULT 'build' CHECK (operation_intent IN ('build','discuss'));
CREATE UNIQUE INDEX IF NOT EXISTS galx_site_workspaces_id_owner ON private.galx_site_workspaces(id,user_id);
CREATE TABLE IF NOT EXISTS private.galx_site_turns (
  site_id uuid NOT NULL,
  user_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence>0),
  operation_id uuid NOT NULL,
  intent text NOT NULL CHECK (intent IN ('build','discuss','restore','legacy')),
  user_text text CHECK (user_text IS NULL OR octet_length(user_text)<=8000),
  assistant_text text CHECK (assistant_text IS NULL OR octet_length(assistant_text)<=8000),
  state text NOT NULL CHECK (state IN ('pending','completed','failed')),
  document_version integer CHECK (document_version IS NULL OR document_version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (site_id,sequence),
  UNIQUE (site_id,operation_id),
  FOREIGN KEY (site_id,user_id) REFERENCES private.galx_site_workspaces(id,user_id)
);
CREATE TABLE IF NOT EXISTS private.galx_site_versions (
  site_id uuid NOT NULL,
  user_id text NOT NULL,
  version integer NOT NULL CHECK (version>0),
  document jsonb NOT NULL CHECK (jsonb_typeof(document)='object' AND octet_length(document::text)<=16000),
  context_summary text NOT NULL DEFAULT '' CHECK (octet_length(context_summary)<=2000),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  source text NOT NULL CHECK (source IN ('generation','restore','import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id,version),
  FOREIGN KEY (site_id,user_id) REFERENCES private.galx_site_workspaces(id,user_id)
);
ALTER TABLE private.galx_site_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_turns FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_turns,private.galx_site_versions FROM PUBLIC,anon,authenticated,service_role;

-- Import retained legacy pairs once. Older messages already discarded by the old
-- application cannot be reconstructed. Original timestamps were not recorded.
WITH pairs AS (
 SELECT w.id,w.user_id,w.updated_at,((m.ordinality+1)/2)::integer AS sequence,
   max(m.value->>'text') FILTER (WHERE m.value->>'role'='user') AS user_text,
   max(m.value->>'text') FILTER (WHERE m.value->>'role'='assistant') AS assistant_text,
   max(split_part(m.value->>'id',':',1)) FILTER (WHERE m.value->>'role'='user') AS operation
 FROM private.galx_site_workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.messages) WITH ORDINALITY m
 WHERE w.turn_count=0 GROUP BY w.id,w.user_id,w.updated_at,((m.ordinality+1)/2)::integer
)
INSERT INTO private.galx_site_turns(site_id,user_id,sequence,operation_id,intent,user_text,assistant_text,state,created_at,completed_at)
SELECT id,user_id,sequence,CASE WHEN operation ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN operation::uuid ELSE md5(id::text||':'||sequence::text)::uuid END,'legacy',user_text,assistant_text,'completed',updated_at,updated_at
FROM pairs ON CONFLICT DO NOTHING;
UPDATE private.galx_site_workspaces w SET turn_count=greatest(w.turn_count,
 coalesce((SELECT max(t.sequence) FROM private.galx_site_turns t WHERE t.site_id=w.id),0));
INSERT INTO private.galx_site_turns(site_id,user_id,sequence,operation_id,intent,user_text,state,created_at)
SELECT id,user_id,turn_count+1,operation_id,'build',operation_brief,'pending',operation_started_at
FROM private.galx_site_workspaces WHERE operation_id IS NOT NULL ON CONFLICT DO NOTHING;
UPDATE private.galx_site_workspaces w SET turn_count=greatest(w.turn_count,
 coalesce((SELECT max(t.sequence) FROM private.galx_site_turns t WHERE t.site_id=w.id),0));

INSERT INTO private.galx_site_versions(site_id,user_id,version,document,label,source,created_at)
SELECT id,user_id,1,coalesce(published_document,document),'Saved draft','import',updated_at
FROM private.galx_site_workspaces WHERE document IS NOT NULL OR published_document IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO private.galx_site_versions(site_id,user_id,version,document,label,source,created_at)
SELECT id,user_id,2,document,'Unpublished changes','import',updated_at FROM private.galx_site_workspaces
WHERE document_version=0 AND published_document IS NOT NULL AND document IS NOT NULL AND document<>published_document ON CONFLICT DO NOTHING;
UPDATE private.galx_site_workspaces w SET document_version=(SELECT max(v.version) FROM private.galx_site_versions v WHERE v.site_id=w.id),
 published_version=CASE WHEN w.published_document IS NOT NULL THEN 1 ELSE NULL END
WHERE w.document_version=0 AND EXISTS (SELECT 1 FROM private.galx_site_versions v WHERE v.site_id=w.id);
