require("dotenv").config();
const { OpenAI } = require("openai");

const assistantGPTResponse = async (ctx, sysctx, conversationId) => {

    try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID)
    const myThread = await openai.beta.threads.retrieve(conversationId);

    const threadMessages = await openai.beta.threads.messages.create(
      myThread.id,
      { role: "user", content: ctx }
    );

    const run = await openai.beta.threads.runs.create(
      myThread.id,
      { assistant_id: assistant.id, stream: true }
    );
  
    for await (const event of run) {
      if (event.event === 'thread.run.completed') {
        const messages = await openai.beta.threads.messages.list(event.data.thread_id);
        const lastMessage = messages.data[0];
        console.log(lastMessage.content[0]);
        const lastMessageText = lastMessage.content[0].text.value;
        return lastMessageText;
      }
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
};

module.exports = { assistantGPTResponse };
