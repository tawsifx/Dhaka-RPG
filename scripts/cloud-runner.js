// scripts/cloud-runner.js - 24/7 Autonomous Cloud Coding Agent for GitHub Actions
// Powered by Gemini Flash (Runs when Mac is turned off)

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const prompt = process.env.PROMPT || process.argv[2] || '';
const apiKey = process.env.GEMINI_API_KEY || process.env.ANTIGRAVITY_API_KEY || '';
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.CHAT_ID || process.env.ALLOWED_CHAT_ID || '';
const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log('🤖 [Cloud Runner] Starting autonomous code execution...');
console.log('📝 Prompt:', prompt);
console.log('🎯 Preferred Model:', preferredModel);

// Helper to send messages directly to Telegram from GitHub Actions
async function notifyTelegram(message) {
  if (!telegramToken || !chatId) return;
  try {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });

    await new Promise((resolve) => {
      const req = https.request('https://api.telegram.org/bot' + telegramToken + '/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      });
      req.on('error', () => resolve());
      req.write(payload);
      req.end();
    });
  } catch (e) {
    console.warn('[Telegram] Notification warning:', e.message);
  }
}

// Call Google Generative AI (Gemini Flash) with automatic candidate fallback
async function callGemini(key, systemInstruction, userContent) {
  const candidateModels = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastError = null;

  for (const model of candidateModels) {
    try {
      console.log(`[Gemini API] Querying model: ${model}...`);
      const response = await queryGeminiEndpoint(key, model, systemInstruction, userContent);
      if (response) {
        console.log(`[Gemini API] Successfully received response from ${model}`);
        return { text: response, modelUsed: model };
      }
    } catch (err) {
      console.warn(`[Gemini API] Model ${model} returned error: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
}

function queryGeminiEndpoint(key, model, systemInstruction, userContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 8192
      }
    });

    const req = https.request(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return resolve(text);
              reject(new Error(`No candidate text in response: ${data.slice(0, 300)}`));
            } catch (jsonErr) {
              reject(jsonErr);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 400)}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Robust fuzzy search and replace inside file content
function applySearchReplace(fileContent, searchChunk, replaceChunk) {
  // 1. Direct exact match
  if (fileContent.includes(searchChunk)) {
    return fileContent.replace(searchChunk, replaceChunk);
  }

  // 2. Normalize CRLF and retry
  const normFile = fileContent.replace(/\r\n/g, '\n');
  const normSearch = searchChunk.replace(/\r\n/g, '\n');
  const normReplace = replaceChunk.replace(/\r\n/g, '\n');

  if (normFile.includes(normSearch)) {
    return normFile.replace(normSearch, normReplace);
  }

  // 3. Line-by-line trimmed match
  const fileLines = normFile.split('\n');
  const searchLines = normSearch.split('\n');

  // Strip empty leading/trailing lines from search chunk
  while (searchLines.length > 0 && searchLines[0].trim() === '') searchLines.shift();
  while (searchLines.length > 0 && searchLines[searchLines.length - 1].trim() === '') searchLines.pop();

  if (searchLines.length === 0) return null;

  for (let i = 0; i <= fileLines.length - searchLines.length; i++) {
    let match = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (fileLines[i + j].trim() !== searchLines[j].trim()) {
        match = false;
        break;
      }
    }
    if (match) {
      const before = fileLines.slice(0, i);
      const after = fileLines.slice(i + searchLines.length);
      return [...before, normReplace, ...after].join('\n');
    }
  }

  return null;
}

// Parse Gemini diff format and apply to files on disk
function parseAndApplyDiffs(geminiOutput) {
  const modifiedFiles = new Set();
  const backups = new Map();

  // Pattern 1: SEARCH / REPLACE blocks
  // FILE: <filename>
  // <<<<<<< SEARCH
  // ...
  // =======
  // ...
  // >>>>>>>
  const blockRegex = /FILE:\s*([^\r\n]+)\s*<<<<<<<\s*SEARCH\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>>/g;
  let match;
  let blocksApplied = 0;

  while ((match = blockRegex.exec(geminiOutput)) !== null) {
    const rawFilePath = match[1].trim().replace(/^['"`]|['"`]$/g, '');
    const searchChunk = match[2];
    const replaceChunk = match[3];

    const targetFile = path.resolve(rootDir, rawFilePath);
    if (!targetFile.startsWith(rootDir) || !fs.existsSync(targetFile)) {
      console.warn(`[Diff] Target file not found: ${rawFilePath}`);
      continue;
    }

    if (!backups.has(targetFile)) {
      backups.set(targetFile, fs.readFileSync(targetFile, 'utf8'));
    }

    const currentContent = fs.readFileSync(targetFile, 'utf8');
    const updatedContent = applySearchReplace(currentContent, searchChunk, replaceChunk);

    if (updatedContent && updatedContent !== currentContent) {
      fs.writeFileSync(targetFile, updatedContent, 'utf8');
      modifiedFiles.add(rawFilePath);
      blocksApplied++;
      console.log(`[Diff] Applied search/replace chunk in: ${rawFilePath}`);
    } else {
      console.warn(`[Diff] Could not locate exact search block in: ${rawFilePath}`);
    }
  }

  // Pattern 2: CREATE / OVERWRITE file
  // CREATE: <filename>
  // <<<<<<< CONTENT
  // ...
  // >>>>>>>
  const createRegex = /CREATE:\s*([^\r\n]+)\s*<<<<<<<\s*CONTENT\s*\n([\s\S]*?)\n>>>>>>>/g;
  while ((match = createRegex.exec(geminiOutput)) !== null) {
    const rawFilePath = match[1].trim().replace(/^['"`]|['"`]$/g, '');
    const content = match[2];

    const targetFile = path.resolve(rootDir, rawFilePath);
    if (!targetFile.startsWith(rootDir)) continue;

    if (fs.existsSync(targetFile) && !backups.has(targetFile)) {
      backups.set(targetFile, fs.readFileSync(targetFile, 'utf8'));
    }

    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, content, 'utf8');
    modifiedFiles.add(rawFilePath);
    console.log(`[Diff] Created/Overwrote file: ${rawFilePath}`);
  }

  return {
    modifiedFiles: Array.from(modifiedFiles),
    blocksApplied,
    backups
  };
}

async function main() {
  if (!prompt) {
    console.log('No prompt specified. Exiting.');
    return;
  }

  if (!apiKey) {
    const errorNote =
      '⚠️ *[24/7 Cloud Runner Notice]*\n\n' +
      '`GEMINI_API_KEY` is not configured in your GitHub Repository Secrets!\n\n' +
      'To enable autonomous coding while your Mac is turned off:\n' +
      '1. Get a free API key at: [Google AI Studio](https://aistudio.google.com/app/apikey)\n' +
      '2. Add it as `GEMINI_API_KEY` in: [GitHub Repo Secrets](https://github.com/tawsifx/Dhaka-RPG/settings/secrets/actions)\n\n' +
      `Your prompt was: _"${prompt}"_`;
    console.error(errorNote);
    await notifyTelegram(errorNote);
    process.exit(0);
  }

  await notifyTelegram(`🧠 *[Gemini Cloud Agent]* Analyzing codebase and planning changes for: _"${prompt}"_...`);

  // Assemble codebase context
  const indexHtml = fs.existsSync(path.join(rootDir, 'index.html'))
    ? fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8')
    : '';

  const styleCss = fs.existsSync(path.join(rootDir, 'style.css'))
    ? fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8')
    : '';

  const gameJs = fs.existsSync(path.join(rootDir, 'game.js'))
    ? fs.readFileSync(path.join(rootDir, 'game.js'), 'utf8')
    : '';

  const systemInstruction = `You are an elite, autonomous full-stack game developer working on Dhaka-RPG ("Totoro & Moon Walker: Chronicles of the Six Realms").
The game runs on Phaser 3 with HTML5/CSS overlay HUD elements.
Your role: fulfill the user's prompt by directly modifying project files.

IMPORTANT FORMAT REQUIREMENTS:
To avoid output token limits on large files, NEVER output the full file.
Instead, output targeted SEARCH / REPLACE blocks:

FILE: <relative_path>
<<<<<<< SEARCH
<exact lines from the existing file to replace>
=======
<new updated replacement lines>
>>>>>>>

If you need to create a new file or replace a small file completely:
CREATE: <relative_path>
<<<<<<< CONTENT
<file content>
>>>>>>>

RULES:
1. Provide valid, working JavaScript / CSS / HTML code.
2. The search block must match exact characters and lines from the provided files.
3. Be precise and surgical in your edits.
4. Output ONLY the file edit blocks. Do NOT include polite chatter or conversational text outside the blocks.`;

  const userContent = `User Instruction: "${prompt}"

Current Project Files:

=== FILE: index.html ===
${indexHtml}

=== FILE: style.css ===
${styleCss}

=== FILE: game.js (Core Game Logic & Phaser Setup) ===
${gameJs}
`;

  console.log('[Cloud Runner] Sending instruction and codebase context to Gemini...');
  const { text: geminiOutput, modelUsed } = await callGemini(apiKey, systemInstruction, userContent);

  console.log('\n--- Gemini Output ---');
  console.log(geminiOutput);
  console.log('---------------------\n');

  const { modifiedFiles, blocksApplied, backups } = parseAndApplyDiffs(geminiOutput);

  if (modifiedFiles.length === 0) {
    console.log('ℹ️ No files were modified by the model diffs.');
    return;
  }

  // Syntax validation
  if (modifiedFiles.includes('game.js')) {
    try {
      console.log('🔍 Validating JavaScript syntax for game.js...');
      execSync('node -c game.js', { cwd: rootDir, stdio: 'pipe' });
      console.log('✅ Syntax check passed cleanly!');
    } catch (syntaxErr) {
      console.error('❌ Syntax validation failed! Rolling back changes to preserve game stability...');
      for (const [filePath, originalContent] of backups.entries()) {
        fs.writeFileSync(filePath, originalContent, 'utf8');
      }
      const rollbackMsg = `⚠️ *[Gemini Cloud Agent] Syntax Warning*\nGemini attempted an edit, but syntax validation failed:\n\`${syntaxErr.message.slice(0, 300)}\`\nChanges were rolled back to prevent breaking the live game.`;
      await notifyTelegram(rollbackMsg);
      throw syntaxErr;
    }
  }

  const fileListStr = modifiedFiles.map(f => `\`${f}\``).join(', ');
  await notifyTelegram(`🛠️ *[Gemini Cloud Agent]* Successfully applied code edits using *${modelUsed}* in: ${fileListStr}\n🚀 Committing to GitHub and deploying to Vercel...`);
  console.log(`🎉 Cloud execution complete. Modified: ${fileListStr}`);
}

main().catch(async (err) => {
  console.error('Fatal Cloud Runner Error:', err);
  await notifyTelegram(`❌ *[Gemini Cloud Agent Error]*\n\`${err.message}\``);
  process.exit(1);
});
