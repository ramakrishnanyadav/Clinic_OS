const Queue = require('../models/Queue');
const ConsultationStat = require('../models/ConsultationStat');
const { broadcastToRoom } = require('./socketBroadcast');

const checkDelays = async () => {
  const openQueues = await Queue.find({ status: "open", currentConsultStartedAt: { $exists: true } });
  const now = new Date();

  for (const queue of openQueues) {
    const stat = await ConsultationStat.findOne({ clinicId: queue.clinicId, doctorId: queue.doctorId, date: queue.date });
    const rollingAvg = stat ? stat.rollingAvg : 15;

    const timeElapsed = (now - queue.currentConsultStartedAt) / 60000; // in minutes
    const delayRatio = timeElapsed / rollingAvg;

    if (delayRatio > 1.4 && !queue.delayFlagged) {
      queue.delayFlagged = true;
      await queue.save();

      const adjustedAvg = rollingAvg * Math.min(delayRatio, 1.6);
      const delayMinutes = Math.round(timeElapsed - rollingAvg);

      broadcastToRoom(`clinic_${queue.clinicId}_doctor_${queue.doctorId}`, 'doctor:running_behind', {
        delayMinutes,
        adjustedAvg: Math.round(adjustedAvg)
      });
    }
  }
};

const startDelayDetector = () => {
  setInterval(checkDelays, 30000); // Check every 30 seconds
};

module.exports = { startDelayDetector, checkDelays };
