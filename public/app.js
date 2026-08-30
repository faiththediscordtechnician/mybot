let isAuthenticated = false;
let conversationHistory = [];
let currentConversationId = 'default';
let useSearch = false;
let allConversations = [];
let userMemories = {};

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeToggle();
}

function updateThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    toggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
  }
}

function renderLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-container">
      <h1>✨ Cute Chat</h1>
      <form id="loginForm">
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required autofocus>
        </div>
        <button type="submit" class="login-btn">Login</button>
        <div id="loginError" class="error"></div>
      </form>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      isAuthenticated = true;
      renderChatScreen();
    } else {
      errorDiv.textContent = 'Invalid password';
    }
  } catch (error) {
    errorDiv.textContent = 'Login failed';
    console.error(error);
  }
}

function loadConversationHistory() {
  const saved = localStorage.getItem(`conversation_${currentConversationId}`);
  return saved ? JSON.parse(saved) : [];
}

function saveConversationHistory() {
  localStorage.setItem(`conversation_${currentConversationId}`, JSON.stringify(conversationHistory));
}

function loadConversationsList() {
  const saved = localStorage.getItem('conversationsList');
  return saved ? JSON.parse(saved) : ['default'];
}

function saveConversationsList(list) {
  localStorage.setItem('conversationsList', JSON.stringify(list));
}

async function loadMemories() {
  const saved = localStorage.getItem('userMemories');
  return saved ? JSON.parse(saved) : {};
}

function saveMemories() {
  localStorage.setItem('userMemories', JSON.stringify(userMemories));
}

function loadConversations() {
  const convIds = loadConversationsList();
  allConversations = convIds.map((id) => {
    const history = JSON.parse(localStorage.getItem(`conversation_${id}`) || '[]');
    return {
      id,
      messageCount: history.length,
      preview: history.length > 0
        ? history[0].content.substring(0, 50)
        : 'New conversation',
    };
  });
}

function renderChatScreen() {
  const app = document.getElementById('app');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const themeIcon = currentTheme === 'light' ? '🌙' : '☀️';

  app.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <button class="new-chat-btn" onclick="newConversation()">+ New Chat</button>
        </div>
        <div class="conversations-list" id="conversationsList"></div>
      </div>
      <div class="chat-main">
        <div class="chat-container">
          <div class="chat-header">
            <h1>✨ Cute Chat</h1>
            <div class="header-actions">
              <button class="search-toggle" id="searchToggle" onclick="toggleSearch()" title="Enable web search">🔍</button>
              <button id="themeToggle" class="theme-toggle" onclick="toggleTheme()">${themeIcon}</button>
              <button class="clear-btn" onclick="clearHistory()" title="Clear conversation">🗑️</button>
              <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
          </div>
          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('chat')">Chat</button>
            <button class="tab-btn" onclick="switchTab('memories')">Memories</button>
            <button class="tab-btn" onclick="switchTab('instructions')">Instructions</button>
          </div>
          <div id="chatTab" class="tab-content active">
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
              <input type="file" id="fileInput" accept="image/*,.pdf,.txt,.doc,.docx" style="display:none">
              <button class="file-btn" onclick="document.getElementById('fileInput').click()" title="Upload file">📎</button>
              <input type="text" id="messageInput" placeholder="Type something cute..." autocomplete="off">
              <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
            </div>
          </div>
          <div id="memoriesTab" class="tab-content">
            <div class="memories-content">
              <h2>Your Memories</h2>
              <div id="memoriesList" class="memories-list"></div>
              <div class="memory-input-area">
                <input type="text" id="memoryKey" placeholder="Memory name (e.g., favorite_color)" class="memory-input">
                <textarea id="memoryValue" placeholder="Memory content..." class="memory-textarea"></textarea>
                <button class="add-memory-btn" onclick="addMemory()">Add Memory</button>
              </div>
            </div>
          </div>
          <div id="instructionsTab" class="tab-content">
            <div class="instructions-content">
              <h2>Instructions</h2>
              <textarea id="instructionsText" placeholder="Enter system instructions for Claude..." class="instructions-textarea"></textarea>
              <button class="save-btn" onclick="saveInstructions()">Save Instructions</button>
              <button class="reset-btn" onclick="resetInstructions()">Reset to Default</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadConversations();
  conversationHistory = loadConversationHistory();
  userMemories = loadMemories();
  renderMessages();
  renderConversationsList();
  loadInstructions();
  renderMemories();

  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const fileInput = document.getElementById('fileInput');
  const chatMessages = document.getElementById('chatMessages');

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  messageInput.addEventListener('paste', handlePaste);

  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }

  if (chatMessages) {
    chatMessages.addEventListener('dragover', (e) => {
      e.preventDefault();
      chatMessages.style.backgroundColor = 'rgba(212, 165, 116, 0.1)';
    });

    chatMessages.addEventListener('dragleave', () => {
      chatMessages.style.backgroundColor = '';
    });

    chatMessages.addEventListener('drop', (e) => {
      e.preventDefault();
      chatMessages.style.backgroundColor = '';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const fileData = event.target.result;
          const fileName = file.name;
          const fileType = file.type;
          sendFileMessage(fileName, fileType, fileData);
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function handlePaste(e) {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target.result;
        const fileName = file.name || `image_${Date.now()}.png`;
        const fileType = file.type;
        sendFileMessage(fileName, fileType, fileData);
      };
      reader.readAsDataURL(file);
      e.preventDefault();
      break;
    }
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const fileData = event.target.result;
    const fileName = file.name;
    const fileType = file.type;

    conversationHistory.push({
      role: 'user',
      content: `[File uploaded: ${fileName}]`,
      file: {
        name: fileName,
        type: fileType,
        data: fileData,
      },
    });

    saveConversationHistory();
    renderMessages();

    document.getElementById('fileInput').value = '';

    await sendFileMessage(fileName, fileType, fileData);
  };

  reader.readAsDataURL(file);
}

