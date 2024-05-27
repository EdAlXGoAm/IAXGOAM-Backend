require("dotenv").config();
const fs = require("fs");
const { OpenAI } = require("openai");

const voiceToText = async (path) => {
  if (!fs.existsSync(path)) {
    console.log("Whispet | In path file not exist");
    return "ERROR";
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(path),
    });

    console.log("Whisper | OpenAI API response: ", response.text);
    
    return response.text;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(error.status);  // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code);  // e.g. 'invalid_api_key'
      console.error(error.type);  // e.g. 'invalid_request_error'
    } else {
      // Non-API error
      console.log(error);
    }
    return "ERROR";
  }
};

module.exports = { voiceToText };