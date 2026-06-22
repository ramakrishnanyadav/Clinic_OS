const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const Doctor = require('../models/Doctor');
const { checkDuplicateOrReturning } = require('../services/returningPatient');
const { broadcastToRoom } = require('../services/socketBroadcast');
const { calculateWaitTime } = require('../services/waitTimeEngine');
const { saveSnapshot } = require('../services/recoveryService');
const ConsultationStat = require('../models/ConsultationStat');

exports.registerPatient = async (req, res) => {
  const session = await Patient.startSession();
  session.startTransaction();
  
  try {
    const { clinicId, queueId, phone, name, force } = req.body;
    
    if (!force) {
      const check = await checkDuplicateOrReturning(phone, clinicId, queueId);
      if (check.isDuplicate) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          duplicate: true,
          ...check
        });
      }
    }

    // Atomically increment token to prevent race conditions on concurrent registrations
    const queue = await Queue.findByIdAndUpdate(
      queueId,
      { $inc: { lastTokenIssued: 1 } },
      { new: true, session }
    );
    const nextToken = queue.lastTokenIssued;
    
    const doctor = await Doctor.findById(queue.doctorId).session(session);
    const tokenDisplay = `${doctor.tokenPrefix}-${nextToken}`;

    const newPatient = new Patient({
      clinicId,
      queueId,
      phone,
      name,
      token: nextToken,
      tokenDisplay,
      status: "waiting",
      visitCount: req.body.isReturning ? (req.body.visitCount + 1) : 1
    });

    await newPatient.save({ session });
    await saveSnapshot(queueId, session);
    
    await session.commitTransaction();
    session.endSession();
    
    const waitUpdates = await calculateWaitTime(queue);
    const waitInfo = waitUpdates.find(w => w.patientId.toString() === newPatient._id.toString());

    broadcastToRoom(`clinic_${clinicId}_doctor_${queue.doctorId}`, 'patient:added', {
      token: tokenDisplay,
      name,
      waitInfo
    });

    res.status(201).json({ patient: newPatient, waitInfo });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};

exports.lookupPatient = async (req, res) => {
  try {
    const { phone, clinicId } = req.query;
    const history = await Patient.findOne({ phone, clinicId }).sort({ registeredAt: -1 });
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setLeaveMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, notifyAtToken } = req.body;
    
    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.leaveMode = true;
    patient.notifyPhone = phone;
    patient.notifyAt = notifyAtToken;
    await patient.save();
    
    await saveSnapshot(patient.queueId);

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markDone = async (req, res) => {
  try {
    const { id } = req.params;
    
    const patient = await Patient.findById(id);
    if (!patient || patient.status !== 'in-consultation') {
      return res.status(400).json({ message: "Patient not in consultation" });
    }

    patient.status = "done";
    patient.doneAt = new Date();
    
    const queue = await Queue.findById(patient.queueId);
    
    patient.actualDuration = queue.currentConsultStartedAt ? 
      ((patient.doneAt - queue.currentConsultStartedAt) / 60000) : 15;
      
    await patient.save();
    
    let stat = await ConsultationStat.findOne({ clinicId: queue.clinicId, doctorId: queue.doctorId, date: queue.date });
    if (!stat) {
      stat = new ConsultationStat({ clinicId: queue.clinicId, doctorId: queue.doctorId, date: queue.date });
    }
    
    const oldTotal = stat.rollingAvg * stat.sampleCount;
    stat.sampleCount += 1;
    stat.rollingAvg = (oldTotal + patient.actualDuration) / stat.sampleCount;
    await stat.save();

    const waitUpdates = await calculateWaitTime(queue);
    
    // Broadcast wait updates
    const { broadcastToRoom } = require('../services/socketBroadcast');
    broadcastToRoom(`clinic_${queue.clinicId}_doctor_${queue.doctorId}`, 'queue:next_called', {
      current: queue.currentToken ? `${patient.tokenDisplay.split('-')[0]}-${queue.currentToken}` : null,
      waitUpdates
    });

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
