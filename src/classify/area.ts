import type { Area } from "../types.js";

interface AreaRule {
  area: Area;
  patterns: RegExp[];
}

const RULES: AreaRule[] = [
  {
    area: "tests",
    patterns: [
      /(^|\/)(__tests__|tests?|specs?|testing|fixtures|snapshots?|mocks?)\//i,
      /\.(test|spec)\.[jt]sx?$/i,
      /\.test\.(py|go|rs|rb)$/i,
      /(^|\/)cypress\//i,
      /(^|\/)(vitest|jest)\.config\./i,
    ],
  },
  {
    area: "ci",
    patterns: [
      /(^|\/)\.github\/(workflows|actions)\//i,
      /(^|\/)\.(gitlab-ci|circleci|travis|buildkite)/i,
      /(^|\/)(Jenkinsfile|azure-pipelines|\.drone)/i,
      /(^|\/)Dockerfile/i,
      /(^|\/)docker-compose/i,
      /(^|\/)\.husky\//i,
      /(^|\/)(Makefile|Taskfile)/i,
    ],
  },
  {
    area: "deps",
    patterns: [
      /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|go\.sum|poetry\.lock|Pipfile\.lock|composer\.lock)$/i,
      /(^|\/)(package\.json|Cargo\.toml|go\.mod|pyproject\.toml|requirements.*\.txt|Gemfile|composer\.json)$/i,
    ],
  },
  {
    area: "docs",
    patterns: [
      /\.(md|mdx|rst|adoc|txt)$/i,
      /(^|\/)(docs?|documentation|examples?|samples?|tutorials?)\//i,
      /(^|\/)(CHANGELOG|README|CONTRIBUTING|LICENSE|AUTHORS|CODE_OF_CONDUCT)/i,
    ],
  },
  {
    area: "styles",
    patterns: [
      /\.(css|scss|sass|less|styl|stylus)$/i,
      /(^|\/)(styles?|themes?|tokens?|tailwind)\//i,
      /(tailwind|postcss|vanilla-extract)\.config\./i,
    ],
  },
  {
    area: "scripts",
    patterns: [
      /(^|\/)(scripts?|bin|tools?|codegen)\//i,
      /\.(sh|bash|zsh|ps1)$/i,
    ],
  },
  {
    area: "config",
    patterns: [
      /(^|\/)\.env(\..+)?$/i,
      /\.(ya?ml|toml|ini|conf|config|rc)$/i,
      /\.(eslint|prettier|editorconfig)rc(\..+)?$/i,
      /(^|\/)(tsconfig|jsconfig|eslint|prettier|biome|webpack|vite|rollup|esbuild|babel|turbo|nx)\b/i,
      /(^|\/)\.?(nvmrc|node-version|python-version|tool-versions)$/i,
      /(^|\/)(next|nuxt|svelte|astro)\.config\./i,
    ],
  },
  {
    area: "auth",
    patterns: [
      /(^|\/)(auth|oauth|session|login|logout|signin|signup|jwt|token|credential)/i,
      /(password|permission|rbac|sso|mfa|2fa)/i,
      /(middleware\/auth|withAuth|useAuth|AuthProvider)/i,
    ],
  },
  {
    area: "api",
    patterns: [
      /(^|\/)(api|routes?|controllers?|endpoints?|handlers?|graphql|rpc)/i,
      /(^|\/)(server|backend|services?|jobs?|queues?|workers?|webhooks?)\//i,
      /\.(service|controller|handler|resolver|middleware)\./i,
      /(^|\/)app\/api\//i,
      /(^|\/)pages\/api\//i,
    ],
  },
  {
    area: "ui",
    patterns: [
      /(^|\/)(components?|pages?|views?|screens?|layouts?|widgets?|panels?|dialogs?|modals?|menus?|forms?)/i,
      /\.(tsx|jsx|vue|svelte|astro)$/i,
      /(^|\/)(app\/(page|layout|loading|error)|pages\/)/i,
      /(^|\/)(hooks?|stores?|contexts?|providers?|state)\//i,
      /(^|\/)(lib|utils?)\/(ui|render)/i,
      /\.stories\./i,
    ],
  },
  {
    area: "db",
    patterns: [
      /(^|\/)(migrations?|migrate|prisma|drizzle|alembic|knex)/i,
      /\.(sql|prisma)$/i,
      /(^|\/)(models?|entities|repositories|dao)\//i,
      /(query|queries|\.queries)\./i,
      /(^|\/)supabase\//i,
    ],
  },
];

const DEFAULT: Area = "core";

export function classifyArea(path: string): Area {
  const normalized = path.replace(/^["']|["']$/g, "");
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) return rule.area;
    }
  }
  return DEFAULT;
}

export const AREA_LABELS: Record<Area, string> = {
  api: "API & backend",
  ui: "UI & frontend",
  auth: "Auth & sessions",
  db: "Database & schema",
  tests: "Tests",
  ci: "CI & infrastructure",
  docs: "Docs",
  deps: "Dependencies",
  config: "Config",
  styles: "Styles & theming",
  core: "Core logic",
  scripts: "Scripts & tooling",
  other: "Other",
};
