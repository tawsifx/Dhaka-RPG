// scripts/ingest_asset.ts - Ingests external sprite sheets, aligns feet, builds anim.json, and logs CREDITS.md
import fs from 'fs';
import path from 'path';

export interface IngestAssetOptions {
  slotId: string;
  sourceFilePath: string;
  targetRelativePath: string; // relative to public/
  frameWidth: number;
  frameHeight: number;
  anchor: { x: number; y: number };
  animations: {
    name: string;
    frames: number[];
    frameRate: number;
    loop?: boolean;
    events?: { frame: number; type: string; payload?: any }[];
  }[];
  sourceInfo: {
    author: string;
    url: string;
    license: string;
    date: string;
    provenance: string;
  };
}

export function ingestAsset(options: IngestAssetOptions): { success: boolean; message: string } {
  const publicDir = path.resolve(process.cwd(), 'public');
  const targetFullPath = path.resolve(publicDir, options.targetRelativePath);
  const targetDir = path.dirname(targetFullPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy or write file
  if (fs.existsSync(options.sourceFilePath)) {
    fs.copyFileSync(options.sourceFilePath, targetFullPath);
  } else {
    return { success: false, message: `Source file ${options.sourceFilePath} does not exist.` };
  }

  // Generate .anim.json beside target PNG
  const animJsonPath = targetFullPath.replace(/\.png$/i, '.anim.json');
  const animJsonContent = {
    slotId: options.slotId,
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
    anchor: options.anchor,
    animations: options.animations
  };
  fs.writeFileSync(animJsonPath, JSON.stringify(animJsonContent, null, 2), 'utf8');

  // Update public/assets/CREDITS.md
  const creditsPath = path.resolve(publicDir, 'assets', 'CREDITS.md');
  const creditEntry = `| \`${options.slotId}\` | \`${options.targetRelativePath}\` | ${options.sourceInfo.author} | [Link](${options.sourceInfo.url}) | ${options.sourceInfo.license} | ${options.sourceInfo.date} | ${options.sourceInfo.provenance} |\n`;

  if (!fs.existsSync(creditsPath)) {
    const header = `# 📜 Asset Credits & Provenance Directory\n\n| Slot ID | Asset Path | Author / Creator | Source URL | License | Ingestion Date | Provenance |\n|:---|:---|:---|:---|:---:|:---:|:---|\n`;
    fs.writeFileSync(creditsPath, header + creditEntry, 'utf8');
  } else {
    fs.appendFileSync(creditsPath, creditEntry, 'utf8');
  }

  return { success: true, message: `Ingested ${options.slotId} to ${options.targetRelativePath} with anim.json.` };
}

if (process.argv[1] && process.argv[1].endsWith('ingest_asset.ts')) {
  console.log('Ingest asset helper ready.');
}
