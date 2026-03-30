-- Researchers (auto-imported from Semantic Scholar / OpenAlex)
CREATE TABLE IF NOT EXISTS researchers (
  id              text PRIMARY KEY,
  semantic_id     text,
  name            text NOT NULL,
  institution     text NOT NULL DEFAULT '',
  h_index         integer NOT NULL DEFAULT 0,
  citation_count  integer NOT NULL DEFAULT 0,
  paper_count     integer NOT NULL DEFAULT 0,
  domains         text[] NOT NULL DEFAULT '{}',
  homepage_url    text NOT NULL DEFAULT '',
  photo_url       text NOT NULL DEFAULT '',
  -- Semantic search
  embedding       vector(384),
  fts_vector      tsvector,
  -- GDPR / privacy
  opted_out               boolean NOT NULL DEFAULT false,
  privacy_level           text NOT NULL DEFAULT 'public',
  suppress_from_rankings  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Papers
CREATE TABLE IF NOT EXISTS papers (
  id              text PRIMARY KEY,
  semantic_id     text,
  title           text NOT NULL,
  year            integer NOT NULL DEFAULT 0,
  venue           text NOT NULL DEFAULT '',
  citation_count  integer NOT NULL DEFAULT 0,
  abstract        text NOT NULL DEFAULT '',
  url             text NOT NULL DEFAULT '',
  domains         text[] NOT NULL DEFAULT '{}',
  -- Semantic search
  embedding       vector(384),
  fts_vector      tsvector,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Builders (self-signup with GitHub OAuth)
CREATE TABLE IF NOT EXISTS builders (
  id              text PRIMARY KEY,
  github_id       text,
  github_username text NOT NULL,
  name            text NOT NULL,
  avatar_url      text NOT NULL DEFAULT '',
  bio             text NOT NULL DEFAULT '',
  city            text NOT NULL DEFAULT '',
  skills          text[] NOT NULL DEFAULT '{}',
  looking_for     text[] NOT NULL DEFAULT '{}',
  website_url     text NOT NULL DEFAULT '',
  twitter_url     text NOT NULL DEFAULT '',
  linkedin_url    text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id              text PRIMARY KEY,
  builder_id      text NOT NULL REFERENCES builders(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  repo_url        text NOT NULL DEFAULT '',
  live_url        text NOT NULL DEFAULT '',
  domains         text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update fts_vector on INSERT/UPDATE via triggers
CREATE OR REPLACE FUNCTION update_researcher_fts() RETURNS trigger AS $$
BEGIN
  NEW.fts_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.institution, '') || ' ' || array_to_string(COALESCE(NEW.domains, '{}'), ' '));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER researchers_fts_trigger
  BEFORE INSERT OR UPDATE ON researchers
  FOR EACH ROW EXECUTE FUNCTION update_researcher_fts();

CREATE OR REPLACE FUNCTION update_paper_fts() RETURNS trigger AS $$
BEGIN
  NEW.fts_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.abstract, '') || ' ' || array_to_string(COALESCE(NEW.domains, '{}'), ' '));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER papers_fts_trigger
  BEFORE INSERT OR UPDATE ON papers
  FOR EACH ROW EXECUTE FUNCTION update_paper_fts();
