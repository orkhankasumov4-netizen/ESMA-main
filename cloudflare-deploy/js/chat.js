import { state, KEYS, persist, loadPersist } from './state.js';
import { streamWithFallback, buildMessages } from './api.js';
import { esc, autoResize, scrollBottom, renderMarkdown, showToast } from './utils.js';

// DOM Elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');
const modelSelect = document.getElementById('model-select');
const fileUpload = document.getElementById('file-upload');
const fileStrip = document.getElementById('file-strip');
const voiceBtn = document.getElementById('voice-btn');

let isRecording = false;
let recognition = null;

// Init
export function initChat() {
  state.chatHistory = loadPersist(KEYS.chat, []);
  
  if (modelSelect) {
    state.currentModel = modelSelect.value;
    modelSelect.addEventListener('change', (e) => {
      state.currentModel = e.target.value;
    });
  }

  if (fileUpload) {
    fileUpload.addEventListener('change', handleFileUpload);
  }

  if (chatInput) {
    chatInput.addEventListener('input', () => {
      autoResize(chatInput);
      updateSendBtn();
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', toggleVoice);
  }

  renderHistory();
}

function updateSendBtn() {
  sendBtn.disabled = (!chatInput.value.trim() && !state.pendingFiles.length) || state.isStreaming;
}

// ═══════════════════════════════════════════════════════════
// VOICE HANDLING — Safari + Chrome + Firefox Compatible
// ═══════════════════════════════════════════════════════════

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function toggleVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    showToast('⚠️ Brauzeriniz səs tanımağı dəstəkləmir. Chrome istifadə edin.');
    return;
  }

  // Safari HTTPS tələb edir. HTTP-də isə mikrofon icazəsi verilmir.
  if (isSafari() && location.protocol !== 'https:') {
    showToast('🔒 Safari mikrofon üçün HTTPS tələb edir. Chrome ilə açın və ya HTTPS istifadə edin.');
    return;
  }

  isRecording ? stopVoice() : startVoice();
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();

  // Safari az-AZ dəstəkləmir — tr-TR fallback istifadə edirik
  // Chrome-da az-AZ tam işləyir
  recognition.lang = isSafari() ? 'tr-TR' : 'az-AZ';
  recognition.continuous = false;
  recognition.interimResults = true;
  
  recognition.onstart = () => { 
    isRecording = true; 
    voiceBtn.classList.add('recording'); 
    voiceBtn.style.color = '#ef4444';
    showToast(isSafari() ? '🎙️ Danışın… (Safari: TR dili)' : '🎙️ Danışın…'); 
  };
  
  recognition.onresult = e => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('');
    chatInput.value = t;
    autoResize(chatInput);
    updateSendBtn();
  };
  
  recognition.onend = () => stopVoice();

  recognition.onerror = (e) => {
    stopVoice();
    if (e.error === 'not-allowed') {
      showToast('🔒 Mikrofon icazəsi rədd edildi. Brauzer ayarlarından mikrofona icazə verin.');
    } else if (e.error === 'network') {
      showToast('🌐 Şəbəkə xətası. HTTPS bağlantısı tələb olunur.');
    } else if (e.error === 'no-speech') {
      showToast('🔇 Səs aşkarlanmadı. Yenidən cəhd edin.');
    } else {
      showToast(`⚠️ Səs xətası: ${e.error}`);
    }
  };
  
  try {
    recognition.start();
  } catch(err) {
    stopVoice();
    showToast('⚠️ Mikrofon başladılmadı: ' + err.message);
  }
}

function stopVoice() {
  isRecording = false;
  voiceBtn.classList.remove('recording');
  voiceBtn.style.color = '';
  if (recognition) { 
    try { recognition.stop(); } catch(_) {}
    recognition = null; 
  }
}

function buildUserHtml(id, textOrArray) {
  let contentHtml = '';
  if (typeof textOrArray === 'string') {
    contentHtml = esc(textOrArray);
  } else if (Array.isArray(textOrArray)) {
    contentHtml = textOrArray.map(item => {
      if (item.type === 'image_url') {
        return `<img src="${item.image_url.url}" style="max-width:200px; max-height:200px; border-radius:8px; margin:5px 0; border:1px solid var(--glass-border); display:block;">`;
      } else if (item.type === 'text') {
        return `<div>${esc(item.text)}</div>`;
      }
      return '';
    }).join('');
  }

  return `
    <div class="msg-row" id="${id}">
      <div class="avatar user">S</div>
      <div class="msg-body">
        <div class="msg-name">"Siz" <span class="msg-time">${new Date().toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'})}</span></div>
        <div class="msg-text">${contentHtml}</div>
        <div class="msg-actions">
           <button title="Kopyala" class="action-btn" onclick="navigator.clipboard.writeText(this.closest('.msg-row').querySelector('.msg-text').textContent)">📋</button>
           <button title="Sil" class="action-btn" data-delete-id="${id}">🗑️</button>
        </div>
      </div>
    </div>`;
}

