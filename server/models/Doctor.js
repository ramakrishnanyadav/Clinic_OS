const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  name: String,
  specialty: String,
  tokenPrefix: String,
  isAvailable: { type: Boolean, default: true }
});

module.exports = mongoose.model('Doctor', doctorSchema);
