const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const Clinic = require('../models/Clinic');

exports.getTodayStats = async (req, res) => {
  try {
    const { clinicId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queues = await Queue.find({ clinicId, date: today });
    const queueIds = queues.map(q => q._id);

    const patients = await Patient.find({ queueId: { $in: queueIds } });
    
    const servedCount = patients.filter(p => p.status === 'done').length;
    const abandonedCount = patients.filter(p => p.status === 'left-premises' || p.status === 'skipped').length;
    const totalCount = patients.length;
    
    const abandonmentRate = totalCount > 0 ? (abandonedCount / totalCount) * 100 : 0;
    
    let totalWaitTime = 0;
    let waitCount = 0;
    
    patients.forEach(p => {
      if (p.calledAt && p.registeredAt) {
        totalWaitTime += (p.calledAt - p.registeredAt) / 60000;
        waitCount++;
      }
    });
    
    const avgWaitTime = waitCount > 0 ? totalWaitTime / waitCount : 0;

    res.status(200).json({
      servedCount,
      abandonmentRate: abandonmentRate.toFixed(1),
      avgWaitTime: Math.round(avgWaitTime),
      totalRegistered: totalCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
