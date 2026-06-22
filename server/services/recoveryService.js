const RecoverySnapshot = require('../models/RecoverySnapshot');
const Queue = require('../models/Queue');
const Patient = require('../models/Patient');
const { getIo } = require('./socketBroadcast');

const saveSnapshot = async (queueId, session = null) => {
  const queryOptions = session ? { session } : {};
  const queue = await Queue.findById(queueId, null, queryOptions);
  if (!queue) return;

  const waitingPatients = await Patient.find({ queueId, status: { $in: ["waiting", "notified", "in-consultation"] } }, null, queryOptions)
                                       .sort({ priority: -1, token: 1 });
  
  const snapshot = {
    queue,
    waitingPatients
  };

  await RecoverySnapshot.findOneAndUpdate(
    { queueId },
    { snapshot, savedAt: new Date() },
    { upsert: true, new: true, ...queryOptions }
  );
};

const restoreStateOnStartup = async () => {
  const openQueues = await Queue.find({ status: { $in: ["open", "paused"] } });
  const io = getIo();

  for (const queue of openQueues) {
    const recovery = await RecoverySnapshot.findOne({ queueId: queue._id }).sort({ savedAt: -1 });
    if (recovery && io) {
      // Emit state update to all connected clients for this queue
      io.to(`clinic_${queue.clinicId}_doctor_${queue.doctorId}`).emit('queue:state_update', recovery.snapshot);
    }
  }
};

module.exports = { saveSnapshot, restoreStateOnStartup };
