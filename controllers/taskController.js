const Task = require("./../models/taskModel"); // Asegúrate de que la ruta sea correcta
const { FulldateTimeDate } = require("./../services/getdate");
const Joi = require("joi");
async function convertAndSaveTask(jsonString) {
    // Define el esquema de validación con Joi
    const schema = Joi.object({
      id: Joi.string().required(),
      title: Joi.string().required(),
      details: Joi.string(),
      responsable_names: Joi.array().items(Joi.string()),
      responsable_phones: Joi.array().items(Joi.string()),
      place: Joi.string(),
      situation: Joi.string(),
      type: Joi.string().valid('Alarma', 'Recordatorio', 'Pendientes', 'Eventos').required(),
      status: Joi.string().valid('Pendiente', 'Corriendo', 'Completada', 'Cancelada').required(),
      notifications_info: Joi.object({
        notifications: Joi.array().items(
          Joi.object({
            date_hour: Joi.string(),
            details: Joi.string(),
          }),
        ),
      }),
      pending_info: Joi.object({
        limit_date_hour_start: Joi.string(),
        limit_date_hour_end: Joi.string(),
      }),
      pending_and_events_info: Joi.object({
        date_hour_start: Joi.string(),
        date_hour_end: Joi.string(),
      }),
      event_filling_info: Joi.object({
        filling_status: Joi.string().valid('Completo', 'Datos Faltantes', 'Se debe actualizar o Comprobar constantemente', 'Tiene tiempo que no se revisa la tarea y no esta en estado completada').required(),
        filling_details: Joi.string(),
        filling_notifications: Joi.array().items(
          Joi.object({
            date_hour: Joi.string(),
            details: Joi.string(),
          }),
        ),
      })
    });
  
    try {
      // Intenta convertir y validar el JSON
      const validatedData = await schema.validateAsync(JSON.parse(jsonString));
  
      // Crea un nuevo objeto de tarea con los datos validados
      const taskData = new Task(validatedData);
  
      // Busca la tarea en MongoDB usando el valor id como identificador
      const existingTask = await Task.findOne({ 'id': taskData.id });
      if (existingTask) {
        // Si la tarea ya existe, actualiza sus datos
        await Task.updateOne({ 'id': taskData.id }, { $set: validatedData });
      } else {
        // Si la tarea no existe, crea una nueva
        await taskData.save();
      }
  
      console.log("Tarea guardada con éxito");
      return 1;
    } catch (error) {
      console.error("Error al validar o guardar la tarea:", error);
      return 0;
    }
  }
  

async function fetchAndFormatTasks() {
  try {
    // Obtener todas las tareas de la base de datos
    const tasks = await Task.find({});

    // Filtrar tareas con estado 'Pendiente' o 'Corriendo'
    const activeTasks = tasks.filter(
      (task) => task.status === "Pendiente" || task.status === "Corriendo"
    );

    // console.log("** Tareas Activas: \n",activeTasks)

    // Comprobar si hay tareas disponibles
    if (activeTasks.length === 0) {
      // console.log("No hay tareas disponibles para mostrar.");
      return;
    }

    const [dateId, timeId, dayName] = await FulldateTimeDate();

    const current_full_time = dateId + " " + timeId + " " + dayName;

    // Filtrar tareas cuyo full_times coincida con la hora actual
    const relevantTasks = activeTasks.filter(
      (task) =>
        task.notifications_info.notifications.some((notification) =>
          notification.date_hour.includes(current_full_time)
        ) ||
        task.event_filling_info.filling_notifications.some((fillingNotification) =>
          fillingNotification.date_hour.includes(current_full_time)
        )
    );
    
    // console.log("** Tareas Relevantes: \n",relevantTasks)
    // Imprimir la tabla
    return relevantTasks;
  } catch (error) {
    console.error("Error al obtener o formatear las tareas:", error);
    return [];
  }
}

async function getLastTaskId(){
  let lastTaskId = "";
  try {
    // Obtener todas las tareas de la base de datos
    const tasks = await Task.find({});
    
    // Comprobar si hay tareas disponibles
    if (tasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return '0';
    }

    // Obtener el último id de la última tarea
    lastTaskId = tasks[tasks.length - 1].id;
  } catch (error) {
    console.error("Error al obtener el último id de la tarea:", error);
  }
  return lastTaskId;
}

async function removeTaskById(jsonString){

  try {
    // Intenta convertir y validar el JSON
    const validatedData = JSON.parse(jsonString);

    // Crea un nuevo objeto de tarea con los datos validados
    const taskData = new Task(validatedData);

    // Obtener todas las tareas de la base de datos
    const tasks = await Task.find({});
    
    // Comprobar si hay tareas disponibles
    if (tasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return 0;
    }

    // Remover la tarea con el TaskIf
    const deletedTask = await Task.findOneAndDelete({ 'info_general.id': taskData.id });
    if (deletedTask) {
      console.log('La tarea fue eliminada con éxito', deletedTask);
      return 1;
    }
    else {
      console.log('No se encontró la tarea para eliminar');
      return 0;
    }
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    return 0;
  }
}

async function getAllTasks(){
  try {
    // Obtener todas las tareas de la base de datos
    const all_tasks = await Task.find({});
    // Filtrar tareas con estado 'Pendiente' o 'Corriendo'
    const tasks = all_tasks.filter(
      (task) => task.status === "Pendiente" || task.status === "Corriendo"
    );
    // Comprobar si hay tareas disponibles
    if (tasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return "No hay tareas disponibles para mostrar.";
    }
    console.log(tasks);
    return tasks;
  } catch (error) {
    console.error("Error al consultar las tarea:", error);
    return "Hubo un error al consultar las tareas";
  }
}

async function getTaskFromUser(userForGetTask) {
  try {
    // Obtener todas las tareas de la base de datos
    const all_tasks = await Task.find({});
    // Filtrar tareas con estado 'Pendiente' o 'Corriendo'
    const tasks = all_tasks.filter(
      (task) => task.status === "Pendiente" || task.status === "Corriendo"
    );
    // Comprobar si hay tareas disponibles
    if (tasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return "No hay tareas disponibles para mostrar.";
    }
    // Filtrar tareas con estado 'Pendiente' o 'Corriendo'
    const userTasks = tasks.filter((task) => task.responsable_names.includes(userForGetTask));
    // Comprobar si hay tareas disponibles
    if (userTasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return "No hay tareas disponibles para mostrar.";
    }

    // console.log(userTasks);
    return userTasks;
  } catch (error) {
    console.error("Error al consultar las tarea:", error);
    return "Hubo un error al consultar las tareas";
  }
}

// Exporta todas tus funciones
module.exports = {
  convertAndSaveTask,
  fetchAndFormatTasks,
  getLastTaskId,
  removeTaskById,
  getAllTasks,
  getTaskFromUser
};
