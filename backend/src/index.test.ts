import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('placeholder: @team-task-tracker/backend', () => {
  it('placeholder test exposes the package name', () => {
    expect(packageName).toBe('@team-task-tracker/backend');
  });
});