function buildAiHtml(id, text) {
  return `
    <div class="msg-row" id="${id}">
      <div class="avatar ai">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="msg-body">
        <div class="msg-name">Claude Pro <span class="msg-time">${new Date().toLocaleTimeString('az-AZ', {hour: '2-digit', minute:'2-digit'})}</span></div>
        <div class="msg-text ai-content">${renderMarkdown(text)}</div>
        <div class="msg-actions" style="margin-top:5px;display:flex;gap:5px;">
           <button title="Kopyala" class="action-btn" style="background:transparent;border:none;cursor:pointer;opacity:0.6;" onclick="navigator.clipboard.writeText(this.closest('.msg-row').querySelector('.ai-content').textContent)">📋</button>
           <button title="Sil" class="action-btn delete-btn" style="background:transparent;border:none;cursor:pointer;opacity:0.6;" data-delete-id="${id}">🗑️</button>
        </div>
      </div>
    </div>`;
}

// Delegate global delete clicks
document.addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-delete-id]');
  if(delBtn) {
    const id = delBtn.getAttribute('data-delete-id');
    const msgEl = document.getElementById(id);
    if(msgEl) msgEl.remove();
    
// Yaddaşı sinxronlaşdır
    state.chatHistory = state.chatHistory.filter(m => m._domId !== id);
    persist(KEYS.chat, state.chatHistory);
    showToast('Mesaj silindi');
  }
});

function renderFileStrip() {
  if (!fileStrip) return;
  fileStrip.innerHTML = state.pendingFiles.map((f, i) => {
    if (f.isImage) {
      return `<div style="position:relative; display:inline-block; margin-right:10px;">
                <img src="${f.dataUrl}" style="height:50px; border-radius:8px; border:1px solid var(--glass-border);">
                <button onclick="window.removePendingFile(${i})" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;">✕</button>
              </div>`;
    } else {
       return `<div style="position:relative; display:inline-block; margin-right:10px; background:var(--glass-bg); padding:15px; border-radius:8px; border:1px solid var(--glass-border); font-size:12px;">
                📄 ${esc(f.name)}
                <button onclick="window.removePendingFile(${i})" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:18px; height:18px; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;">✕</button>
              </div>`;
    }
  }).join('');
  updateSendBtn();
}

window.removePendingFile = function(index) {
  state.pendingFiles.splice(index, 1);
  renderFileStrip();
};

function handleFileUpload(e) {
  const files = e.target.files;
  if (!files.length) return;
  
  Array.from(files).forEach(file => {
    if (file.size > 3 * 1024 * 1024) {
      showToast(`⚠️ ${file.name} (3MB-dan böyük ola bilməz)`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.pendingFiles.push({
        name: file.name,
        type: file.type,
        isImage: file.type.startsWith('image/'),
        dataUrl: ev.target.result
      });
      renderFileStrip();
    };
    reader.readAsDataURL(file);
  });
  
  e.target.value = '';
}

function renderHistory() {
  const w = document.getElementById('welcome');
  if (state.chatHistory.length > 0 && w) w.style.display = 'none';

  // Sadece sadəcə state.chatHistory-ni loop edib ekrana yazdıra bilərik
  // Şimdilik sıfırdan başlamaq lazımdır.
  let html = '';
  state.chatHistory.forEach(m => {
    if (m.role === 'user') html += buildUserHtml(m._domId || Date.now(), m.content);
    else if (m.role === 'assistant') html += buildAiHtml(m._domId || Date.now(), m.content);
  });
  
  // existing welcome silinməsin deye sadəcə əlavə edirik 
  messagesDiv.innerHTML = html;
  scrollBottom('messages');
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text && !state.pendingFiles.length) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';
  updateSendBtn();

  const w = document.getElementById('welcome');
  if (w) w.style.display = 'none';

  const userDomId = 'usr-' + Date.now();
  const aiDomId = 'ai-' + Date.now();

  let finalContent;
  if (state.pendingFiles.length > 0) {
    finalContent = state.pendingFiles.map(f => {
      if (f.isImage) return { type: 'image_url', image_url: { url: f.dataUrl } };
      return { type: 'text', text: `[Fayl: ${f.name} əlavə edildi]` };
    });
    if (text) finalContent.push({ type: 'text', text });
  } else {
    finalContent = text;
  }

  // Clear pending
  state.pendingFiles = [];
  renderFileStrip();

  state.chatHistory.push({ role: 'user', content: finalContent, _domId: userDomId });
  persist(KEYS.chat, state.chatHistory);
  
  messagesDiv.insertAdjacentHTML('beforeend', buildUserHtml(userDomId, finalContent));
  messagesDiv.insertAdjacentHTML('beforeend', buildAiHtml(aiDomId, 'Düşünür...'));
  scrollBottom('messages');

  state.isStreaming = true;
  updateSendBtn();
  const aiMsgBox = document.querySelector(`#${aiDomId} .ai-content`);
  let fullText = '';

  try {
    const msgs = buildMessages(state.chatHistory, state.systemPrompt);
    const stream = streamWithFallback(msgs, state.systemPrompt, state.currentModel);

    aiMsgBox.innerHTML = '';
    
    for await (const chunk of stream) {
      fullText += chunk.text;
      aiMsgBox.innerHTML = renderMarkdown(fullText);
      scrollBottom('messages');
    }

    state.chatHistory.push({ role: 'assistant', content: fullText, _domId: aiDomId });
    persist(KEYS.chat, state.chatHistory);

  } catch (err) {
    aiMsgBox.innerHTML = `<span style="color:var(--danger)">❌ Xəta: ${esc(err.message)}</span>`;
    showToast('Xəta baş verdi');
  } finally {
    state.isStreaming = false;
    updateSendBtn();
  }
}
