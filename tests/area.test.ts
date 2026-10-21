import { classifyArea } from "@/classify/area.js";
import type { Area } from "@/types.js";
import { describe, expect, it } from "vitest";

const CASES: Array<[string, Area]> = [
  ["src/auth/oauth.ts", "auth"],
  ["src/auth/session.ts", "auth"],
  ["src/middleware/auth.ts", "auth"],
  ["lib/auth/password.ts", "auth"],
  ["src/migrations/001_users.sql", "db"],
  ["prisma/schema.prisma", "db"],
  ["src/models/user.ts", "db"],
  ["src/repositories/user.ts", "db"],
  ["src/api/users.ts", "api"],
  ["src/routes/v1.ts", "api"],
  ["src/controllers/users.ts", "api"],
  ["src/services/email.ts", "api"],
  ["src/handlers/webhook.ts", "api"],
  ["src/graphql/schema.ts", "api"],
  ["src/app/api/route.ts", "api"],
  ["src/pages/api/hello.ts", "api"],
  ["src/components/Button.tsx", "ui"],
  ["src/app/page.tsx", "ui"],
  ["src/pages/index.tsx", "ui"],
  ["src/hooks/useQuery.ts", "ui"],
  ["src/lib/ui/render.ts", "ui"],
  ["Button.stories.tsx", "ui"],
  ["__tests__/auth.test.ts", "tests"],
  ["src/specs/login.spec.ts", "tests"],
  ["cypress/e2e/login.cy.ts", "tests"],
  ["vitest.config.ts", "tests"],
  [".github/workflows/ci.yml", "ci"],
  ["Dockerfile", "ci"],
  ["docker-compose.yml", "ci"],
  ["docs/README.md", "docs"],
  ["CHANGELOG.md", "docs"],
  ["package.json", "deps"],
  ["package-lock.json", "deps"],
  ["go.mod", "deps"],
  ["tsconfig.json", "config"],
  [".eslintrc.js", "config"],
  ["scripts/deploy.sh", "scripts"],
  ["src/utils/helper.ts", "core"],
  ["src/lib/utils.ts", "core"],
  ["random/unknown.xyz", "core"],
];

describe("classifyArea", () => {
  it.each(CASES)("classifies %p as %s", (path, expected) => {
    expect(classifyArea(path)).toBe(expected);
  });
});
