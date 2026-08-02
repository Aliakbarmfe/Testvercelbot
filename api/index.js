const axios = require('axios');

const BOT_TOKEN = "BJAGFE0AVAZUFDXTFIYQRPKPOBEUTVMRTUNRPDLXXWNYUBEVEJZFEGQHTWPJFTHE";
const VERCEL_URL = "https://testvercelbot.vercel.app/api";

global.logs = global.logs || [];
global.lastMessage = global.lastMessage || null;

function addLog(type, data) {
  const timestamp = new Date().toISOString();
  global.logs.unshift({ timestamp, type, data });
  if (global.logs.length > 20) global.logs.pop();
}

module.exports = async (req, res) => {
  // ۱. تنظیم وب‌هوک طبق فرمت استاندارد API روبیکا
  if (req.method === 'GET' && req.query.setwebhook === '1') {
    try {
      // ساختار درست درخواست به API روبیکا
      const response = await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/`, {
        method: "updateBotEndpoint",
        input: {
          url: VERCEL_URL,
          type: "receiveUpdate"
        }
      });
      return res.status(200).json({ message: "پاسخ روبیکا:", data: response.data });
    } catch (error) {
      return res.status(200).json({ error: error.message, details: error.response?.data || null });
    }
  }

  // ۲. صفحه مانیتورینگ مرورگر
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مانیتورینگ بات روبیکا</title>
        <style>
          body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; padding: 15px; }
          .card { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155; }
          pre { background: #020617; padding: 10px; border-radius: 6px; color: #a7f3d0; direction: ltr; text-align: left; overflow-x: auto; }
          .btn { background: #0284c7; color: white; padding: 10px 15px; border-radius: 6px; text-decoration: none; display: inline-block; margin-left: 5px; }
          .btn-green { background: #16a34a; }
        </style>
      </head>
      <body>
        <h2>📊 وضعیت بات روبیکا (ورسل)</h2>
        <div class="card">
          <a href="/api" class="btn">🔄 بروزرسانی صفحه</a>
          <a href="/api?setwebhook=1" class="btn btn-green">⚡ تنظیم دقیق وب‌هوک روبیکا</a>
        </div>

        <h2>💬 آخرین پیام دریافتی</h2>
        <div class="card">
          ${global.lastMessage ? `<pre>${JSON.stringify(global.lastMessage, null, 2)}</pre>` : '<p>هنوز هیچ پیامی دریافت نشده است.</p>'}
        </div>

        <h2>🛠️ گزارش‌ها و عیب‌یابی (Logs)</h2>
        ${global.logs.map(log => `
          <div class="card">
            <small>${log.timestamp} - <strong>[${log.type}]</strong></small>
            <pre>${JSON.stringify(log.data, null, 2)}</pre>
          </div>
        `).join('')}
      </body>
      </html>
    `);
  }

  // ۳. دریافت پیام‌ها از سمت روبیکا
  if (req.method === 'POST') {
    try {
      const body = req.body;
      addLog('INFO', { message: 'پیام جدید دریافت شد', body });

      if (body?.update?.new_message) {
        const msg = body.update.new_message;
        global.lastMessage = {
          sender: msg.sender_id,
          text: msg.text || '[پیام غیرمتنی]',
          time: msg.time,
          chat_id: body.update.chat_id
        };

        if (body.update.chat_id) {
          // ارسال پاسخ به کاربر با فرمت درست روبیکا
          await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/`, {
            method: "sendMessage",
            input: {
              chat_id: body.update.chat_id,
              text: `✅ پیام شما دریافت شد:\n"${msg.text}"`
            }
          });
        }
      }

      return res.status(200).json({ status: 'OK' });
    } catch (error) {
      addLog('ERROR', { error: error.message, details: error.response?.data || null });
      return res.status(200).json({ status: 'Error' });
    }
  }

  return res.status(405).send('Method Not Allowed');
};
