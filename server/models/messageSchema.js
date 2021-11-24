const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatID: {
    type: String,
    required: true,
  },
  messages: {
    type: Array,
    required: true,
  },
});

module.exports = mongoose.model("chatRooms", messageSchema);
