const express = require("express");

const app = express();

require("dotenv").config();

app.use(express.json());

const connectDB = require("./connectMongo");

connectDB();

const UserModel = require("./models/user.model");
const redis = require('./redis')

const deleteKeys = async (pattern) => {
  const keys = await redis.keys(`${pattern}::*`)
  console.log(keys)
  if (keys.length > 0) {
    redis.del(keys)
  }
}
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); // Allow requests from localhost
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.get("/api/userData", async (req, res) => {
  const { limit = 5, orderBy = "name", sortBy = "asc", keyword } = req.query;
  let page = +req.query?.page;

  if (!page || page <= 0) page = 1;

  const skip = (page - 1) * + limit;

  const query = {};

  if (keyword) query.name = { $regex: keyword, $options: "i" };

  const key = `User::${JSON.stringify({query, page, limit, orderBy, sortBy})}`
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

app.get("/api/userData/:id", async (req, res) => {
  try {
    const data = await UserModel.findById(req.params.id);

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

app.post("/api/userData", async (req, res) => {
  try {
    const { imageData, country } = req.body;
    const user = new UserModel({
      imageData, 
      country
    });
    const data = await user.save();
    deleteKeys('User')
    return res.status(200).json({
      msg: "Ok",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
  }
});

app.put("/api/userData/:id", async (req, res) => {
  try {
    const { imageData, country } = req.body;
    const { id } = req.params;

    const data = await UserModel.findByIdAndUpdate(
      id,
      {
        imageData, 
        country
      },
      { new: true }
    );
    deleteKeys('User')
    return res.status(200).json({
      msg: "Ok",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
  }
});

app.delete("/api/userData/:id", async (req, res) => {
  try {
    await UserModel.findByIdAndDelete(req.params.id);
    deleteKeys('User')
    return res.status(200).json({
      msg: "Ok",
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
    });
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
