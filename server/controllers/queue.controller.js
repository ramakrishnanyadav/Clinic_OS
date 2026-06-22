const Queue = require('../models/Queue');
const Patient = require('../models/Patient');
const ConsultationStat = require('../models/ConsultationStat');
const { broadcastToRoom, broadcastToAllClinicRooms } = require('../services/socketBroadcast');
const { calculateWaitTime } = require('../services/waitTimeEngine');
const { saveSnapshot } = require('../services/recoveryService');
const { checkLeaveModeAlerts } = require('../services/leaveNotifier');

exports.initQueue = async (req, res) => {
  try {
    const { clinicId, doctorId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let queue = await Queue.findOne({ clinicId, doctorId, date: today });
    if (!queue) {
      queue = new Queue({ clinicId, doctorId, date: today });
      await queue.save();
    }

    res.status(200).json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTodayQueue = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { clinicId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queue = await Queue.findOne({ clinicId, doctorId, date: today });
    if (!queue) return res.status(404).json({ message: "Queue not found" });

    const waitingPatients = await Patient.find({ queueId: queue._id, status: { $in: ["waiting", "notified", "in-consultation"] } })
                                       .sort({ priority: -1, token: 1 });

    const waitUpdates = await calculateWaitTime(queue);
    
    // Merge wait time info
    const enrichedPatients = waitingPatients.map(p => {
      const waitInfo = waitUpdates.find(w => w.patientId.toString() === p._id.toString());
      return { ...p.toObject(), waitInfo };
    });

    res.status(200).json({ queue, patients: enrichedPatients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.callNext = async (req, res) => {
  try {
    const { queueId } = req.body;
    const queue = await Queue.findById(queueId);
    if (!queue) return res.status(404).json({ message: "Queue not found" });

    // Find current consulting and mark as done if exists (simplified for demo)
    const currentPatient = await Patient.findOne({ queueId, status: "in-consultation" });
    const now = new Date();

    if (currentPatient) {
      currentPatient.status = "done";
      currentPatient.doneAt = now;
      currentPatient.actualDuration = (now - queue.currentConsultStartedAt) / 60000;
      await currentPatient.save();
      
      // Update rolling average
      let stat = await ConsultationStat.findOne({ clinicId: queue.clinicId, doctorId: queue.doctorId, date: queue.date });
      if (!stat) {
        stat = new ConsultationStat({ clinicId: queue.clinicId, doctorId: queue.doctorId, date: queue.date });
      }
      
      const oldTotal = stat.rollingAvg * stat.sampleCount;
      stat.sampleCount += 1;
      stat.rollingAvg = (oldTotal + currentPatient.actualDuration) / stat.sampleCount;
      await stat.save();
    }

    // Find next patient
    const nextPatient = await Patient.findOne({ queueId, status: { $in: ["waiting", "notified"] } }).sort({ priority: -1, token: 1 });
    
    if (nextPatient) {
      nextPatient.status = "in-consultation";
      nextPatient.calledAt = now;
      await nextPatient.save();
      
      queue.currentToken = nextPatient.token;
      queue.lastCalledAt = now;
      queue.currentConsultStartedAt = now;
      queue.delayFlagged = false;
      await queue.save();

      await checkLeaveModeAlerts(queue);
    } else {
      queue.currentToken = null; // queue empty
      queue.lastCalledAt = now;
      queue.currentConsultStartedAt = null;
      queue.delayFlagged = false;
      await queue.save();
    }

    await saveSnapshot(queueId);
    
    const waitUpdates = await calculateWaitTime(queue);
    
    broadcastToRoom(`clinic_${queue.clinicId}_doctor_${queue.doctorId}`, 'queue:next_called', {
      current: nextPatient ? nextPatient.tokenDisplay : null,
      currentPatientId: nextPatient ? nextPatient._id : null,
      waitUpdates
    });

    res.status(200).json({ message: "Next called", current: nextPatient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
