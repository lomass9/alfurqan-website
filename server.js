const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

function buildPrompt(data) {
  return `
أنت مستشار دراسي ذكي. أنشئ خطة أسبوعية عملية للطالب.
أعد JSON فقط بدون أي نص إضافي.

صيغة JSON المطلوبة:
{
  "summary": "string",
  "insights": ["string", "string", "string"],
  "schedule": [
    {
      "dayName": "الأحد",
      "date": "dd/mm/yyyy",
      "sessions": [
        {
          "time": "17:00",
          "subject": "رياضيات",
          "focus": "حل تمارين...",
          "urgent": false
        }
      ]
    }
  ]
}

قواعد:
- احترم أيام الفراغ فقط.
- لا تتجاوز sessionsPerDay لكل يوم.
- أعطِ أولوية للمواد الأضعف والأقرب اختبارًا.
- ركّز على هدف الطالب المكتوب.
- النصوص كلها بالعربية.
- اجعل الخطة واقعية وموزعة بدون تكرار ممل.

بيانات الطالب:
${JSON.stringify(data, null, 2)}
`;
}

function validatePlan(plan, allowedDays, sessionsPerDay) {
  if (!plan || typeof plan !== 'object') return false;
  if (!Array.isArray(plan.insights) || !Array.isArray(plan.schedule)) return false;

  return plan.schedule.every((day) => {
    const dayOk = allowedDays.includes(day.dayName);
    const sessionsOk = Array.isArray(day.sessions) && day.sessions.length <= sessionsPerDay;
    return dayOk && sessionsOk;
  });
}

app.post('/api/plan', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is missing on server.' });
  }

  const payload = req.body;
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'أنت AI Study Planner. أرجع JSON صالح فقط. لا تضع markdown. لا تضع أي نص خارج JSON.'
          },
          {
            role: 'user',
            content: buildPrompt(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'OpenAI request failed', details: err });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const plan = JSON.parse(raw);

    const allowedDays = payload.freeDays.map((d) => d.dayName);
    if (!validatePlan(plan, allowedDays, payload.sessionsPerDay)) {
      return res.status(422).json({ error: 'AI plan format invalid for constraints.' });
    }

    return res.json(plan);
  } catch (error) {
    return res.status(500).json({ error: 'Server error while generating AI plan.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`AI Study Architect server running on http://localhost:${port}`);
});
