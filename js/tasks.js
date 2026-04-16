import { state, KEYS, persist, loadPersist } from './state.js';
import { streamWithFallback, buildMessages } from './api.js';
import { esc, showToast, renderMarkdown } from './utils.js';

let taskList = [];
let researchRunning = false;

// DOM Elements
let taskInput, taskAddBtn, tasksListContainer, tasksEmpty;
let researchTextarea, researchDepthSelect, researchBtn, researchOutput;

export function initTasksAndResearch() {
  // --- Tasks DOM ---
  taskInput = document.getElementById('task-input');
  taskAddBtn = document.getElementById('task-add-btn');
  tasksListContainer = document.getElementById('tasks-list');
  tasksEmpty = document.getElementById('tasks-empty');

  if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') addTask();
    });
  }
  if (taskAddBtn) {
    taskAddBtn.addEventListener('click', addTask);
  }

  // --- Research DOM ---
  researchTextarea = document.getElementById('research-textarea');
  researchDepthSelect = document.getElementById('research-depth');
  researchBtn = document.getElementById('research-btn');
  researchOutput = document.getElementById('research-output');

  if (researchTextarea) {
    researchTextarea.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && e.ctrlKey) startResearch();
    });
  }
  if (researchBtn) {
    researchBtn.addEventListener('click', startResearch);
  }

  // Load Tasks
  taskList = loadPersist(KEYS.tasks, []);
  renderTasks();
}

// ═══════════════════════════════════════════════════════════
// COWORK TASKS
// ═══════════════════════════════════════════════════════════

function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  taskInput.value = '';
  
  const task = { id: Date.now(), title, status: 'pending', steps: [], result: '' };
  taskList.unshift(task);
  persist(KEYS.tasks, taskList);
  renderTasks();
  
  // Start execution automatically
  executeTask(task.id);
}

function renderTasks() {
  if (!tasksListContainer) return;
  
  if (taskList.length === 0) {
    tasksEmpty.style.display = 'block';
    Array.from(tasksListContainer.children).forEach(c => {
      if (c !== tasksEmpty) c.remove();
    });
    return;
  }
  
  tasksEmpty.style.display = 'none';
  
  // Keep empty message, remove others
  const children = Array.from(tasksListContainer.children);
  for (const c of children) {
    if (c !== tasksEmpty) c.remove();
  }

  taskList.forEach(task => {
    let statHtml = '';
    if (task.status === 'pending') statHtml = `<span style="color:var(--text-muted)">⏳ Gözlənilir</span>`;
    if (task.status === 'running') statHtml = `<span style="color:var(--primary)">🔄 İcra olunur...</span>`;
    if (task.status === 'done') statHtml = `<span style="color:var(--success)">✅ Tamamlandı</span>`;
    if (task.status === 'error') statHtml = `<span style="color:var(--danger)">❌ Xəta</span>`;

    let stepsHtml = task.steps.map(s => `<div style="font-size:12px; margin-top:4px; padding-left:10px; border-left:2px solid var(--glass-border)">${esc(s)}</div>`).join('');
    
    const html = `
      <div class="glass-panel" style="padding:15px; border-radius:var(--radius-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4 style="margin:0; font-size:15px;">${esc(task.title)}</h4>
          <div style="font-size:12px; font-weight:600;">${statHtml}</div>
        </div>
        ${stepsHtml ? `<div style="margin-top:10px;">${stepsHtml}</div>` : ''}
        ${task.result ? `<div style="margin-top:10px; font-size:13px; color:var(--text-muted); background:var(--glass-bg); padding:10px; border-radius:4px;">${renderMarkdown(task.result)}</div>` : ''}
        <div style="margin-top:10px;text-align:right;">
          <button class="btn-ghost" style="padding:4px 8px;font-size:11px;color:var(--danger)" data-id="${task.id}" id="del-task-${task.id}">Sil</button>
        </div>
      </div>
    `;
    
    tasksListContainer.insertAdjacentHTML('beforeend', html);
    
    // Attach event locally
    const delBtn = document.getElementById(`del-task-${task.id}`);
    if (delBtn) delBtn.addEventListener('click', () => {
      taskList = taskList.filter(t => t.id !== task.id);
      persist(KEYS.tasks, taskList);
      renderTasks();
    });
  });
}

function updateTask(id, attrs) {
  const t = taskList.find(x => x.id === id);
  if (t) {
    Object.assign(t, attrs);
    persist(KEYS.tasks, taskList);
    renderTasks();
  }
}

async function executeTask(id) {
  const task = taskList.find(x => x.id === id);
  if (!task || task.status === 'running') return;

  updateTask(id, { status: 'running', steps: ['Planlama mərhələsindədir...'] });

  try {
    // 1. Planlama
    const planPrompt = `Sən tapşırıq icraçısısan. Verilmiş tapşırığı həll etmək üçün qısa 3 addımlıq plan qur. 
Tapşırıq: "${task.title}"
Format (SƏRT):
1. [addım]
2. [addım]
3. [addım]`;

    let planRes = '';
    const planStream = streamWithFallback(buildMessages(planPrompt, ''), '', state.currentModel);
    for await (const chunk of planStream) planRes += chunk.text;
    
    updateTask(id, { steps: [...task.steps, 'Plan quruldu. İcra edilir...'] });

    // 2. İcra
    const execPrompt = `Aşağıdakı plan əsasında verilmiş tapşırığı tam və detallı şəkildə icra et.
Tapşırıq: "${task.title}"
Plan:\n${planRes}`;

    let execRes = '';
    const execStream = streamWithFallback(buildMessages(execPrompt, ''), '', state.currentModel);
    for await (const chunk of execStream) execRes += chunk.text;

    updateTask(id, { status: 'done', steps: [...task.steps, 'Təhvil verildi.'], result: execRes });
    showToast('Tapşırıq tamamlandı');
  } catch (err) {
    updateTask(id, { status: 'error', steps: [...task.steps, 'Xəta: ' + esc(err.message)] });
  }
}

