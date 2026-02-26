import { findWorkspaceRoot } from './tools/env/public-api';

export function resolveProjectRoot(argv: string[] = process.argv): string {
  // 1. CLI flag: --root /path
  const rootIdx = argv.indexOf('--root');

  if (rootIdx !== -1 && argv[rootIdx + 1]) {
    return argv[rootIdx + 1];
  }

  // 2. Env var
  if (process.env.MAKERKIT_PROJECT_ROOT) {
    return process.env.MAKERKIT_PROJECT_ROOT;
  }

  // 3. Auto-discovery (traverse up from cwd looking for pnpm-workspace.yaml)
  return findWorkspaceRoot(process.cwd());
}
