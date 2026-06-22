const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  queueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue' },
  phone: String,
  name: String,
  token: Number,
  tokenDisplay: String,
  priority: { type: String, enum: ["normal", "emergency"], default: "normal" },
  insertedAfterToken: Number,
  status: { type: String, enum: ["waiting", "notified", "in-consultation", "done", "skipped", "left-premises"], default: "waiting" },
  leaveMode: { type: Boolean, default: false },
  notifyAt: Number,
  notifyPhone: String,
  notificationSent: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  calledAt: Date,
  doneAt: Date,
  actualDuration: Number,
  visitCount: { type: Number, default: 1 },
  lastVisitDate: Date
});

patientSchema.index({ phone: 1, clinicId: 1 });
patientSchema.index({ queueId: 1, token: 1 }, { unique: true });
patientSchema.index({ queueId: 1, status: 1 });

module.exports = mongoose.model('Patient', patientSchema);
