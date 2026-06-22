import { api } from '../shared/api.js';

// Dynamic auth context
let CLINIC_ID = null;
const AVG_CONSULT_FEE = 600; // Mock fee to calculate revenue impact

const UI = {
  servedCount: document.getElementById('served-count'),
  abandonmentRate: document.getElementById('abandonment-rate'),
  abandonmentSubtitle: document.getElementById('abandonment-subtitle'),
  avgWait: document.getElementById('avg-wait'),
  totalReg: document.getElementById('total-reg')
};

async function loadStats() {
  try {
    if (!CLINIC_ID) {
      const config = await api.config();
      CLINIC_ID = config.clinicId;
    }
    const stats = await api.stats.getToday(CLINIC_ID);
    
    UI.servedCount.textContent = stats.servedCount;
    UI.abandonmentRate.textContent = `${stats.abandonmentRate}%`;
    UI.avgWait.textContent = `${stats.avgWaitTime} min`;
    UI.totalReg.textContent = stats.totalRegistered;

    const lostPatients = Math.round((stats.abandonmentRate / 100) * stats.totalRegistered);
    const revenueLost = lostPatients * AVG_CONSULT_FEE;
    
    UI.abandonmentSubtitle.textContent = `Est. revenue impact: ₹${revenueLost.toLocaleString()}`;

  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

loadStats();
// Auto-refresh every minute
setInterval(loadStats, 60000);
