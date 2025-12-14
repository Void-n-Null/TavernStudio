import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

type FileMetrics = {
  filePath: string;
  relPath: string;
  totalLines: number;
  nonEmptyLines: number;
  functionLikeCount: number;
  jsxMaxDepth: number;
  score: number;
  tier: Tier;
  notes: string[];
};

type Options = {
  rootDir: string;
  include: RegExp;
  exclude: RegExp;
  top: number;
  all: boolean;
  minScore: number;
};

function parseArgs(argv: string[]): Partial<Options> {
  const out: Partial<Options> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];

    if (a === '--root' || a === '-r') {
      out.rootDir = argv[i + 1] ?? out.rootDir;
      i += 1;
      continue;
    }

    if (a === '--top' || a === '-t') {
      const v = Number(argv[i + 1]);
      if (!Number.isNaN(v)) out.top = v;
      i += 1;
      continue;
    }

    if (a === '--all') {
      out.all = true;
      continue;
    }

    if (a === '--min-score') {
      const v = Number(argv[i + 1]);
      if (!Number.isNaN(v)) out.minScore = v;
      i += 1;
      continue;
    }

    if (a === '--help' || a === '-h') {
      // eslint-disable-next-line no-console
      console.log(`\nDivide or be Conquered Tierlist\n\nUsage:\n  bun run scripts/divide-or-be-conquered-tierlist.ts [options]\n\nOptions:\n  --root, -r <dir>       Root directory to scan (default: src)\n  --top, -t <n>          Show top N files (default: 25)\n  --all                  Print all matching files (ignores --top)\n  --min-score <n>        Only show files with score >= n (default: 0)\n`);
      process.exit(0);
    }
  }

  return out;
}

function normalizePosix(p: string): string {
  return p.split(path.sep).join('/');
}

async function collectFiles(rootAbs: string, include: RegExp, exclude: RegExp): Promise<string[]> {
  const out: string[] = [];

  async function walk(dirAbs: string): Promise<void> {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const ent of entries) {
      const abs = path.join(dirAbs, ent.name);
      const rel = normalizePosix(path.relative(rootAbs, abs));

      if (exclude.test(rel)) continue;

      if (ent.isDirectory()) {
        await walk(abs);
        continue;
      }

      if (!ent.isFile()) continue;
      if (!include.test(rel)) continue;

      out.push(abs);
    }
  }

  await walk(rootAbs);
  return out;
}

function countLines(text: string): { total: number; nonEmpty: number } {
  const lines = text.split(/\r?\n/);
  let nonEmpty = 0;
  for (const l of lines) {
    if (l.trim().length > 0) nonEmpty += 1;
  }
  return { total: lines.length, nonEmpty };
}

function countFunctionLikes(sourceFile: ts.SourceFile): number {
  let count = 0;
  const visit = (node: ts.Node) => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return count;
}

function computeJsxMaxDepth(sourceFile: ts.SourceFile): number {
  let max = 0;

  const visitJsx = (node: ts.Node, depth: number) => {
    if (ts.isJsxElement(node)) {
      const nextDepth = depth + 1;
      if (nextDepth > max) max = nextDepth;
      for (const child of node.children) {
        visitJsx(child, nextDepth);
      }
      return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const nextDepth = depth + 1;
      if (nextDepth > max) max = nextDepth;
      return;
    }

    if (ts.isJsxFragment(node)) {
      const nextDepth = depth + 1;
      if (nextDepth > max) max = nextDepth;
      for (const child of node.children) {
        visitJsx(child, nextDepth);
      }
      return;
    }

    ts.forEachChild(node, (c) => visitJsx(c, depth));
  };

  visitJsx(sourceFile, 0);
  return max;
}

