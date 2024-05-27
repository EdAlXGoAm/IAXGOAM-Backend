const sys_prompt_main = require("../prompt/sys_prompt_main.js");

const fillSysPrompt = async () => {
    let sys_prompt_returned = sys_prompt_main.SYS_CONTEXT;
    return sys_prompt_returned;
};

const fillMessageHeader = async (textInput, userName, phoneNumber, msgType, currentTime) => {
    let msgBody = textInput;

    msgBody =   "Usuario: " + userName + "\n" +
                "Teléfono: " + phoneNumber + "\n" +
                "Tipo: " + msgType + "\n" +
                "Fecha: " + currentTime + "\n" +
                "Mensaje: " + textInput;

    return msgBody;
};

module.exports = {
    fillSysPrompt,
    fillMessageHeader
    
};