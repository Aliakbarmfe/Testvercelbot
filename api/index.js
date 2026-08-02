const axios = require('axios');

const BOT_TOKEN = "BJAGFE0AVAZUFDXTFIYQRPKPOBEUTVMRTUNRPDLXXWNYUBEVEJZFEGQHTWPJFTHE";

global.logs = global.logs || [];
global.lastOffset = global.lastOffset || null;

function addLog(type, data) {
  const timestamp = new Date().toISOString();
  global.logs.unshift({ timestamp, type, data });
  if (global.logs.length > 20) global.logs.pop();
}

module.exports = async (req, res) => {
  // ۱. بررسی و دریافت پیام‌های جدید روبیکا (Polling)
  if (req.method === 'GET' && req.query.check === '1') {
    try {
      // دریافت بروزرسانی‌ها از روبیکا
      const response = await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/getUpdates`, {
        limit: 10,
        offset: global.lastOffset
      });

      const updates = response.data?.data?.updates || [];
      addLog('INFO', `تعداد ${updates.length} رویداد جدید دریافت شد.`);

      for (const update of updates) {
        global.lastOffset = update.update_id;
        if (update.new_message) {
          const msg = update.new_message;
          
          // پاسخ خودکار به کاربر
          await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/sendMessage`, {
            chat_id: update.chat_id,
            text: `✅ پیام شما دریافت شد:\n"${msg.text}"`
          });
          
          addLog('SUCCESS', `پاسخ به ${msg.sender_id} ارسال شد: ${msg.text}`);
        }
      }

      return res.status(200).json({ status: "OK", updates_count: updates.length, data: response.data });
    } catch (error) {
      addLog('ERROR', { error: error.message, details: error.response?.data || null });
      return res.status(200).json({ error: error.message, details: error.response?.data || null });
    }
  }

  // ۲. صفحه نمایش داشبورد
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ربات روبیکا - چک کردن پیام‌ها</title>
      <style>
        body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; padding: 15px; }
        .card { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155; }
        pre { background: #020617; padding: 10px; border-radius: 6px; color: #a7f3d0; direction: ltr; text-align: left; overflow-x: auto; }
        .btn { background: #16a34a; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>🤖 پنل مدیریت بات روبیکا</h2>
      <div class="card">
        <p>برای دریافت پیام‌های جدید و ارسال پاسخ خودکار روی دکمه زیر بزنید:</p>
        <a href="/api?check=1" class="btn">📥 دریافت و پاسخ به پیام‌های جدید</a>
      </div>

      <h2>🛠️ گزارش‌ها (Logs)</h2>
      ${global.logs.map(log => `
        <div class="card">
          <small>${log.timestamp} - <strong>[${log.type}]</strong></small>
          <pre>${JSON.stringify(log.data, null, 2)}</pre>
        </div>
      `).join('')}
    </body>
    </html>
  `);
};