// ═══════════════════════════════════════════════════════════
// DEEP RESEARCH
// ═══════════════════════════════════════════════════════════

let stepIdCounter = 0;

function addResearchStep(container, type, title, body) {
  const id = 'rs-' + (++stepIdCounter);
  const iconMap = { plan: '📋', query: '🔍', synthesis: '🧬', done: '✅' };
  
  const html = `
    <div style="margin-bottom:15px; border-left:3px solid var(--primary); padding-left:15px; animation:fadeIn 0.3s ease;" id="${id}" data-type="${type}">
      <div style="font-weight:600; font-size:15px; display:flex; align-items:center; gap:8px;">
        <span>${iconMap[type] || '•'}</span>
        <span>${esc(title)}</span>
      </div>
      <div class="step-body" style="font-size:13px; color:var(--text-muted); margin-top:5px;">${body}</div>
    </div>`;
    
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
  return id;
}

function updateResearchStep(container, stepId, content, newType) {
  let step = document.getElementById(stepId);
  if (!step) {
    step = container.querySelector(`div[data-type="${stepId}"]`); 
  }
  if (!step) return;

  const bodyEl = step.querySelector('.step-body');
  if (bodyEl) {
    bodyEl.innerHTML = renderMarkdown(content);
  }

  if (newType) {
    step.dataset.type = newType;
    const iconMap = { plan: '📋', query: '🔍', synthesis: '🧬', done: '✅' };
    const iconEl = step.querySelector('span'); // ilk span icon-dur
    if (iconEl && iconMap[newType]) iconEl.textContent = iconMap[newType];
  }
  container.scrollTop = container.scrollHeight;
}

async function startResearch() {
  if (researchRunning) return;
  const query = researchTextarea?.value.trim();
  if (!query) { showToast('Araşdırma mövzusu daxil edin'); return; }

  const depthMap = { quick: 3, standard: 5, deep: 7 };
  const depth = depthMap[researchDepthSelect.value] || 5;

  researchRunning = true;
  researchBtn.disabled = true;
  researchBtn.textContent = '⏳ Araşdırılır…';
  researchOutput.innerHTML = '';

  try {
    // 1. Planlama
    addResearchStep(researchOutput, 'plan', 'Araşdırma Planı Qurulur…', '<span class="cursor"></span>');
    let plan = '';
    const sysPromptOpts = "Sən təcrübəli araşdırmaçısan.";
    
    const planPrompt = `"${query}" mövzusunu dərindən araşdırmaq üçün ${depth} ədəd alt-mövzu / axtarış sorğusu hazırlayın.
Format (nömrələnmiş siyahı):
1. Sorğu 1
2. Sorğu 2...
Başqa izahat yazmayın.`;
    
    const pStream = streamWithFallback(buildMessages(planPrompt, sysPromptOpts), sysPromptOpts, state.currentModel);
    for await (const chunk of pStream) {
      plan += chunk.text;
      updateResearchStep(researchOutput, 'plan', plan);
    }
    
    // Parse Plan
    const queries = plan.split('\n')
      .map(q => q.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 5)
      .slice(0, depth);

    if (!queries.length) throw new Error('Plan qurula bilmədi.');

    // 2. Məlumat Toplama
    let combinedInfo = '';
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const stepId = addResearchStep(researchOutput, 'query', `Təhlil edilir: ${q}`, '<span class="cursor"></span>');
      
      const askPrompt = `Sən ekspert data analitikisən. Aşağıdakı sualı çox ətraflı, dəqiq və professional şəkildə cavabla.
Sual: ${q}
İzahatlı və məlumatlandırıcı formatda yaz.`;
      
      let qRes = '';
      const askStream = streamWithFallback(buildMessages(askPrompt, sysPromptOpts), sysPromptOpts, state.currentModel);
      for await (const chunk of askStream) {
        qRes += chunk.text;
        updateResearchStep(researchOutput, stepId, qRes);
      }
      combinedInfo += `\n\n### Mənbə: ${q}\n${qRes}`;
    }

    // 3. Sentez (Synthesis)
    const synId = addResearchStep(researchOutput, 'synthesis', 'Yekun Hesabat Hazırlanır (Synthesis)…', '<span class="cursor"></span>');
    const synPrompt = `Aşağıdakı toplanmış araşdırma materiallarını oxu.
Bütün bu məlumatları birləşdirərək, strukturlaşdırılmış, dolğun və son dərəcə peşəkar YEKUN HESABAT (Deep Research Report) hazırla.
Mövzu: "${query}"
Qısa xülasə ilə başla, alt başlıqlarla davam et və nəticə ilə bitir.

Materiallar:
${combinedInfo}`;

    let report = '';
    const synStream = streamWithFallback(buildMessages(synPrompt, sysPromptOpts), sysPromptOpts, state.currentModel);
    for await (const chunk of synStream) {
      report += chunk.text;
      updateResearchStep(researchOutput, synId, report);
    }
    updateResearchStep(researchOutput, synId, report, 'done');

    showToast('Araşdırma Tamamlandı!');

  } catch (err) {
    addResearchStep(researchOutput, 'error', '❌ Xəta baş verdi', esc(err.message));
    showToast('Xəta baş verdi');
  } finally {
    researchRunning = false;
    researchBtn.disabled = false;
    researchBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:middle;">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      Araşdır
    `;
  }
}
