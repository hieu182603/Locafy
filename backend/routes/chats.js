const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// GET messages for a conversation
router.get('/', async (req, res) => {
  const { chatId, user } = req.query;
  if (!chatId) {
    return res.status(400).json({ error: 'Thiếu tham số chatId.' });
  }

  try {
    const messages = await Chat.find({ chatId }).sort({ createdAt: 1 });
    const formatted = messages.map(m => ({
      sender: m.senderUsername === user ? 'sender' : 'receiver',
      text: m.text,
      time: m.time
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('GET /chats error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi tải tin nhắn.' });
  }
});

// POST message
router.post('/', async (req, res) => {
  const { chatId, message, currentUser } = req.body;
  if (!chatId || !message || !currentUser) {
    return res.status(400).json({ error: 'Thiếu thông tin chatId, message hoặc currentUser.' });
  }

  try {
    const newChat = new Chat({
      chatId,
      senderUsername: currentUser,
      text: message.text,
      time: message.time
    });
    await newChat.save();
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('POST /chats error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi gửi tin nhắn.' });
  }
});

module.exports = router;
