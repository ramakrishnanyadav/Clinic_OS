require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const Clinic = require('./models/Clinic');
const Doctor = require('./models/Doctor');
const { initSocket } = require('./services/socketBroadcast');
const { startDelayDetector } = require('./services/delayDetector');
const { restoreStateOnStartup } = require('./services/recoveryService');

// Connect Database
connectDB();

// Seed Database
const seedDB = async () => {
  try {
    const CLINIC_ID = process.env.DEFAULT_CLINIC_ID || '64abcd123456789012345678';
    const DOCTOR_ID = process.env.DEFAULT_DOCTOR_ID || '64abcd123456789012345679';
    let clinic = await Clinic.findById(CLINIC_ID);
    if (!clinic) {
      await Clinic.create({ _id: CLINIC_ID, name: 'Wooble Clinic', ownerPhone: '1234567890' });
    }
    let doctor = await Doctor.findById(DOCTOR_ID);
    if (!doctor) {
      await Doctor.create({ _id: DOCTOR_ID, clinicId: CLINIC_ID, name: 'Dr. Mehta', specialty: 'General Physician', tokenPrefix: 'GP' });
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};
seedDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Init Socket Service
initSocket(io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Routes
// Dynamic Client Configuration (Simulates Auth Context)
app.get('/api/config', (req, res) => {
  // In production, this would return the clinicId bound to the logged-in user's JWT
  res.json({
    clinicId: process.env.DEFAULT_CLINIC_ID || '64abcd123456789012345678',
    doctorId: process.env.DEFAULT_DOCTOR_ID || '64abcd123456789012345679'
  });
});

app.use('/api/queue', require('./routes/queue.routes'));
app.use('/api/patients', require('./routes/patient.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Guard]', err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Internal server error', 
    details: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Socket Event Map
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('client:join_queue', ({ clinicId, doctorId, role }) => {
    if (role === 'receptionist') {
      socket.join(`clinic_${clinicId}`);
      if (doctorId) socket.join(`clinic_${clinicId}_doctor_${doctorId}`);
    } else if (role === 'patient') {
      socket.join(`clinic_${clinicId}_doctor_${doctorId}`);
    } else if (role === 'owner') {
      socket.join(`clinic_${clinicId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Background Services
startDelayDetector();
restoreStateOnStartup();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
