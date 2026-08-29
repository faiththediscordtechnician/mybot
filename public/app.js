let isAuthenticated = false;

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

function renderChatScreen() {
  const app = document.getElementById('app');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const themeIcon = currentTheme === 'light' ? '🌙' : '☀️';

  app.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <h1>✨ Cute Chat</h1>
        <div class="header-actions">
          <button id="themeToggle" class="theme-toggle" onclick="toggleTheme()">${themeIcon}</button>
          <button class="logout-btn" onclick="handleLogout()">Logout</button>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-area">
        <input type="text" id="messageInput" placeholder="Type something cute..." autocomplete="off">
        <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
      </div>
    </div>
  `;

  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const message = messageInput.value.trim();

  if (!message) return;

  const chatMessages = document.getElementById('chatMessages');

  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'message user';
  userMsgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(message)}</div>`;
  chatMessages.appendChild(userMsgDiv);

  messageInput.value = '';
  sendBtn.disabled = true;

  chatMessages.scrollTop = chatMessages.scrollHeight;

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
      body: JSON.stringify({ message }),
    });

    if (response.ok) {
      const data = await response.json();
      typingDiv.remove();

      const assistantMsgDiv = document.createElement('div');
      assistantMsgDiv.className = 'message assistant';
      assistantMsgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(data.response)}</div>`;
      chatMessages.appendChild(assistantMsgDiv);
    } else {
      typingDiv.remove();
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message assistant';
      errorDiv.innerHTML = `<div class="message-bubble" style="color: #ef4444;">Oops! Something went wrong 😞</div>`;
      chatMessages.appendChild(errorDiv);
    }
  } catch (error) {
    console.error(error);
    typingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant';
    errorDiv.innerHTML = `<div class="message-bubble" style="color: #ef4444;">Connection error 😞</div>`;
    chatMessages.appendChild(errorDiv);
  } finally {
    sendBtn.disabled = false;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    messageInput.focus();
  }
}

async function handleLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
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

// Initial setup
initTheme();
renderLoginScreen();
