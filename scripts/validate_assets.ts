// scripts/validate_assets.ts - Validates assets against the manifest & design rules
import fs from 'fs';
import path from 'path';
import { ASSET_SPECS_MANIFEST } from '../src/config/assetSpecs.manifest';
import { validateAttacks } from '../src/config/attacks.db';

export interface AssetValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  coverage: {
    totalSlots: number;
    externalLoaded: number;
    placeholderFallback: number;
    combatSlots: number;
    combatExternal: number;
    combatPlaceholder: number;
  };
}

export function validateAssets(): AssetValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const attackValidation = validateAttacks();
  if (!attackValidation.valid) {
    errors.push(...attackValidation.errors);
  }

  let totalSlots = 0;
  let externalLoaded = 0;
  let placeholderFallback = 0;
  let combatSlots = 0;
  let combatExternal = 0;
  let combatPlaceholder = 0;

  const combatCategories = ['enemy', 'boss'];

  for (const [id, spec] of Object.entries(ASSET_SPECS_MANIFEST)) {
    totalSlots++;
    const isCombat = combatCategories.includes(spec.category) || spec.attackRefs !== undefined;
    if (isCombat) combatSlots++;

    const fullPath = path.resolve(process.cwd(), 'public', spec.externalPath);
    const exists = fs.existsSync(fullPath);

    if (Boolean(spec.hasExternalFile) !== exists) {
      errors.push(`Manifest desync for slot "${id}": hasExternalFile is ${spec.hasExternalFile} but disk exists is ${exists} at ${fullPath}.`);
    }

    if (exists) {
      externalLoaded++;
      if (isCombat) combatExternal++;

      // Check if .anim.json exists beside animated sheets
      if (/\.png$/i.test(fullPath)) {
        const animPath = fullPath.replace(/\.png$/i, '.anim.json');
        if (fs.existsSync(animPath)) {
          try {
            const animData = JSON.parse(fs.readFileSync(animPath, 'utf8'));
            if (!Array.isArray(animData.frames) && !animData.animations) {
              errors.push(`Invalid anim.json at ${animPath}: missing frames or animations.`);
            }
          } catch (e: any) {
            errors.push(`Malformed JSON in ${animPath}: ${e.message}`);
          }
        }
      }
    } else {
      placeholderFallback++;
      if (isCombat) combatPlaceholder++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    coverage: {
      totalSlots,
      externalLoaded,
      placeholderFallback,
      combatSlots,
      combatExternal,
      combatPlaceholder
    }
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate_assets.ts')) {
  console.log('🔍 Running Asset & Combat Validation...');
  const report = validateAssets();

  console.log('\n--- Coverage Summary ---');
  console.log(`Total Asset Slots: ${report.coverage.totalSlots}`);
  console.log(`External Loaded: ${report.coverage.externalLoaded}`);
  console.log(`Procedural/Placeholder Fallbacks: ${report.coverage.placeholderFallback}`);
  console.log(`Combat Slots: ${report.coverage.combatSlots} (External: ${report.coverage.combatExternal}, Fallback: ${report.coverage.combatPlaceholder})`);

  if (report.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    report.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (!report.valid) {
    console.error('\n❌ Validation Errors:');
    report.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ All asset specifications, attack rules, and telegraphs are 100% VALID.');
  }
}