async function sendFileMessage(fileName, fileType, fileData) {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  sendBtn.disabled = true;

  const chatMessages = document.getElementById('chatMessages');

  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `I've uploaded a file: ${fileName}. Here it is for analysis:`,
        file: { name: fileName, type: fileType, data: fileData },
        conversationId: currentConversationId,
        useSearch,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      conversationHistory.push({ role: 'assistant', content: data.response });
      saveConversationHistory();
    } else {
      conversationHistory.push({ role: 'assistant', content: 'Failed to process file 😞' });
      saveConversationHistory();
    }
  } catch (error) {
    console.error(error);
    conversationHistory.push({ role: 'assistant', content: 'File upload error 😞' });
    saveConversationHistory();
  } finally {
    typingDiv.remove();
    renderMessages();
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`${tab}Tab`).classList.add('active');
}

function newConversation() {
  currentConversationId = Date.now().toString();
  conversationHistory = [];
  saveConversationHistory();

  const convList = loadConversationsList();
  if (!convList.includes(currentConversationId)) {
    convList.unshift(currentConversationId);
    saveConversationsList(convList);
  }

  loadConversations();
  renderMessages();
  renderConversationsList();
}

function renderConversationsList() {
  const list = document.getElementById('conversationsList');
  if (!list) return;

  list.innerHTML = allConversations.map(conv => `
    <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" onclick="switchConversation('${conv.id}')">
      <div class="conversation-text">${conv.preview}</div>
      <button class="delete-conv-btn" onclick="deleteConversation('${conv.id}', event)">✕</button>
    </div>
  `).join('');
}

function switchConversation(convId) {
  currentConversationId = convId;
  conversationHistory = loadConversationHistory();
  renderMessages();
  renderConversationsList();
}

function deleteConversation(convId, event) {
  event.stopPropagation();
  if (!confirm('Delete this conversation?')) return;

  localStorage.removeItem(`conversation_${convId}`);

  const convList = loadConversationsList();
  const updated = convList.filter(id => id !== convId);
  saveConversationsList(updated);

  if (convId === currentConversationId) {
    currentConversationId = 'default';
    conversationHistory = [];
    saveConversationHistory();
  }

  loadConversations();
  renderConversationsList();
}

function toggleSearch() {
  useSearch = !useSearch;
  const btn = document.getElementById('searchToggle');
  if (btn) {
    btn.style.opacity = useSearch ? '1' : '0.5';
  }
}

function loadInstructions() {
  const saved = localStorage.getItem('customInstructions');
  const textarea = document.getElementById('instructionsText');
  if (textarea) {
    textarea.value = saved || 'You are a helpful, friendly assistant.';
  }
}

function saveInstructions() {
  const textarea = document.getElementById('instructionsText');
  localStorage.setItem('customInstructions', textarea.value);
  alert('Instructions saved!');
}

function resetInstructions() {
  localStorage.removeItem('customInstructions');
  loadInstructions();
  alert('Instructions reset to default!');
}

