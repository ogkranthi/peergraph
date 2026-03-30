-- Paper ↔ Researcher authorship edges
CREATE TABLE IF NOT EXISTS paper_authors (
  paper_id        text NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  researcher_id   text NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  PRIMARY KEY (paper_id, researcher_id)
);

-- Project → Paper links (the core provenance table)
-- Every link declares HOW it was detected and how confident we are
CREATE TABLE IF NOT EXISTS project_papers (
  project_id      text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  paper_id        text NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  source_type     text NOT NULL DEFAULT 'maintainer_claim',
  -- source_type values: maintainer_claim | readme_extraction | community | ai_detected
  evidence_url    text NOT NULL DEFAULT '',
  confidence      integer NOT NULL DEFAULT 75 CHECK (confidence >= 0 AND confidence <= 100),
  added_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, paper_id)
);

-- Opt-out requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS opt_out_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL,   -- 'researcher'
  entity_id       text NOT NULL,
  reason          text NOT NULL DEFAULT '',
  email           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at      timestamptz NOT NULL DEFAULT now()
);
