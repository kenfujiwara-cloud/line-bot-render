const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const GAS_URL = process.env.GAS_URL;
const LINE_TOKEN = process.env.LINE_TOKEN;

app.post('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {

  try {

    const events = req.body.events;

    for (const event of events) {

      if (event.type !== 'message') continue;
      if (event.message.type !== 'text') continue;

      const text = event.message.text.trim();

      console.log('受信:', text);

      // -----------------------------
      // 完了
      // -----------------------------
      if (text.startsWith('完了')) {

        const lines = text.split('\n');

        const target = lines[1] || '';
        const completedBy = lines[2] || '';

        await axios.post(GAS_URL, {
          action: 'complete',
          target,
          completedBy
        });

        await replyMessage(event.replyToken,
          `完了処理しました\n対象: ${target}`
        );

        continue;
      }

      // -----------------------------
      // 売上
      // -----------------------------
      if (text.startsWith('売上')) {

        const lines = text.split('\n');

        const product = lines[1] || '';
        const amount = lines[2] || '';
        const quantity = lines[3] || '';
        const person = lines[4] || '';

        try {

          await axios.post(GAS_URL, {
            action: 'sales',
            product,
            amount,
            quantity,
            person
          });

          await replyMessage(
            event.replyToken,
            `売上登録しました\n商品:${product}\n金額:${amount}\n個数:${quantity}`
          );

        } catch (error) {

          console.error(error.response?.data || error.message);

          await replyMessage(
            event.replyToken,
            `売上登録エラー\n${error.response?.data || error.message}`
          );

        }

        continue;
      }

      // -----------------------------
      // 依頼
      // -----------------------------
      if (text.startsWith('依頼')) {

        const lines = text.split('\n');

        const task = lines[1] || '';
        const person = lines[2] || '';
        const dueDate = lines[3] || '';
        const priority = lines[4] || '中';

        const id = Date.now().toString();

        const priorityOrder =
          priority.includes('高') ? 1 :
          priority.includes('低') ? 3 : 2;

        await axios.post(GAS_URL, {
          id,
          time: new Date(),
          task,
          person,
          dueDate,
          priority,
          priorityOrder,
          status: '未着手'
        });

        await replyMessage(
          event.replyToken,
          `依頼を登録しました\nID:${id}`
        );

        continue;
      }

    }

    res.sendStatus(200);

  } catch (error) {

    console.error(error);
    res.sendStatus(500);

  }

});

async function replyMessage(replyToken, text) {

  await axios.post(
    'https://api.line.me/v2/bot/message/reply',
    {
      replyToken,
      messages: [
        {
          type: 'text',
          text
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
