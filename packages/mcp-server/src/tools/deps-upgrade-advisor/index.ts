import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { execFileAsync } from '../../lib/process-utils';
import {
  type DepsUpgradeAdvisorDeps,
  createDepsUpgradeAdvisorService,
} from './deps-upgrade-advisor.service';
import {
  DepsUpgradeAdvisorInputSchema,
  DepsUpgradeAdvisorOutputSchema,
} from './schema';

export function registerDepsUpgradeAdvisorTool(
  server: McpServer,
  rootPath?: string,
) {
  return registerDepsUpgradeAdvisorToolWithDeps(
    server,
    createDepsUpgradeAdvisorDeps(rootPath),
  );
}

export function registerDepsUpgradeAdvisorToolWithDeps(
  server: McpServer,
  deps: DepsUpgradeAdvisorDeps,
) {
  const service = createDepsUpgradeAdvisorService(deps);

  return server.registerTool(
    'deps_upgrade_advisor',
    {
      description:
        'Analyze outdated dependencies and return risk-bucketed upgrade recommendations',
      inputSchema: DepsUpgradeAdvisorInputSchema,
      outputSchema: DepsUpgradeAdvisorOutputSchema,
    },
    async (input) => {
      try {
        const parsed = DepsUpgradeAdvisorInputSchema.parse(input);
        const result = await service.advise(parsed);

        return {
          structuredContent: result,
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `deps_upgrade_advisor failed: ${toErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}

function createDepsUpgradeAdvisorDeps(
  rootPath = process.cwd(),
): DepsUpgradeAdvisorDeps {
  return {
    async executeCommand(command, args) {
      try {
        const result = await execFileAsync(command, args, {
          cwd: rootPath,
          maxBuffer: 1024 * 1024 * 10,
        });

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: 0,
        };
      } catch (error) {
        if (isExecError(error)) {
          return {
            stdout: error.stdout ?? '',
            stderr: error.stderr ?? '',
            exitCode: error.code,
          };
        }

        throw error;
      }
    },
    nowIso() {
      return new Date().toISOString();
    },
  };
}

interface ExecError extends Error {
  code: number;
  stdout?: string;
  stderr?: string;
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && 'code' in error;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export {
  createDepsUpgradeAdvisorService,
  type DepsUpgradeAdvisorDeps,
} from './deps-upgrade-advisor.service';
export type { DepsUpgradeAdvisorOutput } from './schema';
