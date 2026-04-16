const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8081;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

// Mühim: Request body-ni oxumaq üçün
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static frontend fayllarını "public" qovluğundan serve edirik
app.use(express.static(path.join(__dirname, 'public')));

// API provayderləri üçün əsas URL-lər
const PROVIDERS = {
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY
  },
  qwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    key: process.env.QWEN_API_KEY
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    key: process.env.OPENAI_API_KEY
  },
  gemini: {
    urlBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    key: process.env.GEMINI_API_KEY
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY
  },
  github: {
    url: 'https://models.inference.ai.azure.com/chat/completions',
    key: process.env.GITHUB_TOKEN
  }
};

app.post('/proxy', async (req, res) => {
  const reqPass = req.headers['x-proxy-pass'];
  const providerId = req.headers['x-provider'];

  // Şifrə yoxlanışı
  if (!PROXY_PASSWORD || reqPass !== PROXY_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized: Invalid proxy password' });
  }

  const providerInfo = PROVIDERS[providerId];
  if (!providerInfo) {
    return res.status(400).json({ error: `Provider not supported: ${providerId}` });
  }

  try {
    let targetUrl = '';
    let headers = {
      'Content-Type': 'application/json'
    };
    let bodyData = req.body;

    // Provayderə görə API URL və Auth header hazırlanması
    if (providerId === 'gemini') {
      const model = bodyData.model || 'gemini-1.5-flash';
      const isStream = bodyData.stream === true;
      const action = isStream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
      targetUrl = `${providerInfo.urlBase}/${model}:${action}key=${providerInfo.key}`;

      // Node.js tərəfində stream parametrini çıxarmalıyıq çünki gemini API fərqli URL-lə stream alır
      if (bodyData.stream) {
        delete bodyData.stream;
      }
      if (bodyData.model) {
        delete bodyData.model;
      }
    } else {
      // OpenAI uyğun provayderlər (OpenAI, OpenRouter, Qwen, Mistral)
      targetUrl = providerInfo.url;
      headers['Authorization'] = `Bearer ${providerInfo.key}`;

      // OpenRouter üçün əlavə başlıqlar (istəyə görə)
      if (providerId === 'openrouter') {
        headers['HTTP-Referer'] = 'https://ai-chat.local';
        headers['X-Title'] = 'My AI Chat';
      }
    }

    // Sorğunu hədəf AI provayderinə göndəririk
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${providerId}] Error: HTTP ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: `API Error: ${response.status}`, details: errorText });
    }

    // Node stream paketi ilə WebStream-i Express res obyektinə pipe etmək
    const { Readable } = require('stream');

    // Mühüm: Bütün başlıqları kopyalamaq mobil şəbəkələrdə fərqli 'Content-Encoding' (gzip) problemlərinə səbəb olur.
    // Yalnız təhlükəsiz başlıqları göndəririk və CORS xətalarının qarşısını alırıq.
    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (['content-type', 'cache-control', 'x-request-id'].includes(lowerKey)) {
        res.setHeader(key, val);
      }
    });

    // Əgər global middleware işləməzsə deyə təkrar CORS icazəsi əlavə edirik
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Status kodu əlavə edirik
    res.status(response.status);

    // Cavab bodysini frontend-ə axınla göndəririk
    if (response.body) {
      // Node 18+ üçün WebStream-i Node stream-inə çeviririk
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Proxy Server is running on port ${PORT}`);
});
