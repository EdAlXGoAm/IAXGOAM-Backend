const FulldateTimeDate = async () => {
    const now = new Date();

    // Configuración para la zona horaria de la Ciudad de México YYYY/MM/DD HH:mm
    // Year with 4 digits
    const options = {
      timeZone: 'America/Mexico_City',
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hour12: false
    };

    // Obtener la fecha y hora localizada YYYY/MM/DD HH:mm
    const dateTimeMexico = now.toLocaleString('es-MX', options);
    const [dayName, date, time] = dateTimeMexico.split(', ');

    // Formatear la fecha y la hora YYYY/MM/DD HH:mm
    let dateId = date.split('/').reverse().join('/');
    dateId = '20' + dateId;
    const timeId = time;

    return [dateId, timeId, dayName];
};

module.exports = { FulldateTimeDate };