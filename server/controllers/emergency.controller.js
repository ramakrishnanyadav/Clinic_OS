const { injectEmergency } = require('../services/emergencyInjector');

exports.addEmergency = async (req, res) => {
  try {
    const { queueId, name } = req.body;
    
    const patient = await injectEmergency(queueId, name);
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
