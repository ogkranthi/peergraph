-- Hybrid search: FTS + semantic (RRF fusion)
-- When embeddings are not available, falls back to FTS only.
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text      text,
  query_embedding vector(384) DEFAULT NULL,
  match_count     int DEFAULT 10,
  entity_filter   text DEFAULT 'all'  -- 'all' | 'researcher' | 'paper'
)
RETURNS TABLE (
  id          text,
  entity_type text,
  name        text,
  snippet     text,
  score       float
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  tsquery_val := plainto_tsquery('english', query_text);

  RETURN QUERY
  WITH fts_researchers AS (
    SELECT
      r.id,
      'researcher'::text AS entity_type,
      r.name,
      r.institution AS snippet,
      ts_rank(r.fts_vector, tsquery_val)::float AS fts_score
    FROM researchers r
    WHERE
      r.fts_vector @@ tsquery_val
      AND NOT r.opted_out
      AND (entity_filter = 'all' OR entity_filter = 'researcher')
    ORDER BY fts_score DESC
    LIMIT match_count * 2
  ),
  fts_papers AS (
    SELECT
      p.id,
      'paper'::text AS entity_type,
      p.title AS name,
      p.venue AS snippet,
      ts_rank(p.fts_vector, tsquery_val)::float AS fts_score
    FROM papers p
    WHERE
      p.fts_vector @@ tsquery_val
      AND (entity_filter = 'all' OR entity_filter = 'paper')
    ORDER BY fts_score DESC
    LIMIT match_count * 2
  ),
  fts_combined AS (
    SELECT * FROM fts_researchers
    UNION ALL
    SELECT * FROM fts_papers
  ),
  -- RRF: fts rank
  fts_ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY fts_score DESC) AS fts_rank
    FROM fts_combined
  ),
  -- Semantic search (only when embedding provided)
  semantic_researchers AS (
    SELECT
      r.id,
      'researcher'::text AS entity_type,
      r.name,
      r.institution AS snippet,
      (1 - (r.embedding <=> query_embedding))::float AS sem_score,
      ROW_NUMBER() OVER (ORDER BY r.embedding <=> query_embedding) AS sem_rank
    FROM researchers r
    WHERE
      query_embedding IS NOT NULL
      AND r.embedding IS NOT NULL
      AND NOT r.opted_out
      AND (entity_filter = 'all' OR entity_filter = 'researcher')
    LIMIT match_count * 2
  ),
  semantic_papers AS (
    SELECT
      p.id,
      'paper'::text AS entity_type,
      p.title AS name,
      p.venue AS snippet,
      (1 - (p.embedding <=> query_embedding))::float AS sem_score,
      ROW_NUMBER() OVER (ORDER BY p.embedding <=> query_embedding) AS sem_rank
    FROM papers p
    WHERE
      query_embedding IS NOT NULL
      AND p.embedding IS NOT NULL
      AND (entity_filter = 'all' OR entity_filter = 'paper')
    LIMIT match_count * 2
  ),
  semantic_combined AS (
    SELECT id, entity_type, name, snippet, sem_score, sem_rank
    FROM semantic_researchers
    UNION ALL
    SELECT id, entity_type, name, snippet, sem_score, sem_rank
    FROM semantic_papers
  ),
  -- RRF fusion (k=60 is standard)
  fusion AS (
    SELECT
      COALESCE(f.id, s.id) AS id,
      COALESCE(f.entity_type, s.entity_type) AS entity_type,
      COALESCE(f.name, s.name) AS name,
      COALESCE(f.snippet, s.snippet) AS snippet,
      (
        COALESCE(1.0 / (60 + f.fts_rank), 0) * 0.5 +
        COALESCE(1.0 / (60 + s.sem_rank), 0) * 0.5
      ) AS score
    FROM fts_ranked f
    FULL OUTER JOIN semantic_combined s USING (id, entity_type, name, snippet)
  )
  SELECT id, entity_type, name, snippet, score
  FROM fusion
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
