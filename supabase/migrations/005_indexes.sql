-- Full-text search indexes
CREATE INDEX IF NOT EXISTS researchers_fts_idx ON researchers USING GIN (fts_vector);
CREATE INDEX IF NOT EXISTS papers_fts_idx ON papers USING GIN (fts_vector);

-- Trigram indexes for ILIKE queries (directory search)
CREATE INDEX IF NOT EXISTS researchers_name_trgm_idx ON researchers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS papers_title_trgm_idx ON papers USING GIN (title gin_trgm_ops);

-- pgvector indexes (IVFFlat — good for free tier, requires some data first)
-- Run AFTER seeding: CREATE INDEX researchers_embedding_idx ON researchers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
-- Run AFTER seeding: CREATE INDEX papers_embedding_idx ON papers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS paper_authors_researcher_idx ON paper_authors (researcher_id);
CREATE INDEX IF NOT EXISTS paper_authors_paper_idx ON paper_authors (paper_id);
CREATE INDEX IF NOT EXISTS project_papers_paper_idx ON project_papers (paper_id);
CREATE INDEX IF NOT EXISTS project_papers_confidence_idx ON project_papers (confidence DESC);
CREATE INDEX IF NOT EXISTS projects_builder_idx ON projects (builder_id);

-- GDPR compliance
CREATE INDEX IF NOT EXISTS researchers_opted_out_idx ON researchers (opted_out) WHERE opted_out = true;
