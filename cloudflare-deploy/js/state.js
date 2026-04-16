export const state = {
  chatHistory: [],
  conversations: [],
  currentConvId: null,
  currentModel: 'gpt-4o-mini',
  systemPrompt: 'Sən köməkçi AI-san. Qısa, net və konkret cavablar ver.',
  pendingFiles: [],
  isStreaming: false,
  isRecording: false
};

export const KEYS = {
  chat: 'claude-pro-chat',
  convs: 'claude-pro-convs',
  sys: 'claude-pro-sys',
  tasks: 'claude-pro-tasks',
  codeFiles: 'claude-pro-code-files'
};

export function loadPersist(key, defaultVal) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function persist(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Save error:', e);
  }
}
