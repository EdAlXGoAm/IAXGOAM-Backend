require("dotenv").config();
const { OpenAI } = require("openai");

const { convertAndSaveTask, fetchAndFormatTasks, getLastTaskId, removeTaskById, getAllTasks, getTaskFromUser, getTaskById, getTaskByTitle, validateId, validateTitle, getAllTasksString } = require("./../controllers/taskController");

const assistantGPTResponse = async (ctx, sysctx, conversationId) => {

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const assistant = await openai.beta.assistants.retrieve(process.env.ASSISTANT_ID)
    const myThread = await openai.beta.threads.retrieve(conversationId);

    /* ----------------- CANCELLING RUNS ----------------- */
    
    // const runs = await openai.beta.threads.runs.list(
    //   myThread.id
    // );
    
    // for (const run of runs.data) {
    //   console.log(run.id);
    // }
    
    // await openai.beta.threads.runs.cancel(
    //   myThread.id,
    //   "run_h6vysDkdHEs6v2io6E06QZcP"
    // );

    // console.log("myThread: ", myThread);
    
    // await openai.beta.threads.del("thread_T93FiWHwscofpLp4Xa951oWc");
    // await openai.beta.threads.del("thread_vkZua1wbc1kgz4jYECeksN95");
    // await openai.beta.threads.del("thread_jKuuqqRXSUVaclIxzVJrA2qh");
    // await openai.beta.threads.del("thread_eNLSj8grWIoXfHwbsZgY8dCy");


    /* ----------------- CANCELLING RUNS ----------------- */

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
        const toolOutputs = await Promise.all(data.required_action.submit_tool_outputs.tool_calls.map(async (toolCall) => {
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
              const flag = await convertAndSaveTask(json_crude);
              if (flag) {
                output_msg = "Tarea guardada con éxito";
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
              else {
                output_msg = "Disculpame, pero no pude guardar el recordatorio. Intenta de nuevo debieron faltar datos";
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
            } else if (toolCall.function.name === "eventGetter") {
              console.log("consultando TAREA EN BASE DE DATOS");
              let json_crude = toolCall.function.arguments;
              json_crude = json_crude.replace(/`/g, '')
              json_crude = json_crude.replace("json", '')
              console.log(json_crude);
              if (json_crude.includes("id")) {
                const id = validateId(json_crude);
                const task = await getTaskById(id)
                console.log("task: ", task);
                output_msg = task;
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
              else if (json_crude.includes("title")) {
                const title = await validateTitle(json_crude);
                const task = getTaskByTitle(title);
                output_msg = task;
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
              else {
                output_msg = "Disculpame, pero no pude encontrar la tarea. Intenta de nuevo";
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
            } else if (toolCall.function.name === "eventDeleter") {
              console.log("eliminando TAREA EN BASE DE DATOS");
              let json_crude = toolCall.function.arguments;
              json_crude = json_crude.replace(/`/g, '')
              json_crude = json_crude.replace("json", '')
              console.log(json_crude);
              if (json_crude.includes("id")) {
                const id = validateId(json_crude);
                const flag = await removeTaskById(id);
                if (flag) {
                  output_msg = "Tarea eliminada con éxito";
                  return {
                    tool_call_id: toolCall.id,
                    output: output_msg,
                  };
                }
                else {
                  output_msg = "Disculpame, pero no pude eliminar el recordatorio. Intenta de nuevo";
                  return {
                    tool_call_id: toolCall.id,
                    output: output_msg,
                  };
                }
              }
              else {
                output_msg = "Disculpame, pero no pude eliminar la tarea. Intenta de nuevo";
                return {
                  tool_call_id: toolCall.id,
                  output: output_msg,
                };
              }
            } else if (toolCall.function.name === "consultAllEvents") {
              console.log("consultando TODAS LAS TAREAS EN BASE DE DATOS");
              output_msg = await getAllTasksString();
              return {
                tool_call_id: toolCall.id,
                output: output_msg,
              };
            }
            
          }));
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
