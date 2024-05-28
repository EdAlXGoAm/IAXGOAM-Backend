const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  body: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  messages: [messageSchema]
});

const chatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  conversations: [conversationSchema]
});

const Chat = mongoose.model('Chats', chatSchema);

module.exports = Chat;
