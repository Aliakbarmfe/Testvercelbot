const axios = require('axios');

const BOT_TOKEN = "BJAGFE0AVAZUFDXTFIYQRPKPOBEUTVMRTUNRPDLXXWNYUBEVEJZFEGQHTWPJFTHE";

// ذخیره شناسه آخرین پیامی که پاسخ داده شده در حافظه موقت ورسل
let processedMessageIds = new Set();

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query.check === '1') {
    try {
      // دریافت پیام‌های جدید از روبیکا
      const response = await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/getUpdates`, {
        limit: 10
      });

      const updates = response.data?.data?.updates || [];
      
      if (updates.length === 0) {
        return res.status(200).json({ status: "OK", message: "پیام جدیدی وجود ندارد." });
      }

      // گرفتن آخرین پیام لیست برای جلوگیری از پاسخ به پیام‌های قدیمی
      const latestUpdate = updates[updates.length - 1];

      if (latestUpdate && latestUpdate.new_message) {
        const msg = latestUpdate.new_message;
        const msgId = msg.message_id;

        // بررسی اینکه آیا این پیام قبلاً پاسخ داده شده یا نه
        if (!processedMessageIds.has(msgId)) {
          processedMessageIds.add(msgId);

          // جلوگیری از پر شدن حافظه
          if (processedMessageIds.size > 50) {
            processedMessageIds.clear();
          }

          // پاسخ فقط به جدیدترین پیام
          await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/sendMessage`, {
            chat_id: latestUpdate.chat_id,
            text: `✅ پیام جدید شما دریافت شد:\n"${msg.text}"`
          });

          return res.status(200).json({ 
            status: "OK", 
            message: "پاسخ به آخرین پیام ارسال شد", 
            text: msg.text 
          });
        } else {
          return res.status(200).json({ status: "OK", message: "پیام جدیدی یافت نشد (پیام‌ها قبلا پاسخ داده شده‌اند)." });
        }
      }

      return res.status(200).json({ status: "OK", updates_count: updates.length });
    } catch (error) {
      return res.status(200).json({ error: error.message, details: error.response?.data || null });
    }
  }

  // صفحه ساده مانیتورینگ
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>ربات روبیکا</title>
      <style>
        body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; text-align: center; }
        .btn { background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>🤖 ربات روبیکا فعال است</h2>
      <br>
      <a href="/api?check=1" class="btn">📥 بررسی پیام‌های جدید</a>
    </body>
    </html>
  `);
};
