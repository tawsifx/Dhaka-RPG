// scripts/webhook-manager.js - Manage Telegram Webhook for 24/7 Cloud Bridge
require('dotenv/config');
const https = require('https');

const token = process.env.TELEGRAM_BOT_TOKEN;
const action = process.argv[2] || 'info';
const defaultWebhookUrl = 'https://moonwalkersday.vercel.app/api/telegram-webhook';
const webhookUrl = process.argv[3] || defaultWebhookUrl;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}

function callTelegramApi(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();
    const url = `https://api.telegram.org/bot${token}/${endpoint}${query ? '?' + query : ''}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log(`🤖 Telegram Webhook Manager (Action: ${action.toUpperCase()})\n`);

  if (action === 'set') {
    console.log(`Setting webhook to: ${webhookUrl}`);
    const res = await callTelegramApi('setWebhook', {
      url: webhookUrl,
      drop_pending_updates: 'true'
    });
    console.log('Result:', JSON.stringify(res, null, 2));
    if (res.ok) {
      console.log('\n✅ Webhook successfully connected!');
      console.log('Now Telegram messages will be sent directly to your 24/7 Vercel webhook, triggering GitHub Actions.');
    }
  } else if (action === 'delete') {
    console.log('Deleting webhook (switching back to local polling mode)...');
    const res = await callTelegramApi('deleteWebhook', { drop_pending_updates: 'false' });
    console.log('Result:', JSON.stringify(res, null, 2));
    if (res.ok) {
      console.log('\n✅ Webhook removed! You can now run `npm run bot` locally on your Mac.');
    }
  } else if (action === 'info') {
    console.log('Checking current webhook status...');
    const res = await callTelegramApi('getWebhookInfo');
    console.log('Result:', JSON.stringify(res, null, 2));
  } else {
    console.log('Usage: node scripts/webhook-manager.js [set|delete|info] [custom-url]');
  }
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
