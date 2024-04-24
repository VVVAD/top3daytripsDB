const express = require("express");

const app = express();

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
const UserModel = require("./models/user.model");
const redis = require('./redis')

const deleteKeys = async (pattern) => {
  const keys = await redis.keys(`${pattern}::*`)
  console.log(keys)
  if (keys.length > 0) {
    redis.del(keys)
  }
}
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

app.get("/api/userData", async (req, res) => {
  const { limit = 5, orderBy = "name", sortBy = "asc", keyword } = req.query;
  let page = +req.query?.page;

  if (!page || page <= 0) page = 1;

  const skip = (page - 1) * + limit;

  const query = {};

  if (keyword) query.name = { $regex: keyword, $options: "i" };

  const key = `User::${JSON.stringify({ query, page, limit, orderBy, sortBy })}`
  let response = null
  try {
    const cache = await redis.get(key)
    if (cache) {
      response = JSON.parse(cache)
    } else {
      const data = await UserModel.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ [orderBy]: sortBy });
      const totalItems = await UserModel.countDocuments(query);

      response = {
        msg: "Ok",
        data,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        limit: +limit,
        currentPage: page,
      }

      redis.setex(key, 600, JSON.stringify(response))
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
  }
});

app.get("/api/userData/:userId", async (req, res) => {
  try {
    const data = await UserModel.findById(req.params.userId);

    if (data) {
      return res.status(200).json({
        msg: "Ok",
        data,
      });
    }

    return res.status(404).json({
      msg: "Not Found",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
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
