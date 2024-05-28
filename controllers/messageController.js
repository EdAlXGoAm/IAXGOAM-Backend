const Chat = require("./../models/messageModel"); // Asegúrate de que la ruta sea correcta

async function getMessages(chatId, conversationId) {
  try {
    const chat = await Chat.findOne({ chatId });
    if (chat) {
      const conversation = chat.conversations.find(
        (c) => c.conversationId === conversationId
      );
      // Obtener los ultimos 100 mensajes
      const messages = conversation ? conversation.messages.slice(-10) : [];
      // console.log("Todos los mensajes: ",conversation.messages);
      return messages;
    }
    return [];
  } catch (error) {
    console.error("Error al obtener los mensajes:", error);
    return [];
  }
}

async function saveMessage(chatId, conversationId, newMessage) {
  try {
    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      // Si el chat no existe, crea uno nuevo
      const newChat = new Chat({
        chatId,
        conversations: [{ conversationId, messages: [newMessage] }],
      });
      await newChat.save();
    } else {
      // Busca la conversación dentro del chat
      const conversation = chat.conversations.find(
        (c) => c.conversationId === conversationId
      );
      if (conversation) {
        // Si la conversación existe, añade el mensaje
        conversation.messages.push(newMessage);
      } else {
        // Si no, crea una nueva conversación
        chat.conversations.push({ conversationId, messages: [newMessage] });
      }
      await chat.save();
      // console.log("Mensaje guardado:", newMessage);
    }
  } catch (error) {
    console.error("Error al guardar el mensaje:", error);
  }
}

async function getLastConversationId(chatId) {
  // let conversationId = 0;
  const chat = await Chat.findOne({ chatId });
  if (chat && chat.conversations.length > 0) {
    // Obtener el último conversationId
    const lastConversation = chat.conversations[chat.conversations.length - 1];
    // conversationId = parseInt(lastConversation.conversationId);
    conversationId = lastConversation.conversationId;
    return conversationId;
  } else {
    // Si no hay conversaciones o el chat no existe
    // return conversationId;
    return 0;
  }
}

// Exporta todas tus funciones
module.exports = {
  getMessages,
  saveMessage,
  getLastConversationId,
};
