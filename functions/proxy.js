/**
 * Cloudflare Pages Function: /proxy
 *
 * Bu Cloudflare-in öz serverlərind ə işləyir (server-side).
 * Frontend (HTTPS) → Cloudflare Edge (bu fayl) → Kamatera HTTP backend
 * Brauzer yalnız HTTPS görür → Mixed Content xətası yoxdur.
 */

const BACKEND_URL = 'http://185.237.14.86:8081/proxy';

export async function onRequestPost(context) {
  const { request } = context;

  // Bütün request header-ləri backend-ə ötürürük (x-proxy-pass, x-provider, Content-Type)
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    // Cloudflare-in öz header-lərini çıxarırıq, qalanlarını ötürürük
    if (!['host', 'cf-ray', 'cf-connecting-ip', 'cf-ipcountry', 'cf-visitor'].includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  try {
    const backendResponse = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: forwardHeaders,
      body: request.body,
    });

    // Backend-dən gələn bütün cavab header-lərini kopyalayırıq
    const responseHeaders = new Headers();
    for (const [key, value] of backendResponse.headers.entries()) {
      responseHeaders.set(key, value);
    }

    // CORS header-lərini əlavə edirik (Pages funksiyaları üçün lazımlıdır)
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    // Backend cavabını (streaming daxil) birbaşa frontend-ə ötürürük
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy xətası', details: err.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// OPTIONS preflight sorğuları üçün (CORS)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
