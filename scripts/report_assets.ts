// scripts/report_assets.ts - Generates Asset Coverage Table and Shopping List
import fs from 'fs';
import path from 'path';
import { ASSET_SPECS_MANIFEST } from '../src/config/assetSpecs.manifest';

export function generateAssetReport(): string {
  const rows: string[] = [];
  rows.push('| Slot ID | Category | Target PNG Path | Frame Size | Status | Provenance / Source |');
  rows.push('|:---|:---|:---|:---:|:---:|:---|');

  const shoppingItems: string[] = [];
  shoppingItems.push('# 🛒 Asset Shopping List for Totoro & Moon Walker Combat Overhaul\n');
  shoppingItems.push('> Generated automatically by `scripts/report_assets.ts`.\n');
  shoppingItems.push('| Slot ID | Preferred Frame Size | Frame Count / Layout | Drop Path | Search Tags / Brief |\n|:---|:---:|:---|:---|:---|\n');

  for (const [id, spec] of Object.entries(ASSET_SPECS_MANIFEST)) {
    const fullPath = path.resolve(process.cwd(), 'public', spec.externalPath);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅ External PNG' : '🟧 Fallback Placeholder';
    const source = spec.source?.license ? `${spec.source.license} (${spec.source.author || 'Authored'})` : 'Procedural Fallback';
    const size = `${spec.recommendedDownloadSpecs.preferredFrameSize.width}x${spec.recommendedDownloadSpecs.preferredFrameSize.height}px`;

    rows.push(`| \`${id}\` | ${spec.category} | \`${spec.externalPath}\` | ${size} | ${status} | ${source} |`);

    if (!exists && ['enemy', 'boss'].includes(spec.category)) {
      shoppingItems.push(`| \`${id}\` | ${size} | ${spec.recommendedDownloadSpecs.sheetLayout} | \`${spec.externalPath}\` | ${spec.recommendedDownloadSpecs.styleSearchTags.join(', ')} |`);
    }
  }

  // Write ASSET_SHOPPING_LIST.md
  const shoppingListPath = path.resolve(process.cwd(), 'ASSET_SHOPPING_LIST.md');
  fs.writeFileSync(shoppingListPath, shoppingItems.join('\n'), 'utf8');

  return rows.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('report_assets.ts')) {
  console.log('📊 Generating Asset Coverage Report...\n');
  const table = generateAssetReport();
  console.log(table);
  console.log('\n📄 Updated ASSET_SHOPPING_LIST.md successfully.');
}
