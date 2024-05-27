const Users = require("../models/userModel");

async function getUser(userId) {
    let userName = "";
    let phoneNumber = "";
    let aliasList = "";
    try {
        // Obtener todas las tareas de la base de datos
        const usersList = await Users.find();
        
        // Comprobar si hay tareas disponibles
        if (usersList.length === 0) {
            console.log("No hay usuarios disponibles para mostrar.");
            return ["", "", ""]
        }

        const user = await Users.findOne({ phoneNumber: userId });
        userName = user.userName;
        phoneNumber = user.phoneNumber;
        aliasList = user.aliasList;
    } catch (error) {
        console.error("Error al obtener el usuario:", error);
    }
    return [userName, phoneNumber, aliasList];
}

// Exporta todas tus funciones
module.exports = {
    getUser
  };
  