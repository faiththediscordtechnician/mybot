const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36WQrnS2'; // Default: "password"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-workspace-id': 'wrkspc_01EYzx6r51wN7bazRxnvY1JR',
  },
});

const conversationHistory = {};

app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { message, conversationId, useSearch } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const sessionId = conversationId || 'default';
    if (!conversationHistory[sessionId]) {
      conversationHistory[sessionId] = [];
    }

    conversationHistory[sessionId].push({
      role: 'user',
      content: message,
    });

    console.log('Sending message to Claude:', message);

    let systemPrompt = 'You are a helpful, friendly assistant.';
    if (useSearch) {
      systemPrompt += ' You have access to current information and can reference recent events and up-to-date facts.';
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory[sessionId],
    });

    console.log('Claude response:', JSON.stringify(response));

    if (!response.content || !response.content[0]) {
      console.error('Unexpected response format:', response);
      return res.status(500).json({ error: 'Invalid response format from Claude' });
    }

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    conversationHistory[sessionId].push({
      role: 'assistant',
      content: text,
    });

    res.json({ response: text });
  } catch (error) {
    console.error('Chat error details:', {
      message: error.message,
      status: error.status,
      error: error.error,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
});

app.post('/api/clear-history', authMiddleware, (req, res) => {
  const { conversationId } = req.body;
  const sessionId = conversationId || 'default';
  conversationHistory[sessionId] = [];
  res.json({ success: true });
});

app.get('/api/conversations', authMiddleware, (req, res) => {
  const conversations = Object.keys(conversationHistory).map((id) => ({
    id,
    messageCount: conversationHistory[id].length,
    preview: conversationHistory[id].length > 0
      ? conversationHistory[id][0].content.substring(0, 50)
      : 'New conversation',
  }));
  res.json({ conversations });
});

app.delete('/api/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  delete conversationHistory[id];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Chatbot running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});
