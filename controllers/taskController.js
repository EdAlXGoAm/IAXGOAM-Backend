const Task = require("./../models/taskModel"); // Asegúrate de que la ruta sea correcta
const { FulldateTimeDate } = require("./../services/getdate");
const Joi = require("joi");

function validateId(jsonString) {
  // Define el esquema de validación con Joi
  const schema = Joi.object({
    id: Joi.string().required(),
  }).unknown(true);

  try {
    // Intenta convertir y validar el JSON
    const validatedData = schema.validate(JSON.parse(jsonString), { abortEarly: false });
    console.log("validatedData: ", validatedData);
    
    if (validatedData.error) {
      throw validatedData.error;
    }

    // Devuelve solo el id validado
    return validatedData.value.id;
  } catch (error) {
    console.error("Error al validar el id:", error);
    return "";
  }
}

function validateTitle(jsonString) {
  // Define el esquema de validación con Joi
  const schema = Joi.object({
    title: Joi.string().required(),
  }).unknown(true);

  try {
    // Intenta convertir y validar el JSON
    const validatedData = schema.validateAsync(JSON.parse(jsonString));

    return validatedData.title;
  } catch (error) {
    console.error("Error al validar el título:", error);
    return "";
  }
}

async function convertAndSaveTask(jsonString) {
    // Define el esquema de validación con Joi
    const schema = Joi.object({
      _id: Joi.string(), // Agregar el campo _id en la validación
      id: Joi.string().required(),
      timestamp_creation: Joi.string(),
      title: Joi.string().required(),
      details: Joi.string(),
      responsable_names: Joi.array().items(Joi.string()),
      responsable_phones: Joi.array().items(Joi.string()),
      time: Joi.string(),
      place: Joi.string(),
      situation: Joi.string(),
      type: Joi.string().valid('Alarma', 'Recordatorio', 'Pendientes', 'Eventos').required(),
      status: Joi.string().valid('Pending', 'Running', 'Completed', 'Completed', 'Past').required(),
      notifications_info: Joi.object({
        notifications: Joi.array().items(
          Joi.object({
            _id: Joi.string(), // Agregar el campo _id en la validación
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
        filling_status: Joi.string().valid('Completed', 'To update', 'To review').required(),
        filling_details: Joi.string(),
        filling_notifications: Joi.array().items(
          Joi.object({
            _id: Joi.string(), // Agregar el campo _id en la validación
            date_hour: Joi.string(),
            details: Joi.string(),
          }),
        ),
      }),
      __v: Joi.number()
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
      (task) => task.status === "Pending" || task.status === "Running"
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

async function removeTaskById(id){

  try {
    // Remover la tarea con el TaskIf
    const deletedTask = await Task.findOneAndDelete({ 'id': id });
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
      (task) => task.status === "Pending" || task.status === "Running"
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
      (task) => task.status === "Pending" || task.status === "Running"
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

async function getTaskById(id) {
  let taskById = "";
  try {
    // Obtener la tarea con el TaskId
    const task = await Task.findOne({ 'id': id });
    console.log("task: ", task);
    taskById += "id: " + task.id + "\n";
    taskById += "title: " + task.title + "\n";
    taskById += "details: " + task.details + "\n";
    taskById += "responsable_names: " + task.responsable_names + "\n";
    taskById += "responsable_phones: " + task.responsable_phones + "\n";
    taskById += "time: " + task.time + "\n";
    taskById += "place: " + task.place + "\n";
    taskById += "situation: " + task.situation + "\n";
    taskById += "type: " + task.type + "\n";
    taskById += "status: " + task.status + "\n";
    taskById += "notifications: " + "\n";
    task.notifications_info.notifications.forEach(notification => {
      taskById += "date_hour: " + notification.date_hour + "\n";
      taskById += "details: " + notification.details + "\n";
    });
    taskById += "limit_date_hour_start: " + task.pending_info.limit_date_hour_start + "\n";
    taskById += "limit_date_hour_end: " + task.pending_info.limit_date_hour_end + "\n";
    taskById += "date_hour_start: " + task.pending_and_events_info.date_hour_start + "\n";
    taskById += "date_hour_end: " + task.pending_and_events_info.date_hour_end + "\n";
    taskById += "filling_status: " + task.event_filling_info.filling_status + "\n";
    taskById += "filling_details: " + task.event_filling_info.filling_details + "\n";
    taskById += "filling_notifications: " + "\n";
    task.event_filling_info.filling_notifications.forEach(fillingNotification => {
      taskById += "date_hour: " + fillingNotification.date_hour + "\n";
      taskById += "details: " + fillingNotification.details
    }
    );
    return taskById;
  } catch (error) {
    console.error("Error al obtener el último id de la tarea:", error);
    return taskById;
  }
}

async function getTaskByTitle(title) {
  let taskByTitle = "";
  try {
    // Obtener la tarea con el TaskTitle
    const task = await Task.findOne({ 'title': title });
    taskByTitle += "id: " + task.id + "\n";
    taskByTitle += "title: " + task.title + "\n";
    taskByTitle += "details: " + task.details + "\n";
    taskByTitle += "responsable_names: " + task.responsable_names + "\n";
    taskByTitle += "responsable_phones: " + task.responsable_phones + "\n";
    taskByTitle += "time: " + task.time + "\n";
    taskByTitle += "place: " + task.place + "\n";
    taskByTitle += "situation: " + task.situation + "\n";
    taskByTitle += "type: " + task.type + "\n";
    taskByTitle += "status: " + task.status + "\n";
    taskByTitle += "notifications: " + "\n";
    task.notifications_info.notifications.forEach(notification => {
      taskByTitle += "date_hour: " + notification.date_hour + "\n";
      taskByTitle += "details: " + notification.details + "\n";
    });
    taskByTitle += "limit_date_hour_start: " + task.pending_info.limit_date_hour_start + "\n";
    taskByTitle += "limit_date_hour_end: " + task.pending_info.limit_date_hour_end + "\n";
    taskByTitle += "date_hour_start: " + task.pending_and_events_info.date_hour_start + "\n";
    taskByTitle += "date_hour_end: " + task.pending_and_events_info.date_hour_end + "\n";
    taskByTitle += "filling_status: " + task.event_filling_info.filling_status + "\n";
    taskByTitle += "filling_details: " + task.event_filling_info.filling_details + "\n";
    taskByTitle += "filling_notifications: " + "\n";
    task.event_filling_info.filling_notifications.forEach(fillingNotification => {
      taskByTitle += "date_hour: " + fillingNotification.date_hour + "\n";
      taskByTitle += "details: " + fillingNotification.details
    }
    );
    return taskByTitle;
  }
  catch (error) {
    console.error("Error al obtener el último id de la tarea:", error);
    return taskByTitle;
  }
}

async function getAllTasksString(){
  try {
    // Obtener todas las tareas de la base de datos
    const all_tasks = await Task.find({});
    // Filtrar tareas con estado 'Pendiente' o 'Corriendo'
    const tasks = all_tasks.filter(
      (task) => task.status === "Pending" || task.status === "Running"
    );
    // Comprobar si hay tareas disponibles
    if (tasks.length === 0) {
      console.log("No hay tareas disponibles para mostrar.");
      return "No hay tareas disponibles para mostrar.";
    }
    console.log(tasks);
    stringTasks = "";
    tasks.forEach(task => {
      stringTasks += "id: " + task.id + "\n";
      stringTasks += "title: " + task.title + "\n";
      stringTasks += "details: " + task.details + "\n";
      stringTasks += "responsable_names: " + task.responsable_names + "\n";
      stringTasks += "responsable_phones: " + task.responsable_phones + "\n";
      stringTasks += "time: " + task.time + "\n";
      stringTasks += "place: " + task.place + "\n";
      stringTasks += "situation: " + task.situation + "\n";
      stringTasks += "type: " + task.type + "\n";
      stringTasks += "status: " + task.status + "\n";
      stringTasks += "notifications: " + "\n";
      task.notifications_info.notifications.forEach(notification => {
        stringTasks += "date_hour: " + notification.date_hour + "\n";
        stringTasks += "details: " + notification.details + "\n";
      });
      stringTasks += "limit_date_hour_start: " + task.pending_info.limit_date_hour_start + "\n";
      stringTasks += "limit_date_hour_end: " + task.pending_info.limit_date_hour_end + "\n";
      stringTasks += "date_hour_start: " + task.pending_and_events_info.date_hour_start + "\n";
      stringTasks += "date_hour_end: " + task.pending_and_events_info.date_hour_end + "\n";
      stringTasks += "filling_status: " + task.event_filling_info.filling_status + "\n";
      stringTasks += "filling_details: " + task.event_filling_info.filling_details + "\n";
      stringTasks += "filling_notifications: " + "\n";
      task.event_filling_info.filling_notifications.forEach(fillingNotification => {
        stringTasks += "date_hour: " + fillingNotification.date_hour + "\n";
        stringTasks += "details: " + fillingNotification.details
      }
      );
    }
    );
    return stringTasks;
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
  getTaskFromUser,
  getTaskById,
  getTaskByTitle,
  validateId,
  validateTitle,
  getAllTasksString
};
