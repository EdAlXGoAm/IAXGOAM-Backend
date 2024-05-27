const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require("@bot-whatsapp/bot");
require("dotenv").config();
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require("@bot-whatsapp/database/mock");

const { textToSpeech } = require("./services/text_to_speech");
const { FulldateTimeDate } = require("./services/getdate");
const { chatGPTCompletion } = require("./services/chatgpt");
const { getTextMsgVoiceNote } = require("./services/msg_voice_note");
const { fillSysPrompt, fillMessageHeader } = require("./services/msg_filler.js");

const { getUser } = require("./controllers/userController");
const { getMessages, saveMessage, getLastConversationId } = require("./controllers/messageController");

const mongoose = require("mongoose");
const MONGO_DB_URI = process.env.MONGO_DB_URI;
mongoose.connect( MONGO_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, } );

const cron = require("node-cron");


// ----------------- FLOWS -----------------


const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
    async (ctx, ctxFn) => {
      const msgType = "Audio";
      const [dateId, timeId, dayName] = await FulldateTimeDate();
      const currentTime = dateId + " " + timeId + " " + dayName;
  
      const chatId = ctx.from;
      const conversationId = await getLastConversationId(chatId);
      const messagesHistory = await getMessages(chatId, conversationId);
      const [userName, phoneNumber, aliasList] = await getUser(chatId);
      

      const sys_prompt_filled = await fillSysPrompt();

      const textInput = await getTextMsgVoiceNote(ctx);
      const full_textInput = await fillMessageHeader(textInput, userName, phoneNumber, msgType, currentTime);
      const userMessage = { role: "user", body: full_textInput };
      await saveMessage(chatId, conversationId, userMessage);
      console.log("full_textInput: ", full_textInput);

      const full_textOutput = await chatGPTCompletion( full_textInput, sys_prompt_filled, messagesHistory );
      const assistantMessage = { role: "assistant", body: full_textOutput };
      await saveMessage(chatId, conversationId, assistantMessage);
      console.log("full_textOutput: ", full_textOutput);
      
      await ctxFn.flowDynamic(`${full_textOutput}`); //🤖
      const path = await textToSpeech(full_textOutput);
      await ctxFn.flowDynamic([{ body: "escucha", media: path }]);
    }
  );
  
  const flowMsg = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
    const msgType = "Texto";
    const [dateId, timeId, dayName] = await FulldateTimeDate();
    const currentTime = dateId + " " + timeId + " " + dayName;

    const chatId = ctx.from;
    const conversationId = await getLastConversationId(chatId);
    const messagesHistory = await getMessages(chatId, conversationId);
    const [userName, phoneNumber, aliasList] = await getUser(chatId);
  
    const sys_prompt_filled = await fillSysPrompt();
  
    const textInput = ctx.message.conversation;
    const full_textInput = await fillMessageHeader(textInput, userName, phoneNumber, msgType, currentTime);
    const userMessage = { role: "user", body: full_textInput };
    await saveMessage(chatId, conversationId, userMessage);
    console.log("full_textInput: ", full_textInput);
  
    const full_textOutput = await chatGPTCompletion( full_textInput, sys_prompt_filled, messagesHistory );
    const assistantMessage = { role: "assistant", body: full_textOutput };
    await saveMessage(chatId, conversationId, assistantMessage);
    console.log("full_textOutput: ", full_textOutput);
  
    await ctxFn.flowDynamic(`${full_textOutput}`); //🤖

    if (textInput.includes("'")) {
      const path = await textToSpeech(full_textOutput);
      await ctxFn.flowDynamic([{ body: "escucha", media: path }]);
    }
  });
  
  const flowNewConversation = addKeyword("Nueva conversación").addAction(
    async (ctx, ctxFn) => {
      const chatId = ctx.from;
      let conversationId = await getLastConversationId(chatId);
      conversationId += 1;
      let newMessage = {
        role: "system",
        body: "Nueva conversación",
      };
      await saveMessage(chatId, conversationId, newMessage);
      await ctxFn.flowDynamic(`Nueva conversación iniciada`); //🤖
    }
  );

// ----------------- END FLOWS -----------------


const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowVoiceNote, flowMsg, flowNewConversation])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()