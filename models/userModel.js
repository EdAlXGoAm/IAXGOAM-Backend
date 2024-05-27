const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  phoneNumber: { type : String, required: true },
  userName: { type: String, required: true },
  aliasList: [{ type: String }],
});

const Users = mongoose.model('Users', usersSchema);

module.exports = Users;
