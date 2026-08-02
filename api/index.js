const axios = require('axios');

// توکن مستقیماً در کد قرار گرفت (مخصوص تست)
const BOT_TOKEN = "BJAGFE0AVAZUFDXTFIYQRPKPOBEUTVMRTUNRPDLXXWNYUBEVEJZFEGQHTWPJFTHE";

// حافظه موقت برای ذخیره آخرین رویدادها و خطاها
global.logs = global.logs || [];
global.lastMessage = global.lastMessage || null;

function addLog(type, data) {
  const timestamp = new Date().toISOString();
  global.logs.unshift({ timestamp, type, data });
  if (global.logs.length > 20) {
    global.logs.pop();
  }
}

module.exports = async (req, res) => {
  // ۱. اگر لینک سایت را در مرورگر باز کنید، صفحه عیب‌یابی و مانیتورینگ را می‌بینید
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    const html = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مانیتورینگ بات روبیکا</title>
        <style>
          body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; padding: 15px; margin: 0; }
          h2 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 8px; }
          .card { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155; }
          .status { font-weight: bold; color: #4ade80; }
          .error { border-color: #f87171; background: #450a0a; }
          pre { background: #020617; padding: 10px; border-radius: 6px; overflow-x: auto; color: #a7f3d0; direction: ltr; text-align: left; }
          .btn { background: #0284c7; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <h2>📊 وضعیت بات روبیکا (ورسل)</h2>
        <div class="card">
          <p>وضعیت سرور: <span class="status">فعال و آماده دریافت داده (Online)</span></p>
          <a href="/" class="btn">🔄 بروزرسانی صفحه</a>
        </div>

        <h2>💬 آخرین پیام دریافتی</h2>
        <div class="card">
          ${global.lastMessage 
            ? `<pre>${JSON.stringify(global.lastMessage, null, 2)}</pre>` 
            : '<p>هنوز هیچ پیامی از سمت روبیکا دریافت نشده است.</p>'}
        </div>

        <h2>🛠️ گزارش‌ها و عیب‌یابی (Logs & Errors)</h2>
        ${global.logs.map(log => `
          <div class="card ${log.type === 'ERROR' ? 'error' : ''}">
            <small>${log.timestamp} - <strong>[${log.type}]</strong></small>
            <pre>${JSON.stringify(log.data, null, 2)}</pre>
          </div>
        `).join('')}
      </body>
      </html>
    `;
    return res.status(200).send(html);
  }

  // ۲. بخش دریافت پیام‌ها (درخواست‌های POST از سمت روبیکا)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      addLog('INFO', { message: 'یک درخواست جدید دریافت شد', body });

      // بررسی پیام دریافتی
      if (body?.update?.new_message) {
        const msg = body.update.new_message;
        global.lastMessage = {
          sender: msg.sender_id,
          text: msg.text || '[پیام غیرمتنی یا فایل]',
          time: msg.time,
          chat_id: body.update.chat_id
        };

        addLog('SUCCESS', `پیام با موفقیت پردازش شد: "${msg.text}"`);

        // ارسال پاسخ خودکار به کاربر در روبیکا
        if (body.update.chat_id) {
          await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/sendMessage`, {
            chat_id: body.update.chat_id,
            text: `✅ پیام شما دریافت شد:\n"${msg.text}"`
          });
        }
      }

      return res.status(200).json({ status: 'OK' });
    } catch (error) {
      addLog('ERROR', {
        errorMessage: error.message,
        stack: error.stack,
        responseData: error.response?.data || null
      });
      return res.status(200).json({ status: 'Error Handled' });
    }
  }

  return res.status(405).send('Method Not Allowed');
};
        
