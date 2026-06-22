const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: String,
  ownerPhone: String,
  settings: {
    defaultAvgTime: { type: Number, default: 15 },
    whatsappEnabled: { type: Boolean, default: false },
    workingHours: {
      open: { type: String, default: "09:00" },
      close: { type: String, default: "20:00" }
    }
  }
});

module.exports = mongoose.model('Clinic', clinicSchema);
