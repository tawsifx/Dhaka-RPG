// scripts/cloud-runner.js - Cloud execution engine for GitHub Actions 24/7 runner
const fs = require('fs');
const path = require('path');
const https = require('https');

const prompt = process.env.PROMPT || process.argv[2] || '';
const apiKey = process.env.ANTIGRAVITY_API_KEY || process.env.GEMINI_API_KEY || '';

console.log('🤖 Cloud Runner executing prompt:', prompt);

async function callGemini(apiKey, promptText, fileContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are an expert game developer modifying Dhaka-RPG (Phaser 3).
Here is the current game code (or snippet). 
User instruction: "${promptText}".
Output ONLY the revised code or provide the exact replacement diff. Return valid JavaScript code without conversational filler.`
            },
            {
              text: fileContent.slice(0, 50000) // safety limit
            }
          ]
        }
      ]
    });

    const req = https.request(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
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
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!prompt) {
    console.log('No prompt provided. Exiting.');
    process.exit(0);
  }

  // If Antigravity CLI or Gemini API key is available, we can process instructions in the cloud
  if (apiKey) {
    console.log('API Key detected. Ready for cloud code generation.');
  } else {
    console.log('No API key provided in environment secrets. Recording instruction note.');
  }
}

main().catch((err) => {
  console.error('Cloud runner error:', err);
  process.exit(1);
});
