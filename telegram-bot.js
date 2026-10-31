// telegram-bot.js - Local Telegram Automation Bridge for Antigravity & Cloudflare Pages
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const TelegramBot = require('node-telegram-bot-api');

// Enhance PATH so agy, git, npx, node, and wrangler are discoverable on macOS / Linux
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
const extraPaths = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  path.join(homeDir, '.local', 'bin'),
  path.join(homeDir, '.gemini', 'bin'),
  path.join(homeDir, '.npm-global', 'bin'),
  process.env.PATH || ''
];

const customEnv = {
  ...process.env,
  PATH: extraPaths.filter(Boolean).join(':'),
  CI: 'true',
  npm_config_yes: 'true'
};

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedChatId = process.env.ALLOWED_CHAT_ID;

if (!token || !allowedChatId) {
  console.error('\n❌ ERROR: Missing TELEGRAM_BOT_TOKEN or ALLOWED_CHAT_ID in .env');
  console.error('Please configure your .env file with:');
  console.error('  TELEGRAM_BOT_TOKEN="your_token_here"');
  console.error('  ALLOWED_CHAT_ID="your_chat_id_here"\n');
  process.exit(1);
}

// 1. Long polling mode (polling: true). No webhooks or open ports needed.
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram Antigravity Bridge started in long-polling mode.');
console.log(`🔒 Authorized Chat ID: ${allowedChatId}`);
console.log('Waiting for instructions or media from authorized user...\n');

let isProcessing = false;

function killProcessGroup(proc, signal = 'SIGTERM') {
  if (!proc || !proc.pid) return;
  try {
    process.kill(-proc.pid, signal);
  } catch (e1) {
    try {
      proc.kill(signal);
    } catch (e2) {}
  }
}

function runCommand(cmd, args, maxTimeoutMs = 0, onProgress = null) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] ${cmd} ${args.join(' ')}`);
    const isAgy = cmd === 'agy' || (args && args.some(a => String(a).includes('agy')));

    const proc = spawn(cmd, args, {
      cwd: __dirname,
      env: customEnv,
      shell: true,
      detached: true // allows process group kill (-proc.pid)
    });

    let stdout = '';
    let stderr = '';
    let overallTimer = null;
    let inactivityTimer = null;
    let progressTimer = null;
    let settled = false;

    const cleanup = () => {
      if (overallTimer) clearTimeout(overallTimer);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (progressTimer) clearInterval(progressTimer);
    };

    const terminate = (reason) => {
      if (settled) return;
      settled = true;
      cleanup();
      console.warn(`[TIMEOUT] Process group ${proc.pid} terminated: ${reason}`);
      killProcessGroup(proc, 'SIGTERM');
      setTimeout(() => killProcessGroup(proc, 'SIGKILL'), 3000);
      const timeoutErr = new Error(`Command failed: ${reason}\n${cmd} ${args.join(' ')}`);
      reject(timeoutErr);
    };

    // Absolute hard ceiling (only if explicitly specified > 0 and NOT isAgy)
    if (maxTimeoutMs > 0 && isFinite(maxTimeoutMs) && !isAgy) {
      overallTimer = setTimeout(() => {
        terminate(`Exceeded maximum overall runtime ceiling (${maxTimeoutMs / 60000} mins)`);
      }, maxTimeoutMs);
    }

    // Dynamic inactivity watchdog (only if explicitly specified > 0 and NOT isAgy)
    if (maxTimeoutMs > 0 && isFinite(maxTimeoutMs) && !isAgy) {
      const INACTIVITY_LIMIT_MS = 600000;
      const resetInactivityWatchdog = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          terminate(`Process was idle for ${INACTIVITY_LIMIT_MS / 60000} minutes`);
        }, INACTIVITY_LIMIT_MS);
      };
      resetInactivityWatchdog();
    }

    if (onProgress && typeof onProgress === 'function') {
      let elapsed = 0;
      progressTimer = setInterval(() => {
        elapsed += 20;
        onProgress(elapsed);
      }, 20000);
    }

    proc.stdout.on('data', (d) => {
      const str = d.toString();
      stdout += str;
      process.stdout.write(str);
    });

    proc.stderr.on('data', (d) => {
      const str = d.toString();
      stderr += str;
      process.stderr.write(str);
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      cleanup();

      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        const err = new Error(`Command "${cmd} ${args.join(' ')}" failed with exit code ${code}.\n${stderr || stdout}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });
  });
}

