import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USERNAME = process.env.GH_USERNAME || "myangell5522";
const DISPLAY_NAME = process.env.GH_DISPLAY_NAME || "myangell";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const OUT_FILE = join(ROOT, "widgets", "profile-card.svg");
const AVATAR_FILE = join(ROOT, "assets", "avatar.jpg");
const WIDGET_REPO = "danceqqq";

const WIDTH = 900;
const HEIGHT = 568;
const CX = 450;
const CY = 226;
const AVATAR_R = 72;
const DONUT_INNER = 90;
const DONUT_OUTER = 116;
const LOGO_R = 144;

const TEAL = "#5EEAD4";
const GOLD = "#E8B84A";
const TEXT = "#E8EEF7";
const MUTED = "#8B95A8";
const BG = "#0B1020";

const LANG_COLORS = {
  "C#": "#178600",
  Java: "#B07219",
  Python: "#3572A5",
  JavaScript: "#F1E05A",
  TypeScript: "#3178C6",
  Lua: "#4F6CFF",
  CSS: "#563D7C",
  HTML: "#E34C26",
  "C++": "#F34B7D",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#DEA584",
  PHP: "#4F5D95",
  Kotlin: "#A97BFF",
  Ruby: "#701516",
  Shell: "#89E051",
  Dart: "#00B4AB",
  Swift: "#F05138",
  Vue: "#41B883",
  SCSS: "#C6538C",
  Dockerfile: "#384D54",
  PowerShell: "#012456",
  "Jupyter Notebook": "#DA5B0B",
  Cython: "#FCD54A",
  Other: "#6E7681",
};

const ICON_SLUGS = {
  "C#": "csharp",
  Java: "openjdk",
  Python: "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Lua: "lua",
  CSS: "css",
  HTML: "html5",
  "C++": "cplusplus",
  C: "c",
  Go: "go",
  Rust: "rust",
  PHP: "php",
  Kotlin: "kotlin",
  Ruby: "ruby",
  Shell: "gnubash",
  Dart: "dart",
  Swift: "swift",
  Vue: "vuedotjs",
  SCSS: "sass",
  Dockerfile: "docker",
  PowerShell: "powershell",
  "Jupyter Notebook": "jupyter",
};

const HIDDEN_LANGS = new Set(["TeX", "Makefile", "CMake", "Batchfile", "HLSL"]);

function headers(extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "danceqqq-profile-widget",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeEntities(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function truncate(text, max) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function firstLine(message) {
  return (
    String(message || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ""
  );
}

function isWidgetCommit(message, repo = "") {
  return repo === WIDGET_REPO || /refresh profile widget|update profile widget|chore:\s*refresh/i.test(message);
}

function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / (86400 * 7))}w ago`;
}

function luminance(hex) {
  const n = Number.parseInt(String(hex).replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function polar(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function donutSlice(cx, cy, r0, r1, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r1} ${r1} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

function spreadAngles(angles, minSep) {
  if (angles.length < 2) return angles;
  const items = angles.map((a, i) => ({ a, i })).sort((x, y) => x.a - y.a);
  for (let pass = 0; pass < 10; pass++) {
    for (let k = 0; k < items.length; k++) {
      const curr = items[k];
      const next = items[(k + 1) % items.length];
      let delta = next.a - curr.a;
      if (k === items.length - 1) delta += Math.PI * 2;
      if (delta < minSep) {
        const push = (minSep - delta) / 2;
        curr.a -= push;
        next.a += push;
      }
    }
  }
  const out = new Array(angles.length);
  for (const item of items) out[item.i] = item.a;
  return out;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 180)}`);
  }
  return res.json();
}

async function graphql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json).slice(0, 300));
  }
  return json.data;
}

