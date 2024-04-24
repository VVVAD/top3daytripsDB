const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
  userId:String,
  imageData: { type: String, required: true }
}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)


