import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

let socket;

export const initSocket = (clinicId, doctorId, role) => {
  socket = io('http://localhost:3000');
  
  socket.on('connect', () => {
    console.log('Connected to real-time server');
    socket.emit('client:join_queue', { clinicId, doctorId, role });
  });

  return socket;
};

export const getSocket = () => socket;