function extractMemories(text) {
  const memoryPattern = /```memory:([^\n]+)\n([\s\S]*?)```/g;
  const memories = [];
  let match;

  while ((match = memoryPattern.exec(text)) !== null) {
    memories.push({
      key: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return memories;
}

function removeMemoryMarkers(text) {
  return text.replace(/```memory:[^\n]+\n[\s\S]*?```/g, '').trim();
}

function renderMemories() {
  const list = document.getElementById('memoriesList');
  if (!list) return;

  if (Object.keys(userMemories).length === 0) {
    list.innerHTML = '<p class="empty-memories">No memories yet. Claude will create memories about you during conversations.</p>';
    return;
  }

  list.innerHTML = Object.entries(userMemories).map(([key, value]) => `
    <div class="memory-card">
      <div class="memory-header">
        <h3>${escapeHtml(key)}</h3>
        <button class="delete-memory-btn" onclick="deleteMemory('${key}')">✕</button>
      </div>
      <p class="memory-content">${escapeHtml(value)}</p>
      <small class="memory-timestamp">Added at ${new Date().toLocaleString()}</small>
    </div>
  `).join('');
}

function addMemory() {
  const keyInput = document.getElementById('memoryKey');
  const valueInput = document.getElementById('memoryValue');

  const key = keyInput.value.trim();
  const value = valueInput.value.trim();

  if (!key || !value) {
    alert('Please fill in both memory name and content');
    return;
  }

  userMemories[key] = value;
  saveMemories();
  renderMemories();

  keyInput.value = '';
  valueInput.value = '';
}

function deleteMemory(key) {
  if (!confirm(`Delete memory "${key}"?`)) return;
  delete userMemories[key];
  saveMemories();
  renderMemories();
}

function renderMessages() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';

  conversationHistory.forEach((msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.role}`;

    if (msg.role === 'assistant') {
      const files = extractFiles(msg.content);
      const memories = extractMemories(msg.content);
      let cleanContent = removeFileMarkers(msg.content);
      cleanContent = removeMemoryMarkers(cleanContent);

      if (memories.length > 0) {
        memories.forEach(m => {
          userMemories[m.key] = m.content;
        });
        saveMemories();
        renderMemories();
      }

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = renderMarkdown(cleanContent);
      msgDiv.appendChild(bubble);

      if (files.length > 0) {
        const filesDiv = document.createElement('div');
        filesDiv.className = 'files-container';

        files.forEach((file) => {
          const fileWrapper = document.createElement('div');
          fileWrapper.className = 'file-item';

          const fileHeader = document.createElement('div');
          fileHeader.className = 'file-header';

          const fileBtn = document.createElement('button');
          fileBtn.className = 'file-download-btn';
          fileBtn.textContent = `📥 ${file.name}`;
          fileBtn.onclick = () => downloadFile(file.name, file.content);
          fileHeader.appendChild(fileBtn);

          const previewBtn = document.createElement('button');
          previewBtn.className = 'preview-btn';
          previewBtn.textContent = '👁️';
          previewBtn.title = 'Preview file';
          previewBtn.onclick = () => toggleFilePreview(fileWrapper, file.name, file.content);
          fileHeader.appendChild(previewBtn);

          fileWrapper.appendChild(fileHeader);

          const preview = document.createElement('div');
          preview.className = 'file-preview';
          preview.style.display = 'none';

          const previewContent = document.createElement('pre');
          previewContent.textContent = file.content.substring(0, 500) + (file.content.length > 500 ? '\n... (truncated)' : '');
          preview.appendChild(previewContent);

          fileWrapper.appendChild(preview);
          filesDiv.appendChild(fileWrapper);
        });

        msgDiv.appendChild(filesDiv);
      }
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = msg.content;
      msgDiv.appendChild(bubble);
    }

    chatMessages.appendChild(msgDiv);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const message = messageInput.value.trim();

  if (!message) return;

  conversationHistory.push({ role: 'user', content: message });
  saveConversationHistory();
  renderMessages();

  messageInput.value = '';
  sendBtn.disabled = true;

  const chatMessages = document.getElementById('chatMessages');

  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: currentConversationId,
        useSearch,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      conversationHistory.push({ role: 'assistant', content: data.response });
      saveConversationHistory();
    } else {
      conversationHistory.push({ role: 'assistant', content: 'Oops! Something went wrong 😞' });
      saveConversationHistory();
    }
  } catch (error) {
    console.error(error);
    conversationHistory.push({ role: 'assistant', content: 'Connection error 😞' });
    saveConversationHistory();
  } finally {
    typingDiv.remove();
    renderMessages();
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

async function clearHistory() {
  if (!confirm('Clear all messages? This cannot be undone.')) return;
  try {
    await fetch('/api/clear-history', { method: 'POST' });
    conversationHistory = [];
    saveConversationHistory();
    renderMessages();
  } catch (error) {
    console.error(error);
  }
}

async function handleLogout() {
  try {
    await fetch('/api/clear-history', { method: 'POST' });
    await fetch('/api/logout', { method: 'POST' });
    conversationHistory = [];
    localStorage.removeItem('conversationHistory');
    isAuthenticated = false;
    renderLoginScreen();
  } catch (error) {
    console.error(error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function extractFiles(text) {
  const filePattern = /```file:([^\n]+)\n([\s\S]*?)```/g;
  const files = [];
  let match;

  while ((match = filePattern.exec(text)) !== null) {
    files.push({
      name: match[1],
      content: match[2].trim(),
    });
  }

  return files;
}

function removeFileMarkers(text) {
  return text.replace(/```file:[^\n]+\n[\s\S]*?```/g, '').trim();
}

function renderMarkdown(text) {
  const markdown = marked.parse(text);
  return DOMPurify.sanitize(markdown);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFileType(filename) {
  const ext = getFileExtension(filename);
  if (['pdf'].includes(ext)) return 'pdf';
  if (['html', 'htm'].includes(ext)) return 'html';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['json', 'js', 'py', 'java', 'cpp', 'c', 'rb', 'go', 'rs', 'php', 'css', 'ts'].includes(ext)) return 'code';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  return 'text';
}

function renderFilePreview(filename, content) {
  const fileType = getFileType(filename);
  const previewDiv = document.createElement('div');
  previewDiv.className = 'file-preview-content';

  try {
    switch (fileType) {
      case 'pdf':
        renderPdfPreview(previewDiv, content);
        break;
      case 'html':
        renderHtmlPreview(previewDiv, content);
        break;
      case 'image':
        renderImagePreview(previewDiv, content);
        break;
      case 'code':
        renderCodePreview(previewDiv, content, getFileExtension(filename));
        break;
      case 'markdown':
        renderMarkdownPreview(previewDiv, content);
        break;
      default:
        renderTextPreview(previewDiv, content);
    }
  } catch (err) {
    console.error('Preview error:', err);
    previewDiv.innerHTML = '<p>Preview not available</p>';
  }

  return previewDiv;
}

function renderTextPreview(container, content) {
  const pre = document.createElement('pre');
  pre.textContent = content.substring(0, 500) + (content.length > 500 ? '\n... (truncated)' : '');
  container.appendChild(pre);
}

function renderCodePreview(container, content, lang) {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${lang}`;
  code.textContent = content.substring(0, 1000) + (content.length > 1000 ? '\n... (truncated)' : '');
  pre.appendChild(code);
  container.appendChild(pre);

  if (window.hljs) {
    window.hljs.highlightElement(code);
  }
}

function renderMarkdownPreview(container, content) {
  const html = marked.parse(content.substring(0, 1000));
  container.innerHTML = DOMPurify.sanitize(html);
}

function renderHtmlPreview(container, content) {
  const iframe = document.createElement('iframe');
  iframe.className = 'preview-iframe';
  iframe.style.width = '100%';
  iframe.style.height = '400px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '4px';

  const blob = new Blob([content], { type: 'text/html' });
  iframe.src = URL.createObjectURL(blob);
  container.appendChild(iframe);
}

function renderImagePreview(container, content) {
  const img = document.createElement('img');
  img.src = content;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '400px';
  img.style.borderRadius = '4px';
  container.appendChild(img);
}

async function renderPdfPreview(container, content) {
  try {
    const pdfData = atob(content.split(',')[1]);
    const pdfArray = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
      pdfArray[i] = pdfData.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: pdfArray }).promise;
    const page = await pdf.getPage(1);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    container.appendChild(canvas);
  } catch (err) {
    const p = document.createElement('p');
    p.textContent = 'PDF preview not available';
    container.appendChild(p);
  }
}

function toggleFilePreview(fileWrapper, filename, content) {
  const preview = fileWrapper.querySelector('.file-preview');
  const isVisible = preview.style.display !== 'none';

  if (!isVisible && preview.children.length === 0) {
    const previewContent = renderFilePreview(filename, content);
    preview.appendChild(previewContent);
  }

  preview.style.display = isVisible ? 'none' : 'block';
}

// Initial setup
initTheme();
checkAuthAndRender();

async function checkAuthAndRender() {
  try {
    const res = await fetch('/api/check-auth');
    if (res.ok) {
      isAuthenticated = true;
      renderChatScreen();
    } else {
      renderLoginScreen();
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    renderLoginScreen();
  }
}
