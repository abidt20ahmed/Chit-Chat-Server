const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors()); 

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'], 
  },
});

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.surgvec.mongodb.net/<database-name>?retryWrites=true&w=majority`;

// Created a MongoClient with options to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

io.on('connection', async (socket) => {
  console.log('User connected');

  try {
    const messages = await client
      .db('ChitChat')
      .collection('messages')
      .find()
      .sort({ _id: 1 })
      .toArray();

    console.log('Messages:', messages);

    socket.emit('load messages', messages);
  } catch (error) {
    console.error('Failed to retrieve messages:', error);
  }

  socket.on('message', async (message) => {
    console.log('Received message:', message);

    try {
      const result = await client
        .db('ChitChat')
        .collection('messages')
        .insertOne(message);

      console.log('Message saved successfully:', result);

      const insertedMessage = {
        _id: result.insertedId.toString(),
        text: message.text,
        picture: message.picture,
        user: message.user,
        link: message.link,
        style: message.style,
        email: message.email,
      };

      io.emit('message', insertedMessage); // Emitted the message to all connected clients

    } catch (error) {
      console.error('Failed to save message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const port = process.env.PORT || 3001;
server.listen(port, async () => {
  try {
    // Connect the client to the MongoDB server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
});