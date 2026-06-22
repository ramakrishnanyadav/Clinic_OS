const Patient = require('../models/Patient');
const { broadcastToAllClinicRooms } = require('./socketBroadcast');

const checkLeaveModeAlerts = async (queue) => {
  const currentToken = queue.currentToken;
  
  const patientsToNotify = await Patient.find({
    queueId: queue._id,
    leaveMode: true,
    notificationSent: false,
    notifyAt: currentToken
  });

  for (const patient of patientsToNotify) {
    // In a real app, integrate Twilio here. For demo, we just simulate the send.
    console.log(`Sending WhatsApp alert to ${patient.notifyPhone} for token ${patient.tokenDisplay}`);
    
    patient.notificationSent = true;
    patient.status = 'notified';
    await patient.save();

    broadcastToAllClinicRooms(queue.clinicId, 'patient:notify_sent', {
      token: patient.tokenDisplay,
      phone: patient.notifyPhone,
      sentAt: new Date()
    });
  }
};

module.exports = { checkLeaveModeAlerts };
