const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const emergencyController = require('../controllers/emergency.controller');
const validate = require('../middleware/validate');
const { registerPatientSchema, emergencyPatientSchema } = require('../validations/patient.validation');

router.post('/', validate(registerPatientSchema), patientController.registerPatient);
router.get('/lookup', patientController.lookupPatient);
router.patch('/:id/leave-mode', patientController.setLeaveMode);
router.patch('/:id/done', patientController.markDone);
router.post('/emergency', validate(emergencyPatientSchema), emergencyController.addEmergency);

module.exports = router;
