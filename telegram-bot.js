// telegram-bot.js - Local Telegram Automation Bridge for Antigravity & Vercel
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const TelegramBot = require('node-telegram-bot-api');

// Enhance PATH so agy, git, npx, node, and vercel are discoverable on macOS / Linux
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

function runCommand(cmd, args, maxTimeoutMs = 2700000, onProgress = null) {
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
    let agyGraceTimer = null;
    let settled = false;

    // Track active state to prevent premature timeouts while work is being actively done
    let lastStepOrAction = '';

    const cleanup = () => {
      if (overallTimer) clearTimeout(overallTimer);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (progressTimer) clearInterval(progressTimer);
      if (agyGraceTimer) clearTimeout(agyGraceTimer);
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

    // Absolute hard ceiling (45 minutes)
    if (maxTimeoutMs > 0) {
      overallTimer = setTimeout(() => {
        terminate(`Exceeded maximum overall runtime ceiling (${maxTimeoutMs / 60000} mins)`);
      }, maxTimeoutMs);
    }

    // Dynamic inactivity watchdog: 6 minutes of ZERO progress or tool actions before timing out
    const INACTIVITY_LIMIT_MS = 360000;
    const resetInactivityWatchdog = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        terminate(`Process was idle with no steps, tool calls, or output for ${INACTIVITY_LIMIT_MS / 60000} minutes`);
      }, INACTIVITY_LIMIT_MS);
    };
    resetInactivityWatchdog();

    if (onProgress && typeof onProgress === 'function') {
      let elapsed = 0;
      progressTimer = setInterval(() => {
        elapsed += 20;

        // Check live activity to reset watchdog if Antigravity is making progress
        if (isAgy) {
          try {
            const live = getAgyLiveStatus();
            const currentSignature = `${live.stepNumber || ''}_${live.actionInfo || ''}_${live.modifiedFiles || ''}`;
            if (currentSignature && currentSignature !== lastStepOrAction) {
              lastStepOrAction = currentSignature;
              resetInactivityWatchdog();
            }
          } catch (e) {}
        }

        onProgress(elapsed);
      }, 20000);
    }

    proc.stdout.on('data', (d) => {
      const str = d.toString();
      stdout += str;
      process.stdout.write(str);

      // If Antigravity CLI has printed its final response in print mode,
      // the CLI has completed its code generation. If it lingers in shutdown,
      // trigger a grace timer to gracefully wrap up after 12 seconds.
      if (isAgy && (stdout.length > 50 || str.includes('```') || str.includes('Files Changed') || str.includes('Summary'))) {
        if (!agyGraceTimer) {
          agyGraceTimer = setTimeout(() => {
            if (!settled) {
              console.log('ℹ️ Antigravity CLI finished output. Completing cleanly...');
              killProcessGroup(proc, 'SIGTERM');
            }
          }, 15000);
        }
      }
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

      // If agy was terminated by our grace timer after printing its answer, treat as success
      if (isAgy && (code === 0 || code === null || code === 143) && stdout.trim().length > 0) {
        resolve({ stdout, stderr, code: 0 });
        return;
      }

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

function extractVercelUrl(output) {
  if (!output) return null;
  const match = output.match(/https:\/\/[a-zA-Z0-9-._]+\.vercel\.app/i);
  if (match) return match[0];

  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const urlMatch = line.match(/https:\/\/[^\s]+/i);
    if (urlMatch && !urlMatch[0].includes('github.com') && !urlMatch[0].includes('npmjs.com')) {
      return urlMatch[0];
    }
  }
  return null;
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

  // Ensure assets destination directory exists
  const targetDir = path.join(__dirname, 'assets', targetSubdir);
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
    await runCommand('agy', ['-p', `"${escapedPrompt}"`, '--dangerously-skip-permissions'], 900000, onAgyProgress);

    // c. Auto-commit changes locally: git add -A && git commit -m "Auto-update: <prompt_snippet>"
    console.log('[STEP 2/3] Auto-committing changes locally...');
    const promptSnippet = promptText.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
    try {
      await runCommand('git', ['add', '-A'], 60000);
      const gitStatus = await runCommand('git', ['status', '--porcelain'], 30000).catch(() => ({ stdout: '' }));
      if (gitStatus.stdout.trim()) {
        await runCommand('git', ['commit', '-m', `"Auto-update: ${promptSnippet}"`], 60000);
      } else {
        console.log('ℹ️ No file changes detected to commit.');
      }
    } catch (gitErr) {
      console.warn('⚠️ Git auto-commit warning (safely ignored):', gitErr.message);
    }

    // d. Update the Telegram status message: "🚀 Edits applied! Deploying to Vercel..."
    console.log('[STEP 3/3] Deploying to Vercel...');
    try {
      if (statusMsg) {
        await bot.editMessageText('🚀 Edits applied! Deploying to Vercel...', {
          chat_id: chatId,
          message_id: statusMsg.message_id
        });
      } else {
        await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Vercel...');
      }
    } catch (editErr) {
      await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Vercel...');
    }

    // e. Execute npx vercel --prod --yes to push the production build
    const vercelRes = await runCommand('npx', ['vercel', '--prod', '--yes'], 180000);
    const vercelOutput = `${vercelRes.stdout}\n${vercelRes.stderr}`;

    // f. Extract the live https://*.vercel.app URL and send final confirmation link
    const liveUrl = extractVercelUrl(vercelOutput) || 'https://dhaka-date-rpg.vercel.app';
    const finalReply = `✅ Deployed successfully!\n🔗 ${liveUrl}`;
    console.log(`🎉 Complete: ${liveUrl}`);
    await bot.sendMessage(chatId, finalReply);

  } catch (error) {
    // Check if valid file modifications were already written to disk before error/timeout
    let salvaged = false;
    try {
      const gitStatus = await runCommand('git', ['status', '--porcelain'], 20000).catch(() => ({ stdout: '' }));
      if (gitStatus.stdout && gitStatus.stdout.trim()) {
        await runCommand('node', ['-c', 'game.js'], 20000);
        console.log('💡 Code modifications are valid! Salvaging work, committing and deploying...');
        await bot.sendMessage(chatId, '⚠️ Prompt reached inactivity boundary, but code modifications were validated! Auto-committing and deploying to Vercel...');
        const promptSnippet = promptText.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
        await runCommand('git', ['add', '-A'], 60000);
        await runCommand('git', ['commit', '-m', `"Auto-update: ${promptSnippet}"`], 60000);
        const vercelRes = await runCommand('npx', ['vercel', '--prod', '--yes'], 180000);
        const liveUrl = extractVercelUrl(`${vercelRes.stdout}\n${vercelRes.stderr}`) || 'https://dhaka-date-rpg.vercel.app';
        await bot.sendMessage(chatId, `✅ Deployed successfully!\n🔗 ${liveUrl}`);
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
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});
