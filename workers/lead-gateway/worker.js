import { EmailMessage } from 'cloudflare:email';

export default {
  async fetch(request, env, ctx) {
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
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'PEARL Institutional Lead Gateway', 
        version: '2026.2',
        channels: ['feishu-bot', 'cloudflare-email', 'formsubmit-fallback']
      }), {
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
        focus = [],
        message = '',
      } = data;

      const focusSummary = Array.isArray(focus) && focus.length > 0 ? focus.join(', ') : (focus || 'General AI Governance');
      const leadId = 'PEARL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      const country = request.cf?.country || request.headers.get('cf-ipcountry') || 'Unknown';
      const city = request.cf?.city || 'Unknown';
      const ip = request.headers.get('cf-connecting-ip') || 'Unknown';

      const dispatchResults = {
        feishu: false,
        email: false,
        fallback: false
      };

      // 1. Dispatch Real-time Feishu Interactive Card to Ming Liu (Hermes Bot)
      const feishuAppId = env.FEISHU_APP_ID || 'cli_aa005288d9389d16';
      const feishuAppSecret = env.FEISHU_SECRET_KEY || env.FEISHU_APP_SECRET;
      const feishuChatId = env.FEISHU_CHAT_ID || 'oc_9f7e0a91aa2fcbe3555d99a27293eaa1';

      const feishuPromise = (async () => {
        try {
          const authRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              app_id: feishuAppId,
              app_secret: feishuAppSecret
            })
          });
          const authData = await authRes.json();
          if (!authData.tenant_access_token) {
            console.error('Feishu token error:', authData);
            return;
          }

          const cardPayload = {
            receive_id: feishuChatId,
            msg_type: 'interactive',
            content: JSON.stringify({
              config: { wide_screen_mode: true },
              header: {
                title: {
                  tag: 'plain_text',
                  content: `🚨 PEARL 机构客户留资通知 [${leadId}]`
                },
                template: 'turquoise'
              },
              elements: [
                {
                  tag: 'div',
                  fields: [
                    {
                      is_short: true,
                      text: {
                        tag: 'lark_md',
                        content: `**👤 客户姓名:**\n${name}`
                      }
                    },
                    {
                      is_short: true,
                      text: {
                        tag: 'lark_md',
                        content: `**🏢 所属机构:**\n${institution}`
                      }
                    },
                    {
                      is_short: true,
                      text: {
                        tag: 'lark_md',
                        content: `**💼 职务角色:**\n${role}`
                      }
                    },
                    {
                      is_short: true,
                      text: {
                        tag: 'lark_md',
                        content: `**✉️ 企业邮箱:**\n[${email}](mailto:${email})`
                      }
                    },
                    {
                      is_short: false,
                      text: {
                        tag: 'lark_md',
                        content: `**🎯 关注重点:**\n${focusSummary}`
                      }
                    }
                  ]
                },
                {
                  tag: 'hr'
                },
                {
                  tag: 'div',
                  text: {
                    tag: 'lark_md',
                    content: `**💬 目标 AI 场景 / 业务诉求:**\n${message || '未提供附加说明'}`
                  }
                },
                {
                  tag: 'note',
                  elements: [
                    {
                      tag: 'plain_text',
                      content: `审计编号: ${leadId} | 来源: www.ailingadvisory.com | 协议: Mutual NDA Protected | 地理: ${city}, ${country} (${ip}) | 时间: ${timestamp}`
                    }
                  ]
                }
              ]
            })
          };

          const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Bearer ${authData.tenant_access_token}`
            },
            body: JSON.stringify(cardPayload)
          });
          const sendData = await sendRes.json();
          if (sendData.code === 0) {
            dispatchResults.feishu = true;
          } else {
            console.error('Feishu send message error:', sendData);
          }
        } catch (err) {
          console.error('Feishu exception:', err);
        }
      })();

      // 2. Dispatch Email via Native Cloudflare Send Email Binding
      const emailPromise = (async () => {
        if (env.SEND_EMAIL) {
          try {
            const rawEmail = [
              'From: "PEARL Trust OS" <contact@ailingadvisory.com>',
              'To: "Ming Liu" <ailingadvisory@outlook.com>',
              `Subject: [Institutional Lead] ${name} - ${institution} (${leadId})`,
              'MIME-Version: 1.0',
              'Content-Type: text/plain; charset=UTF-8',
              '',
              `NEW INSTITUTIONAL ACCESS REQUEST [${leadId}]`,
              '================================================================',
              `Name:             ${name}`,
              `Institution:      ${institution}`,
              `Role:             ${role}`,
              `Institutional Em: ${email}`,
              `Primary Focus:    ${focusSummary}`,
              `Specific Notes:   ${message || 'Standard Technical Briefing'}`,
              '================================================================',
              `Audit Reference:  ${leadId}`,
              `Timestamp:        ${timestamp}`,
              `Visitor Origin:   ${city}, ${country} (IP: ${ip})`,
              'Delivery:         Direct Cloudflare Edge -> ailingadvisory@outlook.com',
              '================================================================'
            ].join('\r\n');

            const emailMsg = new EmailMessage(
              'contact@ailingadvisory.com',
              'ailingadvisory@outlook.com',
              rawEmail
            );
            await env.SEND_EMAIL.send(emailMsg);
            dispatchResults.email = true;
          } catch (err) {
            console.error('Native Send Email failed:', err);
          }
        }
      })();

      // 3. Fallback FormSubmit with proper Origin & Referer headers
      const fallbackPromise = (async () => {
        try {
          await fetch('https://formsubmit.co/ajax/contact@AILingAdvisory.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': 'https://www.ailingadvisory.com',
              'Referer': 'https://www.ailingadvisory.com/'
            },
            body: JSON.stringify({
              _subject: `[Institutional Lead] ${name} - ${institution} (${leadId})`,
              _cc: 'ailingadvisory@outlook.com',
              leadId,
              name,
              institution,
              role,
              email,
              focus: focusSummary,
              message,
              timestamp,
              country,
              city
            })
          });
          dispatchResults.fallback = true;
        } catch (e) {
          console.error('FormSubmit fallback error:', e);
        }
      })();

      await Promise.allSettled([feishuPromise, emailPromise]);
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(fallbackPromise);
      }

      return new Response(JSON.stringify({
        success: true,
        leadId,
        timestamp,
        dispatchResults,
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