function rankLanguages(entries) {
  const sorted = entries.filter((item) => item.bytes > 0).sort((a, b) => b.bytes - a.bytes);
  const top = sorted.slice(0, 6);
  const restBytes = sorted.slice(6).reduce((sum, item) => sum + item.bytes, 0);
  const total = top.reduce((sum, item) => sum + item.bytes, 0) + restBytes;
  if (restBytes > 0 && total > 0 && restBytes / total >= 0.04 && top.length === 6) {
    top.push({ name: "Other", bytes: restBytes, color: LANG_COLORS.Other });
  }
  const all = top.reduce((sum, item) => sum + item.bytes, 0) || 1;
  return top.map((item) => ({
    name: item.name,
    bytes: item.bytes,
    color: item.color || LANG_COLORS[item.name] || "#6E7681",
    pct: item.bytes / all,
  }));
}

function tally(names) {
  const totals = new Map();
  for (const name of names) {
    if (!name || HIDDEN_LANGS.has(name)) continue;
    const current = totals.get(name) || { name, bytes: 0, color: LANG_COLORS[name] };
    current.bytes += 1;
    totals.set(name, current);
  }
  return [...totals.values()];
}

async function fetchFromGraphql() {
  const data = await graphql(
    `query ($login: String!) {
      user(login: $login) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes {
            name
            isPrivate
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name color } }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 8) {
                    nodes { messageHeadline committedDate oid }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { login: USERNAME },
  );

  const totals = new Map();
  const commits = [];
  for (const repo of data.user?.repositories?.nodes || []) {
    if (repo.isPrivate) continue;
    const primary = repo.languages?.edges?.[0];
    if (primary && !HIDDEN_LANGS.has(primary.node.name)) {
      const name = primary.node.name;
      const current = totals.get(name) || { name, bytes: 0, color: primary.node.color };
      current.bytes += 1;
      if (primary.node.color) current.color = primary.node.color;
      totals.set(name, current);
    }
    for (const node of repo.defaultBranchRef?.target?.history?.nodes || []) {
      const message = firstLine(node.messageHeadline);
      if (!message || isWidgetCommit(message, repo.name)) continue;
      commits.push({ repo: repo.name, message, at: node.committedDate, sha: node.oid });
    }
  }
  commits.sort((a, b) => new Date(b.at) - new Date(a.at));
  return { languages: [...totals.values()], commits: uniqueCommits(commits).slice(0, 5) };
}

async function fetchLanguagesRest() {
  const repos = await gh(`/users/${USERNAME}/repos?per_page=100&type=owner&sort=pushed`);
  return tally(
    repos.filter((repo) => !repo.fork && !repo.private).map((repo) => repo.language),
  );
}

async function fetchLanguagesHtml() {
  const res = await fetch(`https://github.com/${USERNAME}?tab=repositories&type=source`, {
    headers: { "User-Agent": "danceqqq-profile-widget" },
  });
  if (!res.ok) throw new Error(`HTML languages ${res.status}`);
  const html = await res.text();
  const names = [...html.matchAll(/itemprop="programmingLanguage">([^<]+)</g)].map((m) => m[1].trim());
  if (names.length === 0) throw new Error("No programmingLanguage tags");
  return tally(names);
}

