const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
  imageData: String,
  country: String
}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema)


