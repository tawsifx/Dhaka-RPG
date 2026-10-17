// telegram-bot.js - Local Telegram Automation Bridge for Antigravity & Vercel
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Enhance PATH to ensure agy, git, npx, node, and vercel are discoverable across macOS and Linux
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
const extraPaths = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  path.join(homeDir, '.local', 'bin'),
  path.join(homeDir, '.gemini', 'bin'),
  path.join(homeDir, '.npm-global', 'bin'),
  process.env.PATH || ''
];
process.env.PATH = extraPaths.filter(Boolean).join(':');

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedChatId = process.env.ALLOWED_CHAT_ID;

if (!token || !allowedChatId) {
  console.error('\n❌ ERROR: Missing TELEGRAM_BOT_TOKEN or ALLOWED_CHAT_ID in .env file.');
  console.error('Please configure your .env file with:');
  console.error('  TELEGRAM_BOT_TOKEN=your_bot_token_here');
  console.error('  ALLOWED_CHAT_ID=your_numeric_chat_id_here\n');
  process.exit(1);
}

// 1. Use node-telegram-bot-api in long polling mode (polling: true). No webhooks or open ports needed.
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Telegram Antigravity Bridge started in long-polling mode.');
console.log(`🔒 Allowed Chat ID: ${allowedChatId}`);
console.log('Waiting for instructions from authorized user...\n');

// Concurrency lock to prevent race conditions from overlapping messages
let isProcessing = false;

function executeCommand(command, args, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      cwd,
      env: process.env,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });

    proc.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        const error = new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}.\n${stderr || stdout}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function extractVercelUrl(output) {
  if (!output) return null;
  // Match standard Vercel production domains (https://xxx.vercel.app)
  const vercelMatch = output.match(/https:\/\/[a-zA-Z0-9-._]+\.vercel\.app/i);
  if (vercelMatch) return vercelMatch[0];

  // Match general URL if custom domain or other URL is outputted
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
  const text = msg.text ? msg.text.trim() : null;

  // 2. Reject messages from any other chat ID
  if (chatId !== String(allowedChatId).trim()) {
    console.warn(`[SECURITY] Rejected message from unauthorized Chat ID: ${chatId}`);
    try {
      await bot.sendMessage(
        msg.chat.id,
        `⛔ Unauthorized: Your Chat ID (${chatId}) is not permitted to issue commands to this bot.`
      );
    } catch (e) {
      console.error('Failed to send rejection message:', e.message);
    }
    return;
  }

  if (!text) {
    return; // Ignore non-text messages (stickers, media, etc.)
  }

  // Handle basic help/status ping
  if (text === '/start' || text === '/ping') {
    await bot.sendMessage(chatId, '👋 Antigravity Bridge is online and ready for instructions.');
    return;
  }

  if (isProcessing) {
    await bot.sendMessage(chatId, '⏳ A task is already in progress. Please wait for it to finish before sending another instruction.');
    return;
  }

  isProcessing = true;
  console.log(`\n📨 Received instruction from Chat ID ${chatId}: "${text}"`);

  try {
    // 3a. Send an immediate Telegram reply: "⚙️ Processing instruction with Antigravity..."
    await bot.sendMessage(chatId, '⚙️ Processing instruction with Antigravity...');

    // 3b. Execute instruction across this codebase using the Antigravity CLI:
    // agy -p "<user_message>" --dangerously-skip-permissions
    console.log('[STEP 1/3] Executing Antigravity CLI...');
    await executeCommand('agy', ['-p', JSON.stringify(text), '--dangerously-skip-permissions']);

    // 3c. Stage and commit changes to local git:
    // git add -A && git commit -m "Update via Telegram: <prompt_snippet>"
    console.log('[STEP 2/3] Staging and committing changes to local git...');
    const promptSnippet = text.slice(0, 50).replace(/["`$\r\n]/g, ' ').trim();
    await executeCommand('git', ['add', '-A']);

    // Check if there are changes to commit
    const gitStatus = await executeCommand('git', ['status', '--porcelain']).catch(() => ({ stdout: '' }));
    if (gitStatus.stdout.trim()) {
      await executeCommand('git', ['commit', '-m', `"Update via Telegram: ${promptSnippet}"`]);
    } else {
      console.log('ℹ️ No unstaged changes detected. Creating empty commit to record prompt update...');
      await executeCommand('git', ['commit', '--allow-empty', '-m', `"Update via Telegram: ${promptSnippet}"`]);
    }

    // 3d. Deploy to Vercel production non-interactively:
    // npx vercel --prod --yes
    console.log('[STEP 3/3] Deploying to Vercel production...');
    const vercelResult = await executeCommand('npx', ['vercel', '--prod', '--yes']);
    const combinedOutput = `${vercelResult.stdout}\n${vercelResult.stderr}`;

    // 3e. Extract the live URL from the deployment output and reply to Telegram:
    // "✅ Deployed successfully!\n🔗 <live_url>"
    const liveUrl = extractVercelUrl(combinedOutput) || 'https://dhaka-date-rpg.vercel.app';
    const successReply = `✅ Deployed successfully!\n🔗 ${liveUrl}`;
    console.log(`🎉 Deployment complete: ${liveUrl}`);
    await bot.sendMessage(chatId, successReply);

  } catch (error) {
    // 3f. Catch and report any execution errors directly back to Telegram
    console.error('❌ Error executing automation pipeline:', error);
    const errorMessage = error.message || String(error);
    const formattedError = `❌ Execution Error:\n\n${errorMessage.slice(0, 3500)}`;
    try {
      await bot.sendMessage(chatId, formattedError);
    } catch (sendErr) {
      console.error('Failed to send error message to Telegram:', sendErr.message);
    }
  } finally {
    isProcessing = false;
  }
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping Telegram bot...');
  bot.stopPolling().then(() => process.exit(0));
});