function uniqueCommits(commits) {
  const seen = new Set();
  const out = [];
  for (const commit of commits) {
    const key = commit.sha || `${commit.repo}:${commit.message}:${commit.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(commit);
  }
  return out;
}

async function fetchCommitsFromEvents() {
  const events = await gh(`/users/${USERNAME}/events/public?per_page=100`);
  const commits = [];
  for (const event of events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
    if (event.type !== "PushEvent") continue;
    const repo = event.repo?.name?.split("/")[1] || event.repo?.name || "repo";
    const payloadCommits = Array.isArray(event.payload?.commits)
      ? [...event.payload.commits].reverse()
      : [];
    if (payloadCommits.length === 0 && event.payload?.head) {
      commits.push({
        repo,
        message: "",
        at: event.created_at,
        sha: event.payload.head,
      });
      continue;
    }
    for (const commit of payloadCommits) {
      const message = firstLine(commit.message);
      if (!message || isWidgetCommit(message, repo)) continue;
      commits.push({ repo, message, at: event.created_at, sha: commit.sha });
    }
  }
  return uniqueCommits(commits).filter((c) => c.message).slice(0, 5);
}

async function fetchCommitsFromAtom() {
  const res = await fetch(`https://github.com/${USERNAME}.atom`, {
    headers: { "User-Agent": "danceqqq-profile-widget" },
  });
  if (!res.ok) throw new Error(`Atom ${res.status}`);
  const xml = await res.text();
  const entries = xml.split(/<entry[>\s]/).slice(1);
  const commits = [];
  for (const entry of entries) {
    const title = decodeEntities(entry.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || "");
    const repoFromTitle = title.match(/pushed(?: to)?\s+(\S+)/i)?.[1]?.split("/").pop();
    const repoFromLink = decodeEntities(entry).match(/github\.com\/[^/\s]+\/([^/\s"'<]+)/)?.[1];
    const repo = repoFromTitle || repoFromLink;
    const published =
      entry.match(/<published>([^<]+)<\/published>/)?.[1] ||
      entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    const content = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || "";
    const html = decodeEntities(decodeEntities(content));
    const quotes = [...html.matchAll(/<blockquote>([\s\S]*?)<\/blockquote>/gi)].map((m) =>
      firstLine(decodeEntities(m[1].replace(/<[^>]+>/g, " "))),
    );
    for (const message of quotes) {
      if (!message || !repo || isWidgetCommit(message, repo)) continue;
      commits.push({ repo, message, at: published });
    }
  }
  commits.sort((a, b) => new Date(b.at) - new Date(a.at));
  const latest = uniqueCommits(commits).slice(0, 5);
  if (latest.length === 0) throw new Error("Atom feed had no commit messages");
  return latest;
}

async function fetchIconPath(slug) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/simple-icons@14/icons/${slug}.svg`,
    `https://cdn.simpleicons.org/${slug}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "danceqqq-profile-widget" } });
      if (!res.ok) continue;
      const svg = await res.text();
      const match = svg.match(/<path[^>]*\sd="([^"]+)"/i);
      if (match) return match[1];
    } catch {
      // next source
    }
  }
  return null;
}

async function withIcons(languages) {
  const paths = await mapPool(languages, 6, async (lang) => {
    const slug = ICON_SLUGS[lang.name];
    return slug ? fetchIconPath(slug) : null;
  });
  return languages.map((lang, i) => ({ ...lang, icon: paths[i] }));
}

function langIcon(lang, x, y, size) {
  const fill = luminance(lang.color) > 165 ? BG : "#F8FAFC";
  if (!lang.icon) {
    return `<text x="${x.toFixed(1)}" y="${(y + size * 0.32).toFixed(1)}" text-anchor="middle" fill="${fill}" font-size="${(size * 0.42).toFixed(1)}" font-weight="700">${esc(lang.name.slice(0, 2))}</text>`;
  }
  const scale = size / 24;
  return `<g transform="translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) scale(${scale.toFixed(3)})">
    <path d="${esc(lang.icon)}" fill="${fill}"/>
  </g>`;
}

function pillWidth(lang) {
  const label = `${lang.name}  ${Math.round(lang.pct * 100)}%`;
  return 36 + label.length * 6.7;
}

function renderPills(languages) {
  if (languages.length === 0) return "";
  const widths = languages.map(pillWidth);
  const gap = 8;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (languages.length - 1);
  let x = (WIDTH - total) / 2;
  const y = 386;

  return languages
    .map((lang, i) => {
      const w = widths[i];
      const label = `${lang.name}  ${Math.round(lang.pct * 100)}%`;
      const node = `
      <g>
        <rect x="${x.toFixed(1)}" y="${y}" rx="11" width="${w.toFixed(1)}" height="22" fill="${lang.color}" opacity="0.18"/>
        <rect x="${x.toFixed(1)}" y="${y}" rx="11" width="${w.toFixed(1)}" height="22" fill="none" stroke="${lang.color}" stroke-opacity="0.45"/>
        <circle cx="${(x + 17).toFixed(1)}" cy="${y + 11}" r="8" fill="${lang.color}"/>
        ${langIcon(lang, x + 17, y + 11, 13)}
        <text x="${(x + 30).toFixed(1)}" y="${y + 15}" fill="${TEXT}" font-size="11">${esc(label)}</text>
      </g>`;
      x += w + gap;
      return node;
    })
    .join("");
}

