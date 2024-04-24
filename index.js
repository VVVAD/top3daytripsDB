const express = require("express");
const mongoose = require('mongoose');
const app = express();
mongoose.connect(process.env.MONGODB_CONNECT_URI, { useNewUrlParser: true, useUnifiedTopology: true });
require("dotenv").config();

app.use(express.json());

const connectDB = require("./connectMongo");

connectDB();

const cors = require("cors");
const corsOptions = {
  origin: '*',
  credentials: true,            //access-control-allow-credentials:true
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions)) // Use this after the variable declaration
const redis = require('./redis')

const deleteKeys = async (pattern) => {
  const keys = await redis.keys(`${pattern}::*`)
  console.log(keys)
  if (keys.length > 0) {
    redis.del(keys)
  }
}
const imageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  imgURL: { type: String, required: true },
});
const Image = mongoose.model('Image', imageSchema);

// Route to store image data in the database
app.post('/api/userdata', async (req, res) => {
  try {
    const { userId, imgURL } = req.body;
    const image = new Image({ userId, imgURL });
    await image.save();
    res.status(201).send('Image data stored successfully');
  } catch (error) {
    console.error('Error storing image data:', error);
    res.status(500).send('Internal server error');
  }
});



// Route to retrieve the image data
app.get('/api/userdata/:userId', async (req, res) => {
  try {
    // Retrieve the image data from MongoDB based on the provided ID
    const { userId } = req.params;
    const imageData = await Image.findOne({ userId: userId });

    if (!imageData) {
      return res.status(404).send('Image not found');
    }

    // Send the image data back to the client
    res.send(imageData);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).send('Internal server error');
  }
});



// Route to update the image data
app.put('/api/userdata/:userId', async (req, res) => {
  try {
    // Retrieve the image data from the request body
    const { userId } = req.params;
    const { imageData } = req.body;

    // Find the image document by ID and update its imageData field
    const updatedImage = await Image.findByIdAndUpdate(userId, { imageData }, { new: true });

    if (!updatedImage) {
      return res.status(404).send('Image not found');
    }

    // Send the updated image data back to the client
    res.send(updatedImage);
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).send('Internal server error');
  }
});

// Route to delete image data from the database
app.delete('/api/userdata/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await Image.deleteOne({ userId });
    res.status(200).send('Image data removed successfully');
  } catch (error) {
    console.error('Error removing image data:', error);
    res.status(500).send('Internal server error');
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
