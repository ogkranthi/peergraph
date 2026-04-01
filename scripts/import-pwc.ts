import * as https from "https";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

interface PWCEntry {
  paper_url: string;
  paper_title: string;
  repo_url: string;
  is_official: boolean;
  mentioned_in_paper: boolean;
  mentioned_in_readme: boolean;
  framework: string;
}

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  type: string;
}

interface Builder {
  id: string;
  github_username: string;
  name: string;
  avatar_url: string;
  bio: string;
  city: string;
  skills: string[];
  looking_for: string[];
  website_url: string;
  twitter_url: string;
  linkedin_url: string;
  created_at: string;
  verified: boolean;
}

interface PaperLink {
  paper_id: string;
  source_type: string;
  evidence_url: string;
  confidence: number;
  added_at: string;
}

interface Project {
  id: string;
  builder_id: string;
  name: string;
  description: string;
  repo_url: string;
  live_url: string;
  domains: string[];
  paper_ids: string[];
  paper_links: PaperLink[];
  created_at: string;
}

interface Paper {
  id: string;
  title: string;
  url: string;
  domains: string[];
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (reqUrl: string) => {
      https.get(reqUrl, { headers: { "User-Agent": "peergraph-importer" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", reject);
    };
    request(url);
  });
}

function decompress(gzPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(gzPath, (err, data) => {
      if (err) return reject(err);
      zlib.gunzip(data, (err2, result) => {
        if (err2) return reject(err2);
        resolve(result);
      });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchJSON<T>(url: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const token = process.env.GITHUB_TOKEN || "";
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: {
        "User-Agent": "peergraph-importer",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    https.get(options, (res) => {
      if (res.statusCode === 404) { resolve(null); return; }
      if (res.statusCode === 403 || res.statusCode === 429) {
        reject(new Error(`RATE_LIMIT:${res.statusCode}`));
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let body = "";
      res.on("data", (c: Buffer) => { body += c.toString(); });
      res.on("end", () => {
        try { resolve(JSON.parse(body) as T); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function fetchGitHubUser(username: string): Promise<GitHubUser | null> {
  let backoff = 1000;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fetchJSON<GitHubUser>(`https://api.github.com/users/${username}`);
    } catch (e: any) {
      if (e.message && e.message.startsWith("RATE_LIMIT")) {
        console.log(`  Rate limited on ${username}, waiting ${backoff}ms...`);
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      throw e;
    }
  }
  console.log(`  Giving up on ${username} after retries`);
  return null;
}

function extractGitHubUsername(repoUrl: string): string | null {
  const m = repoUrl.match(/github\.com\/([^/]+)\//);
  return m ? m[1] : null;
}

function normalizeArxivUrl(url: string): string {
  // Normalize to https://arxiv.org/abs/XXXX.XXXXX
  return url
    .replace(/^http:/, "https:")
    .replace(/\/pdf\//, "/abs/")
    .replace(/\.pdf$/, "")
    .replace(/v\d+$/, "");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const ROOT = path.resolve(__dirname, "..");
  const DATA = path.join(ROOT, "src", "data");
  const GZ_PATH = "/tmp/pwc-links.json.gz";
  const PWC_URL = "https://production-media.paperswithcode.com/about/links-between-papers-and-code.json.gz";

  // Step 1: Download & decompress
  console.log("Downloading PWC links dataset...");
  if (!fs.existsSync(GZ_PATH)) {
    await download(PWC_URL, GZ_PATH);
    console.log("  Downloaded to", GZ_PATH);
  } else {
    console.log("  Using cached", GZ_PATH);
  }

  console.log("Decompressing...");
  const raw = await decompress(GZ_PATH);
  const entries: PWCEntry[] = JSON.parse(raw.toString("utf-8"));
  console.log(`  Parsed ${entries.length} PWC entries`);

  // Step 2: Filter (is_official OR mentioned_in_paper)
  const filtered = entries.filter((e) => e.is_official || e.mentioned_in_paper);
  console.log(`  ${filtered.length} entries after filter (official or mentioned_in_paper)`);

  // Step 3: Extract GitHub usernames & group by username
  const userPapers = new Map<string, { papers: Set<string>; titles: Set<string>; frameworks: Set<string>; repos: Set<string> }>();

  for (const entry of filtered) {
    const username = extractGitHubUsername(entry.repo_url);
    if (!username) continue;
    const lower = username.toLowerCase();

    if (!userPapers.has(lower)) {
      userPapers.set(lower, { papers: new Set(), titles: new Set(), frameworks: new Set(), repos: new Set() });
    }
    const rec = userPapers.get(lower)!;
    if (entry.paper_url) rec.papers.add(entry.paper_url);
    if (entry.paper_title) rec.titles.add(entry.paper_title.toLowerCase());
    if (entry.framework) rec.frameworks.add(entry.framework.toLowerCase());
    rec.repos.add(entry.repo_url);
  }

  console.log(`  ${userPapers.size} unique GitHub usernames`);

  // Step 4: Sort by paper count, take top 300
  const sorted = [...userPapers.entries()]
    .sort((a, b) => b[1].papers.size - a[1].papers.size)
    .slice(0, 300);

  console.log(`  Top 300 users (most prolific: ${sorted[0]?.[0]} with ${sorted[0]?.[1].papers.size} papers)`);

  // Step 5: Load existing data
  const builders: Builder[] = JSON.parse(fs.readFileSync(path.join(DATA, "builders.json"), "utf-8"));
  const projects: Project[] = JSON.parse(fs.readFileSync(path.join(DATA, "projects.json"), "utf-8"));
  const papers: Paper[] = JSON.parse(fs.readFileSync(path.join(DATA, "papers.json"), "utf-8"));

  const existingUsernames = new Set(builders.map((b) => b.github_username.toLowerCase()));

  // Build paper lookup indices
  const paperByUrl = new Map<string, Paper>();
  const paperByTitle = new Map<string, Paper>();
  for (const p of papers) {
    if (p.url) paperByUrl.set(normalizeArxivUrl(p.url), p);
    if (p.title) paperByTitle.set(p.title.toLowerCase(), p);
  }

  // Find next builder/project IDs
  let nextBuilderId = Math.max(...builders.map((b) => parseInt(b.id.replace("b", ""), 10))) + 1;
  let nextProjectId = Math.max(...projects.map((p) => parseInt(p.id.replace("proj", ""), 10))) + 1;

  const TODAY = new Date().toISOString().split("T")[0] + "T00:00:00Z";

  let newBuilders = 0;
  let matchedPapers = 0;
  let newProjects = 0;

  // Step 6: Fetch GitHub profiles & create entries
  const toProcess = sorted.filter(([username]) => !existingUsernames.has(username));
  console.log(`  ${toProcess.length} new users to fetch (${sorted.length - toProcess.length} already in builders.json)`);

  for (let i = 0; i < toProcess.length; i++) {
    const [username, data] = toProcess[i];

    if (i % 50 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${toProcess.length}`);
    }

    // Rate limit: 100ms between requests
    await sleep(100);

    let ghUser: GitHubUser | null;
    try {
      ghUser = await fetchGitHubUser(username);
    } catch (e: any) {
      console.log(`  Skipping ${username}: ${e.message}`);
      continue;
    }

    if (!ghUser) {
      continue; // 404
    }

    if (ghUser.type !== "User") {
      continue; // skip orgs
    }

    // Match papers
    const matchedPaperIds: string[] = [];
    for (const paperUrl of data.papers) {
      const normalized = normalizeArxivUrl(paperUrl);
      const found = paperByUrl.get(normalized);
      if (found) {
        matchedPaperIds.push(found.id);
      }
    }
    // Also try title matching
    for (const title of data.titles) {
      const found = paperByTitle.get(title);
      if (found && !matchedPaperIds.includes(found.id)) {
        matchedPaperIds.push(found.id);
      }
    }

    // Infer domains from matched papers
    let domains: string[] = ["AI/ML"];
    if (matchedPaperIds.length > 0) {
      const domainSet = new Set<string>();
      for (const pid of matchedPaperIds) {
        const paper = papers.find((p) => p.id === pid);
        if (paper?.domains) paper.domains.forEach((d) => domainSet.add(d));
      }
      if (domainSet.size > 0) domains = [...domainSet];
    }

    // Build skills from framework
    const skills = new Set<string>(["python", "research"]);
    for (const fw of data.frameworks) {
      if (fw.includes("pytorch") || fw === "torch") skills.add("pytorch");
      else if (fw.includes("tensorflow") || fw === "tf") skills.add("tensorflow");
      else if (fw.includes("jax")) skills.add("jax");
      else if (fw) skills.add(fw);
    }

    const builderId = `b${nextBuilderId++}`;

    const builder: Builder = {
      id: builderId,
      github_username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      bio: ghUser.bio || "",
      city: ghUser.location || "",
      skills: [...skills],
      looking_for: ["collaborator"],
      website_url: ghUser.blog || "",
      twitter_url: ghUser.twitter_username ? `https://twitter.com/${ghUser.twitter_username}` : "",
      linkedin_url: "",
      created_at: TODAY,
      verified: false,
    };

    builders.push(builder);
    newBuilders++;
    matchedPapers += matchedPaperIds.length;

    // Create project entries — one per repo
    for (const repoUrl of data.repos) {
      const repoName = repoUrl.split("/").pop() || "unknown";

      // Find papers associated with this specific repo
      const repoPaperIds: string[] = [];
      for (const entry of filtered) {
        if (entry.repo_url !== repoUrl) continue;
        const normalized = normalizeArxivUrl(entry.paper_url);
        const found = paperByUrl.get(normalized);
        if (found) repoPaperIds.push(found.id);
        const byTitle = paperByTitle.get(entry.paper_title?.toLowerCase());
        if (byTitle && !repoPaperIds.includes(byTitle.id)) repoPaperIds.push(byTitle.id);
      }

      // Only create project if we matched at least one paper
      if (repoPaperIds.length === 0) continue;

      const projectId = `proj${nextProjectId++}`;
      const project: Project = {
        id: projectId,
        builder_id: builderId,
        name: repoName,
        description: `Implementation of research paper(s) by ${builder.name}`,
        repo_url: repoUrl,
        live_url: "",
        domains,
        paper_ids: repoPaperIds,
        paper_links: repoPaperIds.map((pid) => ({
          paper_id: pid,
          source_type: "pwc_import",
          evidence_url: repoUrl,
          confidence: 80,
          added_at: TODAY,
        })),
        created_at: TODAY,
      };

      projects.push(project);
      newProjects++;
    }
  }

  // Step 7: Write updated files
  fs.writeFileSync(path.join(DATA, "builders.json"), JSON.stringify(builders, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA, "projects.json"), JSON.stringify(projects, null, 2) + "\n");

  console.log("\n════════════════════════════════════════");
  console.log(`  PWC Import Summary`);
  console.log(`  ${newBuilders} new builders added`);
  console.log(`  ${matchedPapers} papers matched`);
  console.log(`  ${newProjects} projects created`);
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