function renderDonut(languages) {
  if (languages.length === 0) {
    return `<circle cx="${CX}" cy="${CY}" r="${(DONUT_INNER + DONUT_OUTER) / 2}" fill="none" stroke="#243044" stroke-width="${DONUT_OUTER - DONUT_INNER}"/>`;
  }

  const gap = 0.032;
  let angle = -Math.PI / 2;
  const slices = [];
  const mids = [];

  for (const lang of languages) {
    const sweep = Math.max(lang.pct * Math.PI * 2 - gap, 0.09);
    const a0 = angle + gap / 2;
    const a1 = a0 + sweep;
    slices.push(
      `<path d="${donutSlice(CX, CY, DONUT_INNER, DONUT_OUTER, a0, a1)}" fill="${lang.color}">
        <title>${esc(lang.name)} ${Math.round(lang.pct * 100)}%</title>
      </path>`,
    );
    mids.push((a0 + a1) / 2);
    angle = a1 + gap / 2;
  }

  const logoAngles = spreadAngles(mids, 0.58);
  const logos = languages
    .map((lang, i) => {
      const [lx, ly] = polar(CX, CY, LOGO_R, logoAngles[i]);
      return `
      <g>
        <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="16" fill="${BG}" stroke="${lang.color}" stroke-width="1.7"/>
        <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="13.6" fill="${lang.color}"/>
        ${langIcon(lang, lx, ly, 16)}
      </g>`;
    })
    .join("");

  return `${slices.join("")}${logos}`;
}

function renderCommits(commits) {
  const startY = 460;
  if (commits.length === 0) {
    return `<text x="48" y="${startY}" fill="${MUTED}" font-size="12">No public commits in the recent event window.</text>`;
  }

  return commits
    .map((commit, i) => {
      const y = startY + i * 20;
      return `
      <g transform="translate(0, ${y})">
        <circle cx="48" cy="-4" r="3" fill="${TEAL}" opacity="0.9"/>
        <text x="62" y="0" fill="${TEAL}" font-size="12" font-weight="600">${esc(truncate(commit.repo, 16))}</text>
        <text x="196" y="0" fill="${TEXT}" font-size="12">${esc(truncate(commit.message, 60))}</text>
        <text x="860" y="0" text-anchor="end" fill="${MUTED}" font-size="11">${esc(timeAgo(commit.at))}</text>
      </g>`;
    })
    .join("");
}

