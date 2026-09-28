export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api/lead' && url.pathname !== '/') {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ status: 'ok', service: 'PEARL Institutional Lead Gateway', version: '2026.1' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await request.json();
      const {
        name = 'Anonymous Executive',
        email = 'No Email Provided',
        role = 'Unspecified',
        institution = 'Unspecified',
        licenseType = 'Unspecified',
        deploymentModel = 'Unspecified',
        message = 'No notes provided',
      } = data;

      const leadId = 'PEARL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      const country = request.cf?.country || request.headers.get('cf-ipcountry') || 'Unknown';
      const city = request.cf?.city || 'Unknown';
      const ip = request.headers.get('cf-connecting-ip') || 'Unknown';

      // 1. Dispatch Real-time Telegram Alert to Ming Liu
      const botToken = env.TELEGRAM_BOT_TOKEN || '8707874074:AAFtXZ6ysfzqLnmXEyipczHlS0VQqPKMnTQ';
      const chatId = env.TELEGRAM_CHAT_ID || '8535832231';

      const tgMessage = `🚨 *NEW INSTITUTIONAL ACCESS REQUEST* [${leadId}]\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Name:* ${name}\n` +
        `🏢 *Institution:* ${institution}\n` +
        `💼 *Role:* ${role}\n` +
        `✉️ *Work Email:* \`${email}\`\n` +
        `📜 *License:* ${licenseType}\n` +
        `☁️ *Deployment:* ${deploymentModel}\n` +
        `💬 *Message:* ${message}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *Time:* \`${timestamp}\`\n` +
        `📍 *Location:* ${city}, ${country} (IP: \`${ip}\`)`;

      const tgPromise = fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgMessage,
          parse_mode: 'Markdown',
        }),
      }).catch(err => {
        console.error('Telegram dispatch error:', err);
      });

      // 2. Email Forwarding via FormSubmit / Webhook / Mailchannels
      const emailPromise = fetch('https://formsubmit.co/ajax/contact@AILingAdvisory.com', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `[Institutional Lead] ${name} from ${institution} (${leadId})`,
          _cc: 'ailingadvisory@outlook.com',
          leadId,
          name,
          institution,
          role,
          email,
          licenseType,
          deploymentModel,
          message,
          timestamp,
          country,
          city
        })
      }).catch(err => {
        console.error('Email forward error:', err);
      });

      await Promise.allSettled([tgPromise, emailPromise]);

      return new Response(JSON.stringify({ 
        success: true, 
        leadId, 
        timestamp,
        status: 'DISPATCHED_TO_EXECUTIVE_DESK'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