// Inspect Antigravity CLI transcript and workspace to determine current activity
function getAgyLiveStatus() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const brainDir = path.join(homeDir, '.gemini', 'antigravity-cli', 'brain');
  let actionInfo = 'Analyzing codebase and planning changes...';
  let stepNumber = null;

  if (fs.existsSync(brainDir)) {
    try {
      const convs = fs.readdirSync(brainDir).map(f => {
        try {
          return { name: f, mtime: fs.statSync(path.join(brainDir, f)).mtimeMs };
        } catch (e) { return null; }
      }).filter(Boolean).sort((a, b) => b.mtime - a.mtime);

      if (convs.length > 0) {
        const transcriptPath = path.join(brainDir, convs[0].name, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(transcriptPath)) {
          const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
          for (let i = lines.length - 1; i >= 0 && i >= lines.length - 15; i--) {
            try {
              const step = JSON.parse(lines[i]);
              if (stepNumber === null && step.step_index !== undefined) {
                stepNumber = step.step_index;
              }
              if (step.tool_calls && step.tool_calls.length > 0) {
                const tc = step.tool_calls[0];
                const args = tc.args || {};
                let desc = args.toolAction || args.toolSummary || args.Description || args.Instruction;
                if (desc) {
                  desc = String(desc).replace(/^"|"$/g, '');
                  actionInfo = `${tc.name}: ${desc}`;
                  break;
                } else if (args.CommandLine) {
                  actionInfo = `run_command: ${String(args.CommandLine).replace(/^"|"$/g, '').slice(0, 50)}`;
                  break;
                } else if (args.TargetFile) {
                  actionInfo = `${tc.name}: ${path.basename(String(args.TargetFile).replace(/^"|"$/g, ''))}`;
                  break;
                } else {
                  actionInfo = `Executing ${tc.name}`;
                  break;
                }
              } else if (step.thinking) {
                const t = step.thinking.trim().split('\n')[0];
                actionInfo = `Thinking: ${t.slice(0, 70)}...`;
                break;
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }

  // Check git modified files
  let modifiedFiles = '';
  try {
    const { execSync } = require('child_process');
    const gitOut = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf8' });
    const mods = gitOut.trim().split('\n').filter(Boolean).map(l => l.trim().split(/\s+/)[1]).filter(Boolean);
    if (mods.length > 0) {
      modifiedFiles = mods.slice(0, 3).join(', ') + (mods.length > 3 ? ` (+${mods.length - 3} more)` : '');
    }
  } catch (e) {}

  return { stepNumber, actionInfo, modifiedFiles };
}

// Helper to download image and audio files into the assets directory
async function handleMediaDownload(msg) {
  let fileId = null;
  let targetSubdir = 'images';
  let desiredFileName = null;

  // 1. Photos
  if (msg.photo && msg.photo.length > 0) {
    const highestQualityPhoto = msg.photo[msg.photo.length - 1];
    fileId = highestQualityPhoto.file_id;
    targetSubdir = 'images';
    desiredFileName = `photo_${Date.now()}.jpg`;
  }
  // 2. Audio tracks
  else if (msg.audio) {
    fileId = msg.audio.file_id;
    targetSubdir = 'audio';
    desiredFileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
  }
  // 3. Voice notes
  else if (msg.voice) {
    fileId = msg.voice.file_id;
    targetSubdir = 'audio';
    desiredFileName = `voice_${Date.now()}.ogg`;
  }
  // 4. Documents (Uncompressed audio/images)
  else if (msg.document) {
    fileId = msg.document.file_id;
    const docName = msg.document.file_name || `doc_${Date.now()}`;
    const mime = (msg.document.mime_type || '').toLowerCase();

    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(docName)) {
      targetSubdir = 'audio';
    } else if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(docName)) {
      targetSubdir = 'images';
    } else {
      targetSubdir = 'images';
    }
    desiredFileName = docName;
  }

  if (!fileId) return null;

  // Ensure public/assets destination directory exists
  const targetDir = path.join(__dirname, 'public', 'assets', targetSubdir);
  fs.mkdirSync(targetDir, { recursive: true });

  // Download via Telegram Bot API
  const tempPath = await bot.downloadFile(fileId, targetDir);
  let finalPath = tempPath;

  if (desiredFileName) {
    const safeName = desiredFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    finalPath = path.join(targetDir, safeName);
    if (tempPath !== finalPath) {
      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }
      fs.renameSync(tempPath, finalPath);
    }
  }

  const relativePath = path.relative(__dirname, finalPath);
  return { relativePath, finalPath, targetSubdir, fileName: path.basename(finalPath) };
}

async function pushToGitHub() {
  const ghPat = process.env.GH_PAT;
  const owner = process.env.GITHUB_REPO_OWNER || 'tawsifx';
  const repo = process.env.GITHUB_REPO_NAME || 'Dhaka-RPG';
  try {
    await runCommand('git', ['config', 'user.name', '"Dhaka-RPG Bot"'], 5000).catch(() => {});
    await runCommand('git', ['config', 'user.email', '"bot@dhaka-rpg.local"'], 5000).catch(() => {});
    if (ghPat) {
      await runCommand('git', ['push', `https://${ghPat}@github.com/${owner}/${repo}.git`, 'main'], 60000);
    } else {
      await runCommand('git', ['push', 'origin', 'main'], 60000);
    }
    console.log('[GIT] Pushed updates to GitHub main branch.');
  } catch (pushErr) {
    console.warn('[GIT] Push notice:', pushErr.message);
  }
}

bot.on('message', async (msg) => {
  const chatId = String(msg.chat.id);

  // Security: Validate msg.chat.id against process.env.ALLOWED_CHAT_ID. Reject all other incoming messages immediately.
  if (chatId !== String(allowedChatId).trim()) {
    console.warn(`[SECURITY] Rejected unauthorized message from chat ID: ${chatId}`);
    try {
      await bot.sendMessage(
        msg.chat.id,
        `⛔ Unauthorized: Access denied for chat ID ${chatId}.`
      );
    } catch (e) {
      console.error('Failed to send rejection message:', e.message);
    }
    return;
  }

  const text = (msg.text || '').trim();

  // Reply to /start with: "🕹️ Connected to your Mac! Send any game design instruction."
  if (text === '/start') {
    await bot.sendMessage(chatId, '🕹️ Connected to your Mac! Send any game design instruction, or send /status to check current activity.');
    return;
  }

  // Reply to /status with real-time Antigravity activity
  if (text === '/status') {
    if (isProcessing) {
      const live = getAgyLiveStatus();
      const stepStr = live.stepNumber !== null ? ` (Step ${live.stepNumber})` : '';
      const actionStr = live.actionInfo ? `\n🛠️ Action: ${live.actionInfo}` : '';
      const modsStr = live.modifiedFiles ? `\n📁 Files changed: ${live.modifiedFiles}` : '';
      await bot.sendMessage(chatId, `⚙️ Antigravity is currently busy:${stepStr}${actionStr}${modsStr}`);
    } else {
      await bot.sendMessage(chatId, '✅ Antigravity is idle. Send any game design instruction.');
    }
    return;
  }

  if (isProcessing) {
    await bot.sendMessage(chatId, '⏳ An instruction is currently being processed. Send /status to see live progress.');
    return;
  }

  isProcessing = true;

  // Check if message contains media (photo, audio, voice, or document)
  const isMedia = Boolean(msg.photo || msg.audio || msg.voice || msg.document);
  let mediaResult = null;

  try {
    if (isMedia) {
      const downloadingMsg = await bot.sendMessage(chatId, '📥 Downloading file into assets directory...');
      mediaResult = await handleMediaDownload(msg);
      console.log(`[ASSET] Saved media to: ${mediaResult.relativePath}`);

      // If no caption is attached, simply save and commit the new asset
      const caption = (msg.caption || '').trim();
      if (!caption) {
        await bot.sendMessage(
          chatId,
          `✅ Saved file to \`${mediaResult.relativePath}\`!`,
          { parse_mode: 'Markdown' }
        );

        // Auto-commit new asset locally
        try {
          await runCommand('git', ['add', mediaResult.relativePath], 60000);
          await runCommand('git', ['commit', '-m', `"Add asset via Telegram: ${mediaResult.fileName}"`], 60000);
          console.log(`[GIT] Committed new asset: ${mediaResult.fileName}`);
          await pushToGitHub();
        } catch (gitErr) {
          console.warn('⚠️ Git commit warning (ignored):', gitErr.message);
        }

        isProcessing = false;
        return;
      }
    }

    const promptText = (msg.caption || msg.text || '').trim();
    if (!promptText) {
      isProcessing = false;
      return;
    }

    // If an asset was sent WITH a caption, supply the file location to Antigravity
    let effectiveInstruction = promptText;
    if (mediaResult) {
      effectiveInstruction = `The user uploaded an asset saved at "${mediaResult.relativePath}". ${promptText}`;
    }

    // Direct Mode directive: ensures Antigravity auto-writes and applies file changes directly to disk
    effectiveInstruction += '\n[System Directive: Directly apply all necessary file modifications to disk in this folder. Do not prompt for confirmation.]';

    console.log(`\n📨 Processing instruction from Chat ID ${chatId}: "${effectiveInstruction}"`);

    // a. Send a Telegram status message: "⚙️ Running instruction: <prompt>..."
    const statusMsg = await bot.sendMessage(chatId, `⚙️ Running instruction: "${promptText}"...`);

    console.log('[STEP 1/3] Running Antigravity CLI...');
    // Clean up any stale headless CLI server instances or locks
    try {
      await runCommand('pkill', ['-f', '"agy --app_data_dir=antigravity-cli"'], 5000).catch(() => {});
    } catch (cleanErr) {}

    const onAgyProgress = async (elapsedSeconds) => {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      const live = getAgyLiveStatus();
      const stepStr = live.stepNumber !== null ? ` (Step ${live.stepNumber})` : '';
      const actionStr = live.actionInfo ? `\n🛠️ Action: ${live.actionInfo}` : '';
      const modsStr = live.modifiedFiles ? `\n📁 Files changed: ${live.modifiedFiles}` : '';

      const progressText = `⚙️ Working on instruction: "${promptText}"\n⏱️ Elapsed: ${timeStr}${stepStr}${actionStr}${modsStr}`;

      try {
        if (statusMsg) {
          await bot.editMessageText(progressText, {
            chat_id: chatId,
            message_id: statusMsg.message_id
          });
        }
      } catch (e) {
        if (!e.message || !e.message.includes('not modified')) {
          console.warn('⚠️ Progress edit warning:', e.message);
        }
      }
    };

    const escapedPrompt = effectiveInstruction.replace(/"/g, '\\"');
    await runCommand('agy', ['-p', `"${escapedPrompt}"`, '--dangerously-skip-permissions'], 0, onAgyProgress);

    // c. Auto-commit changes locally: git add -A && git commit -m "Auto-update: <prompt_snippet>"
    console.log('[STEP 2/3] Auto-committing changes locally...');
    const promptSnippet = promptText.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
    try {
      await runCommand('git', ['add', '-A'], 0);
      const gitStatus = await runCommand('git', ['status', '--porcelain'], 0).catch(() => ({ stdout: '' }));
      if (gitStatus.stdout.trim()) {
        await runCommand('git', ['commit', '-m', `"Auto-update: ${promptSnippet}"`], 0);
        await pushToGitHub();
      } else {
        console.log('ℹ️ No file changes detected to commit.');
      }
    } catch (gitErr) {
      console.warn('⚠️ Git auto-commit warning (safely ignored):', gitErr.message);
    }

    // d. Update the Telegram status message: "🚀 Edits applied! Deploying to Cloudflare Pages..."
    console.log('[STEP 3/3] Deploying to Cloudflare Pages...');
    try {
      if (statusMsg) {
        await bot.editMessageText('🚀 Edits applied! Deploying to Cloudflare Pages...', {
          chat_id: chatId,
          message_id: statusMsg.message_id
        });
      } else {
        await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Cloudflare Pages...');
      }
    } catch (editErr) {
      await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Cloudflare Pages...');
    }

    // e. Execute npm run deploy:cf to push to Cloudflare Pages
    await runCommand('npm', ['run', 'deploy:cf'], 0);

    // f. Send final confirmation link
    const liveUrl = 'https://moon-walkers-day.pages.dev';
    const finalReply = `✅ Deployed successfully to Cloudflare Pages!\n🔗 ${liveUrl}`;
    console.log(`🎉 Complete: ${liveUrl}`);
    await bot.sendMessage(chatId, finalReply);

  } catch (error) {
    // Check if valid file modifications were already written to disk before error/timeout
    let salvaged = false;
    try {
      const gitStatus = await runCommand('git', ['status', '--porcelain'], 0).catch(() => ({ stdout: '' }));
      if (gitStatus.stdout && gitStatus.stdout.trim()) {
        if (fs.existsSync(path.join(__dirname, 'game.js'))) {
          await runCommand('node', ['-c', 'game.js'], 0);
        } else {
          await runCommand('npm', ['run', 'typecheck'], 0);
        }
        console.log('💡 Code modifications are valid! Salvaging work, committing and deploying...');
        await bot.sendMessage(chatId, '⚠️ Execution interrupted, but code modifications were validated! Auto-committing and deploying to Cloudflare Pages...');
        const promptSnippet = promptText.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
        await runCommand('git', ['add', '-A'], 0);
        await runCommand('git', ['commit', '-m', `"Auto-update: ${promptSnippet}"`], 0);
        await pushToGitHub();
        await runCommand('npm', ['run', 'deploy:cf'], 0);
        const liveUrl = 'https://moon-walkers-day.pages.dev';
        await bot.sendMessage(chatId, `✅ Deployed successfully to Cloudflare Pages!\n🔗 ${liveUrl}`);
        salvaged = true;
      }
    } catch (salvageErr) {
      console.warn('Could not auto-salvage:', salvageErr.message);
    }

    if (!salvaged) {
      // g. Catch any errors and report the error trace back to Telegram
      console.error('❌ Pipeline execution error:', error);
      const errorTrace = error.stack || error.message || String(error);
      const formattedError = `❌ Execution Error Trace:\n\n${errorTrace.slice(0, 3500)}`;
      try {
        await bot.sendMessage(chatId, formattedError);
      } catch (sendErr) {
        console.error('Failed to report error trace to Telegram:', sendErr.message);
      }
    }
  } finally {
    isProcessing = false;
  }
});

// Graceful termination
const shutdown = () => {
  console.log('\n🛑 Stopping Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
