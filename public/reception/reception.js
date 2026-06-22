import { api } from '../shared/api.js';
import { initSocket } from '../shared/socket-client.js';

// Dynamic auth context (Replaces hardcoded demo defaults)
let CLINIC_ID = null;
let DOCTOR_ID = null;

let queueId = null;
let currentPhone = '';
let currentName = '';
let currentPatientId = null;

const UI = {
  form: document.getElementById('register-form'),
  phone: document.getElementById('phone'),
  name: document.getElementById('name'),
  duplicateWarning: document.getElementById('duplicate-warning'),
  dupDetails: document.getElementById('dup-details'),
  forceBtn: document.getElementById('force-issue'),
  cancelBtn: document.getElementById('cancel-issue'),
  currentToken: document.getElementById('current-token'),
  callNextBtn: document.getElementById('call-next-btn'),
  markDoneBtn: document.getElementById('mark-done-btn'),
  emergencyName: document.getElementById('emergency-name'),
  injectEmergencyBtn: document.getElementById('inject-emergency-btn'),
  delayWarning: document.getElementById('delay-warning'),
  delayMinutes: document.getElementById('delay-minutes'),
  queueList: document.getElementById('queue-list'),
  waitingCount: document.getElementById('waiting-count'),
  statusText: document.getElementById('status-text'),
  statusDot: document.querySelector('.status-dot')
};

let patientsList = [];

function renderQueue() {
  const waitingPatients = patientsList.filter(p => p.status === 'waiting');
  UI.waitingCount.textContent = waitingPatients.length;
  
  if (waitingPatients.length === 0) {
    UI.queueList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No patients waiting</div>';
    return;
  }
  
  UI.queueList.innerHTML = waitingPatients.map(p => `
    <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
      <strong style="color: #93c5fd;">${p.tokenDisplay}</strong>
      <span>${p.name}</span>
    </div>
  `).join('');
}

async function init() {
  try {
    const config = await api.config();
    CLINIC_ID = config.clinicId;
    DOCTOR_ID = config.doctorId;

    const queue = await api.queue.init(CLINIC_ID, DOCTOR_ID);
    queueId = queue._id;
    
    const { queue: todayQ, patients } = await api.queue.getToday(CLINIC_ID, DOCTOR_ID);
    patientsList = patients;
    renderQueue();
    
    if (todayQ.currentToken) {
      UI.currentToken.textContent = `GP-${todayQ.currentToken}`; // Assuming GP prefix for demo
      const currentPatient = patientsList.find(p => p.token === todayQ.currentToken);
      if (currentPatient && currentPatient.status === 'in-consultation') {
        currentPatientId = currentPatient._id;
        UI.markDoneBtn.style.display = 'block';
      }
    } else {
      UI.currentToken.textContent = 'Queue Not Started';
      UI.currentToken.style.fontSize = '3rem';
    }
    
    if (todayQ.delayFlagged) {
      UI.delayWarning.style.display = 'block';
      UI.delayMinutes.textContent = '14'; // Mocked or calculated
    }

    const socket = initSocket(CLINIC_ID, DOCTOR_ID, 'receptionist');
    
    socket.on('connect', () => {
      UI.statusDot.style.background = 'var(--success)';
      UI.statusText.textContent = 'Connected';
    });
    
    socket.on('patient:added', (data) => {
      patientsList.push({ tokenDisplay: data.token, name: data.name, status: 'waiting' });
      renderQueue();
    });

    socket.on('queue:emergency_insert', () => {
      api.queue.getToday(CLINIC_ID, DOCTOR_ID).then(res => {
        patientsList = res.patients;
        renderQueue();
      });
    });

    socket.on('queue:next_called', (data) => {
      if (data.current) {
        UI.currentToken.textContent = data.current;
        UI.currentToken.style.fontSize = '5.5rem';
      } else {
        UI.currentToken.textContent = 'Queue Not Started';
        UI.currentToken.style.fontSize = '3rem';
      }
      
      api.queue.getToday(CLINIC_ID, DOCTOR_ID).then(res => {
        patientsList = res.patients;
        renderQueue();
      });

      UI.delayWarning.style.display = 'none';
      if (data.currentPatientId) {
        currentPatientId = data.currentPatientId;
        UI.markDoneBtn.style.display = 'block';
      } else {
        currentPatientId = null;
        UI.markDoneBtn.style.display = 'none';
      }
    });

    socket.on('doctor:running_behind', (data) => {
      UI.delayWarning.style.display = 'block';
      UI.delayMinutes.textContent = data.delayMinutes;
    });

    socket.on('patient:notify_sent', (data) => {
      console.log('Notification sent', data);
    });
    
  } catch (err) {
    console.error('Init failed', err);
  }
}

// Phone autofill (returning patient)
UI.phone.addEventListener('blur', async (e) => {
  const phone = e.target.value;
  if (phone.length === 10) {
    try {
      const { history } = await api.patients.lookup(phone, CLINIC_ID);
      if (history) {
        UI.name.value = history.name;
      }
    } catch (e) { /* ignore */ }
  }
});

async function handleRegister(e, force = false) {
  if (e) e.preventDefault();
  
  const payload = {
    clinicId: CLINIC_ID,
    queueId,
    phone: currentPhone || UI.phone.value,
    name: currentName || UI.name.value,
    force
  };

  try {
    const res = await api.patients.register(payload);
    alert(`Token issued: ${res.patient.tokenDisplay}`);
    UI.form.reset();
    UI.duplicateWarning.style.display = 'none';
  } catch (err) {
    if (err.duplicate) {
      UI.duplicateWarning.style.display = 'block';
      UI.dupDetails.textContent = `${err.patientName} · Token ${err.existingToken}`;
      currentPhone = UI.phone.value;
      currentName = UI.name.value;
    }
  }
}

UI.form.addEventListener('submit', (e) => handleRegister(e, false));
UI.forceBtn.addEventListener('click', () => handleRegister(null, true));
UI.cancelBtn.addEventListener('click', () => {
  UI.duplicateWarning.style.display = 'none';
  currentPhone = '';
  currentName = '';
});

UI.callNextBtn.addEventListener('click', async () => {
  try {
    const res = await api.queue.callNext(queueId);
    if (res.current) {
      currentPatientId = res.current._id;
      UI.markDoneBtn.style.display = 'block';
    } else {
      currentPatientId = null;
      UI.markDoneBtn.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
});

UI.markDoneBtn.addEventListener('click', async () => {
  if (!currentPatientId) return;
  try {
    await api.patients.markDone(currentPatientId);
    UI.markDoneBtn.style.display = 'none';
    currentPatientId = null;
  } catch (err) {
    console.error(err);
  }
});

UI.injectEmergencyBtn.addEventListener('click', async () => {
  const name = UI.emergencyName.value;
  if (!name) return alert('Enter name for emergency');
  
  try {
    const res = await api.patients.addEmergency(queueId, name);
    alert(`Emergency Token ${res.tokenDisplay} inserted!`);
    UI.emergencyName.value = '';
  } catch (err) {
    console.error(err);
  }
});

init();
