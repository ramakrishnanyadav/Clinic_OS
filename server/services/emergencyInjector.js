const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const { broadcastToRoom } = require('./socketBroadcast');
const { calculateWaitTime } = require('./waitTimeEngine');

const injectEmergency = async (queueId, name) => {
  const queue = await Queue.findById(queueId);
  if (!queue) throw new Error("Queue not found");

  queue.emergencyCount += 1;
  const eTokenDisplay = `E${queue.emergencyCount}`;
  
  const insertedAfterToken = queue.currentToken; // Inserted after current token
  
  const newPatient = new Patient({
    clinicId: queue.clinicId,
    queueId: queue._id,
    name,
    tokenDisplay: eTokenDisplay,
    priority: "emergency",
    insertedAfterToken,
    status: "waiting"
  });

  await newPatient.save();
  await queue.save();

  // Recalculate wait times
  const waitTimeUpdates = await calculateWaitTime(queue);

  broadcastToRoom(`clinic_${queue.clinicId}_doctor_${queue.doctorId}`, 'queue:emergency_insert', {
    eToken: eTokenDisplay,
    insertedAfter: insertedAfterToken,
    waitUpdates: waitTimeUpdates
  });

  return newPatient;
};

module.exports = { injectEmergency };
