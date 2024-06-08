const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require("@bot-whatsapp/bot");
require("dotenv").config();
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require("@bot-whatsapp/database/mock");

const { textToSpeech } = require("./services/text_to_speech");
const { FulldateTimeDate } = require("./services/getdate");
const { chatGPTCompletion } = require("./services/chatgpt");
const sys_prompt_main = require("./prompt/sys_prompt_main.js");
const { assistantGPTResponse } = require("./services/chatgpt-assistant");
const { getTextMsgVoiceNote } = require("./services/msg_voice_note");
const { fillSysPrompt, fillMessageHeader } = require("./services/msg_filler.js");

const { getUser } = require("./controllers/userController");
const { getMessages, saveMessage, getLastConversationId } = require("./controllers/messageController");

const { convertAndSaveTask, fetchAndFormatTasks, getLastTaskId, removeTaskById, getAllTasks, getTaskFromUser } = require("./controllers/taskController");

const mongoose = require("mongoose");
const MONGO_DB_URI = process.env.MONGO_DB_URI;
mongoose.connect( MONGO_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, } );

const cron = require("node-cron");

const OpenAI = require("openai");

// ----------------- FLOWS -----------------


const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
    async (ctx, { flowDynamic, gotoFlow }) => {
      const msgType = "Audio";
      const [dateId, timeId, dayName] = await FulldateTimeDate();
      const currentTime = dateId + " " + timeId + " " + dayName;
  
      const chatId = ctx.from;
      let conversationId = ""
      if (await getLastConversationId(chatId) !== 0) {
        conversationId = await getLastConversationId(chatId);
      }
      else {
        await gotoFlow(flowNewConversation);
        return;
      }
      const messagesHistory = await getMessages(chatId, conversationId);
      const [userName, phoneNumber, aliasList] = await getUser(chatId);
      

      const sys_prompt_filled = await fillSysPrompt();

      const textInput = await getTextMsgVoiceNote(ctx);
      const full_textInput = await fillMessageHeader(textInput, userName, phoneNumber, msgType, currentTime);
      const userMessage = { role: "user", body: full_textInput };
      await saveMessage(chatId, conversationId, userMessage);
      console.log("full_textInput: ", full_textInput);

      // const full_textOutput = await chatGPTCompletion( full_textInput, sys_prompt_filled, messagesHistory );
      const full_textOutput = await assistantGPTResponse( full_textInput, sys_prompt_filled, conversationId );
      const assistantMessage = { role: "assistant", body: full_textOutput };
      await saveMessage(chatId, conversationId, assistantMessage);
      console.log("full_textOutput: ", full_textOutput);
      
      await flowDynamic(`${full_textOutput}`); //🤖
      const path = await textToSpeech(full_textOutput);
      await flowDynamic([{ body: "escucha", media: path }]);
    }
  );
  
  const flowMsg = addKeyword(EVENTS.WELCOME).addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    const msgType = "Texto";
    const [dateId, timeId, dayName] = await FulldateTimeDate();
    const currentTime = dateId + " " + timeId + " " + dayName;

    const chatId = ctx.from;
    let conversationId = ""
    if (await getLastConversationId(chatId) !== 0) {
      conversationId = await getLastConversationId(chatId);
    }
    else {
      await gotoFlow(flowNewConversation);
      return;
    }
    const messagesHistory = await getMessages(chatId, conversationId);
    const [userName, phoneNumber, aliasList] = await getUser(chatId);
  
    const sys_prompt_filled = await fillSysPrompt();
  
    let textInput = ""
    if (ctx.message.conversation) {
      textInput = ctx.message.conversation;
    } else {
      textInput = ctx.message.extendedTextMessage.text;
    }
    const full_textInput = await fillMessageHeader(textInput, userName, phoneNumber, msgType, currentTime);
    const userMessage = { role: "user", body: full_textInput };
    await saveMessage(chatId, conversationId, userMessage);
    console.log("full_textInput: ", full_textInput);
  
    // const full_textOutput = await chatGPTCompletion( full_textInput, sys_prompt_filled, messagesHistory );
    const full_textOutput = await assistantGPTResponse( full_textInput, sys_prompt_filled, conversationId );
    const assistantMessage = { role: "assistant", body: full_textOutput };
    await saveMessage(chatId, conversationId, assistantMessage);
    console.log("full_textOutput: ", full_textOutput);
  
    await flowDynamic(`${full_textOutput}`); //🤖

    if (textInput.includes("'")) {
      const path = await textToSpeech(full_textOutput);
      await flowDynamic([{ body: "escucha", media: path }]);
    }
  });
  
  const flowNewConversation = addKeyword("Nueva conversación").addAction(
    async (ctx, { flowDynamic, gotoFlow }) => {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        const emptyThread = await openai.beta.threads.create();
      
        const chatId = ctx.from;
        // let conversationId = await getLastConversationId(chatId);
        let conversationId = emptyThread.id;
        let newMessage = {
          role: "system",
          body: "Nueva conversación",
        };
        await saveMessage(chatId, conversationId, newMessage);
        await flowDynamic(`Nueva conversación iniciada`); //🤖
        if (ctx.message.conversation || ctx.message.extendedTextMessage.text) {
          if ((ctx.message.conversation && !ctx.message.conversation.includes("Nueva Conversación")) || (ctx.message.extendedTextMessage.text && !ctx.message.extendedTextMessage.text.includes("Nueva Conversación"))) {
            await gotoFlow(flowMsg);
          } else {
            await flowDynamic(`Envia un mensaje para iniciar una conversación`); //🤖
          }
        } else {
          await flowDynamic(`Envia un mensaje para iniciar una conversación`); //🤖
        }
      } catch (error) {
        if (error instanceof OpenAI.APIError) {
          console.error(error.status); // e.g. 401
          console.error(error.message); // e.g. The authentication token you passed was invalid...
          console.error(error.code); // e.g. 'invalid_api_key'
          console.error(error.type); // e.g. 'invalid_request_error'
        } else {
          // Non-API error
          console.log(error);
        }
        return "ERROR";
      }
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

    
    // try {
    //   const openai = new OpenAI({
    //     apiKey: process.env.OPENAI_API_KEY
    //   });

      
    //   const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID)
    //   const myThread = await openai.beta.threads.retrieve("thread_BJMlNnKhZUjBZvXwgPhwPYmK");

    //   const updatedRun = await openai.beta.threads.runs.retrieve(myThread.id, "run_vGdxoUjBkPzhLjYTfDTVmFY1");
      
    //   const messages = await openai.beta.threads.messages.list(updatedRun.thread_id);
    //   const lastMessage = messages.data[0];
    //   const lastMessageText = lastMessage.content[0].text.value;
    //   console.log(lastMessageText);
    // }
    // catch (error) {
    //   console.error("Error initializing OpenAI:", error);
    // }


    
    cron.schedule("* * * * *", async () => {
      // console.log("Tarea ejecutándose cada minuto");
      const [dateId, timeId, dayName] = await FulldateTimeDate();
      const relevantTasks = await fetchAndFormatTasks();
      // console.log("relevantTasks: ", JSON.stringify(relevantTasks));
      // Convertir notificación a un json string
      if (relevantTasks.length > 0) {
        for (let index = 0; index < relevantTasks.length; index++) {
          const task = relevantTasks[index];
          const notification_String = JSON.stringify(task);
          const phoneNumberList = task.responsable_phones;
          console.log("Numeros de telefono: ", phoneNumberList);

          /* ----------------- ALARMA Update to `Completada` ----------------- */
          // if (task.type === "Alarma") {
            lastNotification = task.notifications_info.notifications[task.notifications_info.notifications.length - 1].date_hour;
            console.log("lastNotification: ", lastNotification);
            if (lastNotification === dateId + " " + timeId + " " + dayName) {
              task.status = "Completed";
              await convertAndSaveTask(JSON.stringify(task));
            }
          // }
          /* Fin ------------- ALARMA Update to `Completada` ----------------- */
          
          const message = "NOTIFICA EL SIGUIENTE RECORDATORIO\n" + 
                          "MsgTimestamp: " + dateId + " " + timeId + " " + dayName + "\n" +
                          notification_String;
          const baileysConnection = await adapterProvider.getInstance();
          let full_textOutput = await chatGPTCompletion( message, sys_prompt_main.SYS_CONTEXT, [] );
          console.log("full_textOutput: ", full_textOutput);
          
          // const path = await textToSpeech(full_textOutput);
          // Enviar mensaje de audio
          for (let index = 0; index < phoneNumberList.length; index++) {
            let newMessage = {
              role: "user", // o el rol adecuado según tu lógica
              body: full_textOutput,
            };
            const conversationId = await getLastConversationId(phoneNumberList[index]);
            await saveMessage(phoneNumberList[index], conversationId, newMessage);
            console.log("enviando mensaje: ", newMessage, " a ", phoneNumberList[index]);
            await baileysConnection.sendMessage(phoneNumberList[index] + "@s.whatsapp.net", { text: full_textOutput, });
            // await baileysConnection.sendMessage(phoneNumberList[index] + "@s.whatsapp.net", {
            //   audio: { url: path },
            //   mimetype: "audio/mp4", // Asegúrate de usar el mimetype correcto para tu archivo
            //   ptt: true, // Esto es para enviarlo como un mensaje PTT (Push To Talk), cambia a false si no lo deseas
            // });
          }
        }
      }
    });
}

main()