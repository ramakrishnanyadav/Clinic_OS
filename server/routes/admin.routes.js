const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');

router.post('/doctors', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clinics', async (req, res) => {
  try {
    const clinic = new Clinic(req.body);
    await clinic.save();
    res.status(201).json(clinic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
