const Patient = require('../models/Patient');

const checkDuplicateOrReturning = async (phone, clinicId, queueId) => {
  // Check duplicate in today's queue
  const existingToday = await Patient.findOne({
    phone,
    queueId,
    status: { $ne: "skipped" }
  });

  if (existingToday) {
    return {
      isDuplicate: true,
      existingToken: existingToday.tokenDisplay,
      patientName: existingToday.name,
      registeredAt: existingToday.registeredAt
    };
  }

  // Check returning history
  const history = await Patient.findOne({ phone, clinicId }).sort({ registeredAt: -1 });
  if (history) {
    return {
      isDuplicate: false,
      isReturning: true,
      patientName: history.name,
      lastVisitDate: history.registeredAt,
      visitCount: history.visitCount
    };
  }

  return { isDuplicate: false, isReturning: false };
};

module.exports = { checkDuplicateOrReturning };
