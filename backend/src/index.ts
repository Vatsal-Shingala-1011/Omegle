import { Socket } from "socket.io";
import http from "http";
import { UserManager } from "./managers/UserManager";
const express = require('express');
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

io.on('connection', (socket: Socket) => {
  console.log('a user connected');
  userManager.addUser("randomName", socket);
  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  })
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});