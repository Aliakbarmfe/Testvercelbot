const axios = require('axios');

const BOT_TOKEN = "BJAGFE0AVAZUFDXTFIYQRPKPOBEUTVMRTUNRPDLXXWNYUBEVEJZFEGQHTWPJFTHE";

let processedMessageIds = new Set();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query.check === '1') {
    let respondedCount = 0;
    
    // اجرای یک حلقه به مدت ۱۰ ثانیه برای چک کردن سریع
    const startTime = Date.now();
    while (Date.now() - startTime < 8000) { // ۸ ثانیه چک مداوم
      try {
        const response = await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/getUpdates`, {
          limit: 10
        });

        const updates = response.data?.data?.updates || [];
        if (updates.length > 0) {
          const latestUpdate = updates[updates.length - 1];

          if (latestUpdate && latestUpdate.new_message) {
            const msg = latestUpdate.new_message;
            const msgId = msg.message_id;

            if (!processedMessageIds.has(msgId)) {
              processedMessageIds.add(msgId);
              if (processedMessageIds.size > 50) processedMessageIds.clear();

              // ارسال پاسخ
              await axios.post(`https://botapi.rubika.ir/v3/${BOT_TOKEN}/sendMessage`, {
                chat_id: latestUpdate.chat_id,
                text: `✅ پیام شما دریافت شد:\n"${msg.text}"`
              });
              respondedCount++;
            }
          }
        }
      } catch (e) {
        // نادیده گرفتن خطاهای لحظه‌ای شبکه
      }

      // ۲ ثانیه صبر قبل از چک بعدی
      await sleep(2000);
    }

    return res.status(200).json({ status: "OK", processed: respondedCount });
  }

  return res.status(200).send("Rubika Bot Serverless Active!");
};
