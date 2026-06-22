let ioInstance;

const initSocket = (io) => {
  ioInstance = io;
};

const getIo = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};

const broadcastToRoom = (roomId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(roomId).emit(event, payload);
  }
};

const broadcastToAllClinicRooms = (clinicId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`clinic_${clinicId}`).emit(event, payload);
  }
};

module.exports = {
  initSocket,
  getIo,
  broadcastToRoom,
  broadcastToAllClinicRooms
};
