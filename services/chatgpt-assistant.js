require("dotenv").config();
const { OpenAI } = require("openai");

const { convertAndSaveTask, fetchAndFormatTasks, getLastTaskId, removeTaskById, getAllTasks, getTaskFromUser } = require("./../controllers/taskController");

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
      { assistant_id: assistant.id }
    );

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const handleRequiresAction = async (client, data, runId, threadId) => {
      try {
        const toolOutputs =
          data.required_action.submit_tool_outputs.tool_calls.map((toolCall) => {
            if (toolCall.function.name === "get_weather") {
              return {
                tool_call_id: toolCall.id,
                output: "49 grados",
              };
            } else if (toolCall.function.name === "eventPlanner") {
              console.log("Guardando/Actualizando TAREA EN BASE DE DATOS");
              let json_crude = toolCall.function.arguments;
              json_crude = json_crude.replace(/`/g, '')
              json_crude = json_crude.replace("json", '')
              console.log(json_crude);
              const flag = convertAndSaveTask(json_crude);
              if (flag) {
                output_msg = "Tarea guardada con éxito";
              }
              else {
                output_msg = "Disculpame, pero no pude guardar el recordatorio. Intenta de nuevo debieron faltar datos";
              }
              return {
                tool_call_id: toolCall.id,
                output: output_msg,
              };
            }
          });
        // Submit all the tool outputs at the same time
        console.log("toolOutputs: ", toolOutputs)
        await submitToolOutputs(client, toolOutputs, runId, threadId);
      } catch (error) {
        console.error("Error processing required action:", error);
      }
    }

    const submitToolOutputs = async(client, toolOutputs, runId, threadId) => {
      try {
        const stream = client.beta.threads.runs.submitToolOutputsStream(
          threadId,
          runId,
          { tool_outputs: toolOutputs },
        );
      } catch (error) {
        console.error("Error submitting tool outputs:", error);
      }
    }

    const startPolling = async () => {
      for (;;) {
        try {
          const updatedRun = await openai.beta.threads.runs.retrieve(myThread.id, run.id);
          console.log("Run status:", updatedRun.status);
          if (["cancelled", "failed", "completed", "expired"].includes(updatedRun.status)) {
            const messages = await openai.beta.threads.messages.list(updatedRun.thread_id);
            const lastMessage = messages.data[0];
            const lastMessageText = lastMessage.content[0].text.value;
            console.log(lastMessageText);
            return lastMessageText;
            break; // Si el estado es uno de los mencionados, detiene el bucle
          }
          else if (updatedRun.status === "requires_action") {
            handleRequiresAction(openai, updatedRun, run.id, myThread.id);
          }
        } catch (error) {
          console.error("Error polling run status:", error);
        }
    
        await delay(500); // Espera 500 ms antes de la próxima iteración
      }
    };

    return await startPolling(run);
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
