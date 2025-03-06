import { Socket } from "socket.io";
import http from "http";
const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(http);

const io = new Server(server,{
  cors: {
    origin: "*"
  }
}
);

const userManager = new UserManager();

io.on('connection', (socket : Socket) => {
  console.log('a user connected');
  use
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});