function renderCard({ avatarData, languages, commits }) {
  const handle = `@${USERNAME}`;
  const dotX = 860 - handle.length * 7.55 - 14;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(DISPLAY_NAME)} GitHub profile">
  <title>${esc(DISPLAY_NAME)} · live GitHub widget</title>
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${TEAL}"/>
      <stop offset="1" stop-color="${GOLD}"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#121A2C"/>
      <stop offset="1" stop-color="${BG}"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="40%" r="46%">
      <stop offset="0" stop-color="${TEAL}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${TEAL}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="avatarClip">
      <circle cx="${CX}" cy="${CY}" r="${AVATAR_R}"/>
    </clipPath>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .fg { font-family: 'Segoe UI', Ubuntu, system-ui, sans-serif; }
      .live { animation: pulse 2.8s ease-in-out infinite; }
      @keyframes pulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" rx="22" fill="url(#panel)"/>
  <rect x="1.2" y="1.2" width="${WIDTH - 2.4}" height="${HEIGHT - 2.4}" rx="21" fill="none" stroke="url(#frame)" stroke-opacity="0.55"/>
  <rect x="18" y="18" width="${WIDTH - 36}" height="${HEIGHT - 36}" rx="16" fill="none" stroke="#1C2740"/>
  <rect x="22" y="22" width="${WIDTH - 44}" height="3" rx="1.5" fill="url(#frame)" opacity="0.9"/>

  <text class="fg" x="40" y="52" fill="${TEXT}" font-size="22" font-weight="700">${esc(DISPLAY_NAME)}</text>
  <text class="fg" x="40" y="72" fill="${MUTED}" font-size="12">GitHub profile widget</text>

  <g>
    <circle class="live" cx="${dotX.toFixed(1)}" cy="47" r="4" fill="${TEAL}" filter="url(#glow)"/>
    <text class="fg" x="860" y="52" text-anchor="end" fill="${TEAL}" font-size="13" font-weight="600">${esc(handle)}</text>
    <text class="fg" x="860" y="72" text-anchor="end" fill="${MUTED}" font-size="11">languages + commits</text>
  </g>

  <circle cx="${CX}" cy="${CY}" r="168" fill="url(#halo)"/>
  ${renderDonut(languages)}

  <circle cx="${CX}" cy="${CY}" r="${AVATAR_R + 9}" fill="none" stroke="${TEAL}" stroke-width="2.5" class="live" filter="url(#glow)"/>
  <circle cx="${CX}" cy="${CY}" r="${AVATAR_R + 13.5}" fill="none" stroke="${GOLD}" stroke-width="1.15" opacity="0.88"/>
  <image
    href="data:image/jpeg;base64,${avatarData}"
    xlink:href="data:image/jpeg;base64,${avatarData}"
    x="${CX - AVATAR_R}"
    y="${CY - AVATAR_R}"
    width="${AVATAR_R * 2}"
    height="${AVATAR_R * 2}"
    clip-path="url(#avatarClip)"
    preserveAspectRatio="xMidYMid slice"
  />
  <circle cx="${CX}" cy="${CY}" r="${AVATAR_R}" fill="none" stroke="#071018" stroke-width="1.2"/>

  ${renderPills(languages)}

  <line x1="40" y1="422" x2="860" y2="422" stroke="#243044"/>
  <text class="fg" x="40" y="442" fill="${TEAL}" font-size="11" letter-spacing="1.8">RECENT COMMITS</text>
  <g class="fg">${renderCommits(commits)}</g>
</svg>
`;
}

async function firstOk(tasks) {
  let lastError;
  for (const task of tasks) {
    try {
      const value = await task();
      if (value && (Array.isArray(value) ? value.length : true)) return value;
    } catch (error) {
      lastError = error;
      console.error(error.message);
    }
  }
  if (lastError) throw lastError;
  return [];
}

async function main() {
  const avatarData = readFileSync(AVATAR_FILE).toString("base64");
  let languages = [];
  let commits = [];

  if (TOKEN) {
    try {
      const bundle = await fetchFromGraphql();
      languages = bundle.languages;
      commits = bundle.commits;
    } catch (error) {
      console.error("GraphQL failed:", error.message);
    }
  }

  if (languages.length === 0) {
    try {
      languages = await firstOk([fetchLanguagesHtml, fetchLanguagesRest]);
    } catch (error) {
      console.error("Language fetch failed:", error.message);
    }
  }

  if (commits.length === 0) {
    const commitSources = [fetchCommitsFromAtom];
    if (TOKEN) commitSources.push(fetchCommitsFromEvents);
    try {
      commits = await firstOk(commitSources);
    } catch (error) {
      console.error("Commit fetch failed:", error.message);
    }
  }

  languages = await withIcons(rankLanguages(languages));
  if (languages.length === 0) {
    languages = await withIcons(
      rankLanguages([
        { name: "C#", bytes: 8, color: LANG_COLORS["C#"] },
        { name: "Java", bytes: 4, color: LANG_COLORS.Java },
        { name: "Python", bytes: 3, color: LANG_COLORS.Python },
        { name: "Lua", bytes: 2, color: LANG_COLORS.Lua },
        { name: "JavaScript", bytes: 1, color: LANG_COLORS.JavaScript },
        { name: "CSS", bytes: 1, color: LANG_COLORS.CSS },
      ]),
    );
  }

  mkdirSync(join(ROOT, "widgets"), { recursive: true });
  writeFileSync(OUT_FILE, renderCard({ avatarData, languages, commits }));
  console.log(`Wrote ${OUT_FILE}`);
  console.log(
    "Languages:",
    languages.map((l) => `${l.name} ${Math.round(l.pct * 100)}%`).join(", ") || "(none)",
  );
  console.log(
    "Commits:",
    commits.map((c) => `${c.repo}: ${c.message}`).join(" | ") || "(none)",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
