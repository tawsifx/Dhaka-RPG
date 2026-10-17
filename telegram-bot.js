// telegram-bot.js - Local Telegram Automation Bridge for Antigravity & Vercel
require('dotenv/config');
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
console.log('Waiting for instructions from authorized user...\n');

let isProcessing = false;

function runCommand(cmd, args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      cwd: __dirname,
      env: customEnv,
      shell: true
    });

    let stdout = '';
    let stderr = '';
    let timer = null;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        try { proc.kill('SIGTERM'); } catch (e) {}
        const timeoutErr = new Error(`Command timed out after ${timeoutMs / 1000}s:\n${cmd} ${args.join(' ')}`);
        reject(timeoutErr);
      }, timeoutMs);
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
      if (timer) clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
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

function extractVercelUrl(output) {
  if (!output) return null;
  // Match standard production URL: https://*.vercel.app
  const match = output.match(/https:\/\/[a-zA-Z0-9-._]+\.vercel\.app/i);
  if (match) return match[0];

  // Match general https url fallback
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const urlMatch = line.match(/https:\/\/[^\s]+/i);
    if (urlMatch && !urlMatch[0].includes('github.com') && !urlMatch[0].includes('npmjs.com')) {
      return urlMatch[0];
    }
  }
  return null;
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

  const text = msg.text ? msg.text.trim() : null;
  if (!text) return;

  // Reply to /start with: "🕹️ Connected to your Mac! Send any game design instruction."
  if (text === '/start') {
    await bot.sendMessage(chatId, '🕹️ Connected to your Mac! Send any game design instruction.');
    return;
  }

  if (isProcessing) {
    await bot.sendMessage(chatId, '⏳ An instruction is currently being processed. Please wait for it to complete.');
    return;
  }

  isProcessing = true;
  console.log(`\n📨 Received instruction from Chat ID ${chatId}: "${text}"`);

  let statusMsg = null;

  try {
    // a. Send a Telegram status message: "⚙️ Running instruction: <prompt>..."
    statusMsg = await bot.sendMessage(chatId, `⚙️ Running instruction: "${text}"...`);

    // b. Run headless Antigravity CLI with 5-minute timeout (300000ms) and CI: 'true', npm_config_yes: 'true'
    // agy -p "<escaped_prompt>" --dangerously-skip-permissions
    console.log('[STEP 1/3] Running Antigravity CLI...');
    const escapedPrompt = text.replace(/"/g, '\\"');
    await runCommand('agy', ['-p', `"${escapedPrompt}"`, '--dangerously-skip-permissions'], 300000);

    // c. Auto-commit changes locally: git add -A && git commit -m "Auto-update: <prompt_snippet>"
    console.log('[STEP 2/3] Auto-committing changes locally...');
    const promptSnippet = text.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
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
        statusMsg = await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Vercel...');
      }
    } catch (editErr) {
      await bot.sendMessage(chatId, '🚀 Edits applied! Deploying to Vercel...');
    }

    // e. Execute npx vercel --prod --yes to push the production build
    const vercelRes = await runCommand('npx', ['vercel', '--prod', '--yes'], 180000);
    const vercelOutput = `${vercelRes.stdout}\n${vercelRes.stderr}`;

    // f. Extract the live https://*.vercel.app URL from the output and send a final confirmation message with the link to Telegram
    const liveUrl = extractVercelUrl(vercelOutput) || 'https://dhaka-date-rpg.vercel.app';
    const finalReply = `✅ Deployed successfully!\n🔗 ${liveUrl}`;
    console.log(`🎉 Complete: ${liveUrl}`);
    await bot.sendMessage(chatId, finalReply);

  } catch (error) {
    // g. Catch any errors and report the error trace back to Telegram
    console.error('❌ Pipeline execution error:', error);
    const errorTrace = error.stack || error.message || String(error);
    const formattedError = `❌ Execution Error Trace:\n\n${errorTrace.slice(0, 3500)}`;
    try {
      await bot.sendMessage(chatId, formattedError);
    } catch (sendErr) {
      console.error('Failed to report error trace to Telegram:', sendErr.message);
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
