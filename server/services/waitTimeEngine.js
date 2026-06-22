const Patient = require('../models/Patient');
const ConsultationStat = require('../models/ConsultationStat');

const calculateWaitTime = async (queue) => {
  const stat = await ConsultationStat.findOne({
    clinicId: queue.clinicId,
    doctorId: queue.doctorId,
    date: queue.date
  });

  const rollingAvg = stat ? stat.rollingAvg : 15;
  const sampleCount = stat ? stat.sampleCount : 0;
  
  const now = new Date();
  const timeElapsed = queue.lastCalledAt ? (now - queue.lastCalledAt) / 60000 : 0; // in minutes
  const remainingCurrent = Math.max(0, rollingAvg - timeElapsed);

  let doctorRunningLate = false;
  let delayRatio = 1;

  if (queue.currentConsultStartedAt) {
    const elapsedSinceStart = (now - queue.currentConsultStartedAt) / 60000;
    delayRatio = elapsedSinceStart / rollingAvg;
    if (delayRatio > 1.4) {
      doctorRunningLate = true;
    }
  }

  const adjustedAvg = rollingAvg * Math.min(delayRatio, 1.6);
  
  // Calculate wait time for all waiting patients
  const waitingPatients = await Patient.find({
    queueId: queue._id,
    status: { $in: ["waiting", "notified"] }
  }).sort({ priority: -1, token: 1 }); // Emergencies first, then by token

  let emergencyAheadCount = 0;
  
  const updates = waitingPatients.map((patient, index) => {
    if (patient.priority === 'emergency') {
      emergencyAheadCount++;
    }
    
    // Position calculation
    let tokensAhead = index;
    const emergencyPremium = emergencyAheadCount * adjustedAvg * 1.2;
    
    let estimatedWait = remainingCurrent + (tokensAhead * adjustedAvg) + emergencyPremium;
    
    return {
      patientId: patient._id,
      estimatedWait: Math.round(estimatedWait),
      sampleCount,
      doctorRunningLate
    };
  });

  return updates;
};

module.exports = { calculateWaitTime };
