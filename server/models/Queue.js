const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  date: Date,
  currentToken: { type: Number, default: 0 },
  lastTokenIssued: { type: Number, default: 0 },
  lastCalledAt: Date,
  currentConsultStartedAt: Date,
  status: { type: String, enum: ["open", "paused", "closed"], default: "open" },
  emergencyCount: { type: Number, default: 0 },
  delayFlagged: { type: Boolean, default: false }
});

queueSchema.index({ clinicId: 1, doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Queue', queueSchema);
