let isAuthenticated = false;
let conversationHistory = [];
let currentConversationId = 'default';
let useSearch = false;
let allConversations = [];

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
  const saved = localStorage.getItem('conversationHistory');
  return saved ? JSON.parse(saved) : [];
}

function saveConversationHistory() {
  localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
}

async function loadConversations() {
  try {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    allConversations = data.conversations;
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }
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
  renderMessages();
  renderConversationsList();
  loadInstructions();

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

async function newConversation() {
  currentConversationId = Date.now().toString();
  conversationHistory = [];
  saveConversationHistory();
  renderMessages();
  loadConversations();
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

async function deleteConversation(convId, event) {
  event.stopPropagation();
  if (!confirm('Delete this conversation?')) return;

  try {
    await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
    if (convId === currentConversationId) {
      currentConversationId = 'default';
      conversationHistory = [];
    }
    await loadConversations();
    renderConversationsList();
  } catch (err) {
    console.error('Failed to delete conversation:', err);
  }
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

function renderMessages() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';

  conversationHistory.forEach((msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (msg.role === 'assistant') {
      bubble.innerHTML = renderMarkdown(msg.content);
    } else {
      bubble.textContent = msg.content;
    }

    msgDiv.appendChild(bubble);
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

function renderMarkdown(text) {
  const markdown = marked.parse(text);
  return DOMPurify.sanitize(markdown);
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
