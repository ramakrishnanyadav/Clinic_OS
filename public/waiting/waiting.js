import { api } from '../shared/api.js';
import { initSocket } from '../shared/socket-client.js';

// Demo defaults
const CLINIC_ID = '64abcd123456789012345678';
const DOCTOR_ID = '64abcd123456789012345679';

let myPatientId = null;
let myTokenDisplay = null;
let patientsList = [];

const UI = {
  currentToken: document.getElementById('current-token'),
  emergencyBanner: document.getElementById('emergency-banner'),
  emergencyText: document.getElementById('emergency-text'),
  patientView: document.getElementById('patient-view'),
  myToken: document.getElementById('my-token'),
  aheadCount: document.getElementById('ahead-count'),
  waitTime: document.getElementById('wait-time'),
  waitDisclaimer: document.getElementById('wait-disclaimer'),
  delayBadge: document.getElementById('delay-badge'),
  demoLogin: document.getElementById('demo-login'),
  demoToken: document.getElementById('demo-token'),
  demoBtn: document.getElementById('demo-btn'),
  notifyPhone: document.getElementById('notify-phone'),
  notifyBtn: document.getElementById('notify-btn'),
  globalWaitingCount: document.getElementById('global-waiting-count'),
  globalAvgWait: document.getElementById('global-avg-wait')
};

function renderGlobalStats(waitUpdates = null) {
  const waitingPatients = patientsList.filter(p => p.status === 'waiting');
  UI.globalWaitingCount.textContent = waitingPatients.length;
  
  if (waitUpdates && waitUpdates.length > 0) {
    // Just use the first wait update or an average to simulate the global average wait time
    const sum = waitUpdates.reduce((acc, curr) => acc + curr.estimatedWait, 0);
    const avg = Math.round(sum / waitUpdates.length);
    UI.globalAvgWait.textContent = `${avg} min`;
  }
}

async function init() {
  try {
    const config = await api.config();
    CLINIC_ID = config.clinicId;
    DOCTOR_ID = config.doctorId;

    const { queue, patients } = await api.queue.getToday(CLINIC_ID, DOCTOR_ID);
    patientsList = patients;
    
    if (queue.currentToken) {
      UI.currentToken.textContent = `GP-${queue.currentToken}`;
      UI.currentToken.style.fontSize = '12rem';
    } else {
      UI.currentToken.textContent = 'Queue Not Started';
      UI.currentToken.style.fontSize = '5rem';
    }

    renderGlobalStats();

    const socket = initSocket(CLINIC_ID, DOCTOR_ID, 'patient');

    socket.on('queue:next_called', (data) => {
      if (data.current) {
        UI.currentToken.textContent = data.current;
        UI.currentToken.style.fontSize = '12rem';
      } else {
        UI.currentToken.textContent = 'Queue Not Started';
        UI.currentToken.style.fontSize = '5rem';
      }
      
      api.queue.getToday(CLINIC_ID, DOCTOR_ID).then(res => {
        patientsList = res.patients;
        renderGlobalStats(data.waitUpdates);
        updateMyStatus(data.waitUpdates);
      });
    });

    socket.on('patient:added', () => {
       api.queue.getToday(CLINIC_ID, DOCTOR_ID).then(res => {
        patientsList = res.patients;
        renderGlobalStats();
      });
    });

    socket.on('queue:emergency_insert', (data) => {
      api.queue.getToday(CLINIC_ID, DOCTOR_ID).then(res => {
        patientsList = res.patients;
        renderGlobalStats(data.waitUpdates);
        showEmergencyBanner(`Minor delay due to emergency case ${data.eToken}. Your estimated wait has been updated.`);
        updateMyStatus(data.waitUpdates);
      });
    });

    socket.on('doctor:running_behind', (data) => {
      updateMyStatus(null, true);
    });

  } catch (err) {
    console.error('Init failed', err);
  }
}

function showEmergencyBanner(text) {
  UI.emergencyText.textContent = text;
  UI.emergencyBanner.style.display = 'block';
  setTimeout(() => {
    UI.emergencyBanner.style.display = 'none';
  }, 10000);
}

function updateMyStatus(waitUpdates = null, delayEvent = false) {
  if (!myPatientId) return;

  const meIndex = patientsList.findIndex(p => p._id === myPatientId);
  if (meIndex !== -1) {
    UI.aheadCount.textContent = meIndex; // Simple index as ahead count
  }

  if (waitUpdates) {
    const myUpdate = waitUpdates.find(w => w.patientId === myPatientId);
    if (myUpdate) {
      UI.waitTime.textContent = `${myUpdate.estimatedWait} min`;
      
      let disclaimer = "Based on clinic estimate";
      if (myUpdate.sampleCount >= 10) disclaimer = `Based on ${myUpdate.sampleCount} consultations today`;
      else if (myUpdate.sampleCount >= 3) disclaimer = `Based on ${myUpdate.sampleCount} consultations today`;
      
      UI.waitDisclaimer.textContent = disclaimer;

      if (myUpdate.doctorRunningLate) {
        UI.delayBadge.style.display = 'block';
      } else {
        UI.delayBadge.style.display = 'none';
      }
    }
  }

  if (delayEvent) {
    UI.delayBadge.style.display = 'block';
  }
}

UI.demoBtn.addEventListener('click', () => {
  const token = UI.demoToken.value;
  const p = patientsList.find(pt => pt.tokenDisplay === token);
  if (p) {
    myPatientId = p._id;
    myTokenDisplay = p.tokenDisplay;
    UI.myToken.textContent = myTokenDisplay;
    UI.patientView.style.display = 'block';
    UI.demoLogin.style.display = 'none';
    
    // Trigger initial render
    if (p.waitInfo) {
      updateMyStatus([p.waitInfo]);
    } else {
      updateMyStatus();
    }
  } else {
    alert('Token not found in waiting list');
  }
});

UI.notifyBtn.addEventListener('click', async () => {
  const phone = UI.notifyPhone.value;
  if (!phone || !myPatientId) return;

  // Notify when 3 tokens away
  const p = patientsList.find(pt => pt._id === myPatientId);
  const notifyAtToken = Math.max(1, p.token - 3);

  try {
    await api.patients.setLeaveMode(myPatientId, phone, notifyAtToken);
    alert('You will be notified via WhatsApp!');
    UI.notifyBtn.textContent = 'Notification Set';
    UI.notifyBtn.disabled = true;
  } catch (err) {
    console.error(err);
  }
});

init();
