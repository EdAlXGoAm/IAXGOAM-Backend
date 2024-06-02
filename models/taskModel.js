const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type : String, required: true },
  title: { type: String, required: true },
  timestamp_creation: { type: Date, default: Date.now },
  details: { type: String},
  responsable_names: [{ type: String }],
  responsable_phones: [{ type: String }],
  place: { type: String },
  situation: { type: String },
  type: { type: String, enum: ['Alarma', 'Recordatorio', 'Pendientes','Eventos'], required: true },
  status: { type: String, enum: ['Pendiente', 'Corriendo', 'Completada','Cancelada'], required: true },
  notifications_info: {
    notifications: [{
      date_hour: { type: String },
      details: { type: String }
    }]
  },
  pending_info: {
    limit_date_hour_start: { type: String },
    limit_date_hour_end: { type: String },
  },
  pending_and_events_info: {
    date_hour_start: { type: String },
    date_hour_end: { type: String }
  },
  event_filling_info: {
    filling_status: { type: String, enum: ['Completo', 'Datos Faltantes', 'Se debe actualizar o Comprobar constantemente','Tiene tiempo que no se revisa la tarea y no esta en estado completada'], required: true },
    filling_details: { type: String },
    filling_notifications: [{
      date_hour: { type: String },
      details: { type: String }
    }]
  }
});

const Task = mongoose.model('Tasks', taskSchema);

module.exports = Task;
