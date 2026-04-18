const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzYOHiIMY2b3BPETNO1nT_qWoDjG3fyVXNaV_Hg-6cjGr0TEDLCDTlQA8t1MLduI6Fm3Q/exec';

// ★ここに貼る
const LINE_TOKEN = 'wqHQPeo7vuuUMZ1rA+XBw1+axxvlGQ8ocDi27IHE8z1hfEtEq29Sx8UhC4GiVKs3EX22EVRHltFXtZnzEIcWSUB6f0GJKlLRyGJ7Kr8ZZQR18YM+suBJOfI8sRurvDqz+cFGoliIC2tJaWG3WIP1zgdB04t89/1O/w1cDnyilFU=';

app.post('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== 'message' || event.message?.type !== 'text') {
        continue;
      }

      const text = event.message.text;
      const replyToken = event.replyToken;

      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      const command = lines[0];

      // 依頼・完了以外は無視
      if (command !== '依頼' && command !== '完了') continue;

      // 完了
      if (command === '完了') {
        const payload = {
          action: 'complete',
          target: lines[1] || '',
          completedBy: lines[2] || ''
        };

        await axios.post(GAS_URL, payload);
        continue;
      }

      // 依頼
      if (command === '依頼') {
        const id = Date.now().toString();

        const task = lines[1] || '';
        const person = lines[2] || '';
        const dueDate = lines[3] || '';
        const priority = lines[4] || '中';

        let priorityOrder = 2;
        if (priority.includes('高')) priorityOrder = 1;
        if (priority.includes('低')) priorityOrder = 3;

        const payload = {
          action: 'add',
          id: id,
          time: new Date().toLocaleString('ja-JP'),
          task: task,
          person: person,
          dueDate: dueDate,
          priority: priority,
          priorityOrder: priorityOrder,
          status: '未着手',
          completedBy: '',
          completedAt: ''
        };

        await axios.post(GAS_URL, payload);

        // ★ID返信
        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: id
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${LINE_TOKEN}`
            }
          }
        );
      }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error(error);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
