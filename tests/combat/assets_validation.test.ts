// tests/combat/assets_validation.test.ts - Asset Validation Unit Test Suite
import { describe, it, expect } from 'vitest';
import { validateAssets } from '../../scripts/validate_assets';
import { generateAssetReport } from '../../scripts/report_assets';

describe('Asset Validation & Reporting Engine', () => {
  it('validates all manifest entries, telegraphs, and attack timings', () => {
    const report = validateAssets();
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.coverage.totalSlots).toBeGreaterThan(50);
  });

  it('generates coverage markdown table and updates ASSET_SHOPPING_LIST.md', () => {
    const table = generateAssetReport();
    expect(table).toContain('| Slot ID | Category |');
    expect(table).toContain('Status');
  });
});
