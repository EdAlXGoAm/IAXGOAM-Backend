require("dotenv").config();
const { OpenAI } = require("openai");

const chatGPTCompletion = async (ctx, sysctx, messagesHistory) => {

    try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    messagesInput = [];
    if (sysctx != "") {
      messagesInput.push({"role": "system", "content": sysctx});
    }
    const messagesHistoryArray = messagesHistory.map((message) => {
      const roleMsg = message.role;
      return {
        role: roleMsg,
        content: message.body
      };
    });
    messagesInput = messagesInput.concat(messagesHistoryArray);
    if (ctx != "") {
      messagesInput.push({"role": "user", "content": ctx});
    }

    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-2024-05-13",
        messages: messagesInput,
    });
    
    return chatCompletion.choices[0].message.content;
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

module.exports = { chatGPTCompletion };