function tierFromScore(score: number): Tier {
  if (score >= 90) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 35) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function scoreFile(m: Omit<FileMetrics, 'score' | 'tier' | 'notes'>): { score: number; tier: Tier; notes: string[] } {
  const notes: string[] = [];

  // LOC weight (non-empty)
  const locPoints = Math.min(60, Math.floor(m.nonEmptyLines / 10));
  if (m.nonEmptyLines >= 300) notes.push(`big file: ${m.nonEmptyLines} non-empty lines`);

  // Function-like density
  const fnPoints = Math.min(30, m.functionLikeCount * 2);
  if (m.functionLikeCount >= 30) notes.push(`too many functions: ${m.functionLikeCount}`);

  // JSX nesting is the "god component" smell
  const jsxPoints = Math.min(50, m.jsxMaxDepth * 5);
  if (m.jsxMaxDepth >= 8) notes.push(`deep JSX nesting: ${m.jsxMaxDepth}`);

  let score = locPoints + fnPoints + jsxPoints;

  // Bonus penalty for the true horrors
  if (m.nonEmptyLines >= 800) {
    score += 15;
    notes.push('monolith alert: >= 800 non-empty lines');
  }
  if (m.jsxMaxDepth >= 12) {
    score += 10;
    notes.push('JSX trench warfare: depth >= 12');
  }

  score = Math.min(100, score);
  const tier = tierFromScore(score);

  return { score, tier, notes };
}

function formatRow(m: FileMetrics): string {
  const loc = String(m.nonEmptyLines).padStart(4);
  const fn = String(m.functionLikeCount).padStart(3);
  const jsx = String(m.jsxMaxDepth).padStart(2);
  const sc = String(m.score).padStart(3);
  return `${m.tier}  score=${sc}  loc=${loc}  fn=${fn}  jsx=${jsx}  ${m.relPath}`;
}

async function analyzeFile(repoRootAbs: string, fileAbs: string): Promise<FileMetrics | null> {
  let text: string;
  try {
    text = await fs.readFile(fileAbs, 'utf8');
  } catch {
    return null;
  }

  const { total, nonEmpty } = countLines(text);

  const sourceFile = ts.createSourceFile(
    fileAbs,
    text,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    fileAbs.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const functionLikeCount = countFunctionLikes(sourceFile);
  const jsxMaxDepth = computeJsxMaxDepth(sourceFile);
  const relPath = normalizePosix(path.relative(repoRootAbs, fileAbs));

  const base = {
    filePath: fileAbs,
    relPath,
    totalLines: total,
    nonEmptyLines: nonEmpty,
    functionLikeCount,
    jsxMaxDepth,
  };

  const { score, tier, notes } = scoreFile(base);

  return {
    ...base,
    score,
    tier,
    notes,
  };
}

async function main(): Promise<void> {
  const repoRootAbs = process.cwd();

  const defaults: Options = {
    rootDir: 'src',
    include: /\.(ts|tsx)$/i,
    exclude: /^(?:\.git|node_modules|dist|build|coverage|out)\b|\b(?:\.d\.ts)$|\b(?:bun\.lock|package-lock\.json)$/i,
    top: 25,
    all: false,
    minScore: 0,
  };

  const parsed = parseArgs(process.argv.slice(2));
  const opts: Options = { ...defaults, ...parsed };

  const rootAbs = path.isAbsolute(opts.rootDir) ? opts.rootDir : path.join(repoRootAbs, opts.rootDir);

  const files = await collectFiles(rootAbs, opts.include, opts.exclude);

  const results: FileMetrics[] = [];
  for (const f of files) {
    const r = await analyzeFile(repoRootAbs, f);
    if (r) results.push(r);
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.nonEmptyLines !== a.nonEmptyLines) return b.nonEmptyLines - a.nonEmptyLines;
    return a.relPath.localeCompare(b.relPath);
  });

  const filtered = results.filter((r) => r.score >= opts.minScore);
  const shown = opts.all ? filtered : filtered.slice(0, opts.top);

  // eslint-disable-next-line no-console
  console.log(`\nDivide or be Conquered Tierlist\nroot=${normalizePosix(path.relative(repoRootAbs, rootAbs))}  files=${results.length}  shown=${shown.length}\n`);

  let currentTier: Tier | null = null;
  for (const r of shown) {
    if (r.tier !== currentTier) {
      currentTier = r.tier;
      // eslint-disable-next-line no-console
      console.log(`\n=== TIER ${currentTier} ===`);
    }

    // eslint-disable-next-line no-console
    console.log(formatRow(r));

    if (r.notes.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`    - ${r.notes.join(' | ')}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\nTip: run with --all or --min-score 50 to focus on the worst offenders.');
}

void main();
