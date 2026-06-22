const mongoose = require('mongoose');

const consultationStatSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  date: Date,
  sampleCount: { type: Number, default: 0 },
  rollingAvg: { type: Number, default: 15 }
});

consultationStatSchema.index({ clinicId: 1, doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ConsultationStat', consultationStatSchema);
