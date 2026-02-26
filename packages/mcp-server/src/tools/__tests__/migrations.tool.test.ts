import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MigrationsTool } from '../migrations';

const { crossExecFileSyncMock } = vi.hoisted(() => ({
  crossExecFileSyncMock: vi.fn(() => Buffer.from('ok')),
}));

vi.mock('../../lib/process-utils', () => ({
  crossExecFileSync: crossExecFileSyncMock,
}));

describe('MigrationsTool', () => {
  beforeEach(() => {
    crossExecFileSyncMock.mockClear();
  });

  afterEach(() => {
    // Reset to default
    MigrationsTool.setRootPath(process.cwd());
  });

  it('uses crossExecFileSync args for CreateMigration with safe name', () => {
    MigrationsTool.CreateMigration('add_users_table');

    expect(crossExecFileSyncMock).toHaveBeenCalledWith(
      'pnpm',
      ['--filter', 'web', 'supabase', 'migrations', 'new', 'add_users_table'],
      { cwd: process.cwd() },
    );
  });

  it('rejects unsafe migration names', () => {
    expect(() => MigrationsTool.CreateMigration('foo && rm -rf /')).toThrow(
      'Migration name must contain only letters, numbers, hyphens, or underscores',
    );

    expect(crossExecFileSyncMock).not.toHaveBeenCalled();
  });

  it('uses crossExecFileSync args for Diff', () => {
    MigrationsTool.Diff();

    expect(crossExecFileSyncMock).toHaveBeenCalledWith(
      'pnpm',
      ['--filter', 'web', 'supabase', 'db', 'diff'],
      { cwd: process.cwd() },
    );
  });

  it('uses custom rootPath after setRootPath', () => {
    MigrationsTool.setRootPath('/custom/project');

    MigrationsTool.CreateMigration('test_migration');

    expect(crossExecFileSyncMock).toHaveBeenCalledWith(
      'pnpm',
      ['--filter', 'web', 'supabase', 'migrations', 'new', 'test_migration'],
      { cwd: '/custom/project' },
    );
  });

  it('uses custom rootPath for Diff after setRootPath', () => {
    MigrationsTool.setRootPath('/custom/project');

    MigrationsTool.Diff();

    expect(crossExecFileSyncMock).toHaveBeenCalledWith(
      'pnpm',
      ['--filter', 'web', 'supabase', 'db', 'diff'],
      { cwd: '/custom/project' },
    );
  });
});
