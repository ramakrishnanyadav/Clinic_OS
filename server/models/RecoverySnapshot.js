const mongoose = require('mongoose');

const recoverySnapshotSchema = new mongoose.Schema({
  queueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue' },
  snapshot: Object,
  savedAt: { type: Date, default: Date.now }
});

recoverySnapshotSchema.index({ savedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('RecoverySnapshot', recoverySnapshotSchema);
