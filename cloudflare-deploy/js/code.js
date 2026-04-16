let editor;
let isEditorInitialized = false;

export function initCodeEditor() {
  if (isEditorInitialized) return;
  
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.38.0/min/vs' }});
  require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
      value: [
        '// Bura kodunuzu yazın...',
        'function salamla() {',
        '\tconsole.log("Claude Pro Workspace\'ə Xoş Gəldiniz!");',
        '}',
        'salamla();'
      ].join('\n'),
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: 'Fira Code, monospace',
      padding: { top: 16 }
    });
    
    isEditorInitialized = true;
    setupExecution();
  });
}

function setupExecution() {
  const runBtn = document.getElementById('run-code-btn');
  const consoleOutput = document.getElementById('code-console');
  
  if(!runBtn || !consoleOutput) return;

  runBtn.addEventListener('click', () => {
    const code = editor.getValue();
    consoleOutput.innerHTML = ''; // Temizle
    
    // Override console for output panel
    const logs = [];
    const origLog = console.log;
    const origErr = console.error;
    
    console.log = (...args) => { 
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')); 
      consoleOutput.innerHTML = logs.join('\n');
    };
    console.error = (...args) => { 
      logs.push('<span style="color:var(--danger)">❌ ' + args.join(' ') + '</span>'); 
      consoleOutput.innerHTML = logs.join('\n'); 
    };

    try {
      const res = new Function(code)();
      if (res !== undefined && !logs.length) logs.push('<span style="color:var(--accent)">→ ' + JSON.stringify(res) + '</span>');
      if (!logs.length) logs.push('<span style="color:var(--text-muted)">(Çıxış yoxdur)</span>');
      consoleOutput.innerHTML = logs.join('\n');
    } catch (err) {
      consoleOutput.innerHTML = `<span style="color:var(--danger)">❌ Xəta: ${err.message}</span>`;
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });
}
