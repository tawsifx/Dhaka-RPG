// api/telegram-webhook.js - 24/7 Serverless Webhook for Telegram -> GitHub Actions
// Hosted on Vercel (https://moonwalkersday.vercel.app/api/telegram-webhook)

const https = require('https');

function sendTelegramMessage(token, chatId, text) {
  return new Promise((resolve) => {
    if (!token || !chatId) return resolve();
    const payload = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });

    const req = https.request(
      `https://api.telegram.org/bot${token}/sendMessage`,
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
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', () => resolve());
    req.write(payload);
    req.end();
  });
}

function triggerGitHubActions(owner, repo, ghToken, eventType, clientPayload) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event_type: eventType,
      client_payload: clientPayload
    });

    const req = https.request(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Dhaka-RPG-Telegram-Bridge',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            reject(new Error(`GitHub API HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Telegram Webhook is live. Send POST updates here.' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedChatId = String(process.env.ALLOWED_CHAT_ID || '').trim();
  const ghToken = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER || 'tawsifx';
  const repoName = process.env.GITHUB_REPO_NAME || 'Dhaka-RPG';

  const body = req.body || {};
  const message = body.message || body.edited_message;

  if (!message) {
    return res.status(200).json({ ok: true, note: 'No message object found in update' });
  }

  const chatId = String(message.chat?.id || '').trim();
  const text = (message.text || '').trim();
  const userName = message.from?.username ? `@${message.from.username}` : (message.from?.first_name || 'User');

  // Security check: Ignore unauthorized chat IDs
  if (allowedChatId && chatId !== allowedChatId) {
    console.warn(`[UNAUTHORIZED] Message blocked from chat ID: ${chatId}`);
    return res.status(200).json({ ok: true, error: 'Unauthorized chat ID' });
  }

  // Handle /start or greeting
  if (text === '/start' || text === '/help') {
    await sendTelegramMessage(
      token,
      chatId,
      '🕹️ *Connected to Dhaka-RPG 24/7 Cloud Bridge!*\n\n' +
      'Your bot is running in the cloud via Vercel & GitHub Actions — your Mac does not need to stay on.\n\n' +
      '• Send any game design prompt or instruction.\n' +
      '• GitHub Actions will execute the workflow and auto-deploy to Vercel.\n' +
      '• Type `/status` to view the cloud runner health.'
    );
    return res.status(200).json({ ok: true });
  }

  // Handle /status
  if (text === '/status') {
    await sendTelegramMessage(
      token,
      chatId,
      '🟢 *24/7 Cloud Bridge Active*\n\n' +
      `• *Repository:* [${repoOwner}/${repoName}](https://github.com/${repoOwner}/${repoName})\n` +
      '• *Live Game:* https://moonwalkersday.vercel.app\n' +
      '• *Runner:* GitHub Actions (cloud-hosted, 24/7)'
    );
    return res.status(200).json({ ok: true });
  }

  if (!text) {
    await sendTelegramMessage(
      token,
      chatId,
      '📎 Attachment received. Note: For media downloads, the local bot daemon can store files in `/assets`.'
    );
    return res.status(200).json({ ok: true });
  }

  // Check GitHub Token configuration
  if (!ghToken) {
    const errorMsg = '⚠️ *GitHub Token Missing!*\nPlease set `GH_PAT` or `GITHUB_TOKEN` in your Vercel Environment Variables so the webhook can dispatch GitHub Actions workflows.';
    await sendTelegramMessage(token, chatId, errorMsg);
    return res.status(200).json({ ok: false, error: 'Missing GitHub Token in Vercel' });
  }

  // Acknowledge receipt immediately to user
  await sendTelegramMessage(
    token,
    chatId,
    `⚡ *24/7 Cloud Dispatch Received!*\n\n📝 _"${text}"_\n\nTriggering GitHub Actions runner in the cloud...`
  );

  try {
    await triggerGitHubActions(repoOwner, repoName, ghToken, 'telegram_instruction', {
      prompt: text,
      chat_id: chatId,
      user: userName,
      message_id: message.message_id
    });

    return res.status(200).json({ ok: true, dispatched: true });
  } catch (err) {
    console.error('Failed to dispatch GitHub Action:', err);
    await sendTelegramMessage(
      token,
      chatId,
      `❌ *Error triggering GitHub Action:*\n\`${err.message}\``
    );
    return res.status(200).json({ ok: false, error: err.message });
  }
};
