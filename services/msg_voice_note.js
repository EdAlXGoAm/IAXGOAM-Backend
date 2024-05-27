const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const { convertOggMp3 } = require('./convert_ogg_mp3');
const { voiceToText } = require('./whisper');

const getTextMsgVoiceNote = async (ctx) => {
  const buffer = await downloadMediaMessage(ctx, "buffer");
  const pathTmpOgg = `${process.cwd()}/tmp/voice-note-${Date.now()}.ogg`;
  const pathTmpMp3 = `${process.cwd()}/tmp/voice-note-${Date.now()}.mp3`;
  await writeFile(pathTmpOgg, buffer);
  await convertOggMp3(pathTmpOgg, pathTmpMp3);
  const text = await voiceToText(pathTmpMp3);
  return text;
};

module.exports = { getTextMsgVoiceNote };
