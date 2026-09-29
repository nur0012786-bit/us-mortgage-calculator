const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(n) ? n : 0);
const pct = n => new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1}).format(n);

function buildSchedule(principal, rate, years, extra, price, pmiRate){
  const monthlyRate = rate / 12;
  const scheduledMonths = years * 12;
  const scheduledPI = monthlyRate === 0 ? principal / Math.max(scheduledMonths,1)
    : principal * (monthlyRate * Math.pow(1 + monthlyRate, scheduledMonths)) /
      (Math.pow(1 + monthlyRate, scheduledMonths) - 1);
  const originalLTV = principal / Math.max(price,1);
  const pmiThreshold = price * 0.80;
  let balance = principal, totalInterest = 0, month = 0, rows = [], pmiTotal = 0;
  while(balance > 0.005 && month < scheduledMonths + 600){
    month++;
    const interest = monthlyRate ? balance * monthlyRate : 0;
    const scheduledPrincipal = Math.max(scheduledPI - interest, 0);
    const principalPaid = Math.min(balance, scheduledPrincipal + extra);
    const payment = principalPaid + interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    // PMI is modeled until the balance reaches 80% of the original home value.
    // Actual PMI cancellation timing varies by loan and lender.
    const pmiActive = originalLTV > 0.80 && balance > pmiThreshold;
    const monthlyPMI = pmiActive ? principal * (pmiRate / 100) / 12 : 0;
    pmiTotal += monthlyPMI;

    rows.push({month, principal:principalPaid, interest, payment, balance, pmi:monthlyPMI});
  }
  return {scheduledPI, rows, totalInterest, pmiTotal, months:month};
}

function trackEvent(name, params = {}) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

function calculate(){
  const price = Math.max(+$('homePrice').value || 0, 0);
  const down = Math.min(Math.max(+$('downPayment').value || 0, 0), price);
  const rate = Math.max(+$('rate').value || 0, 0) / 100;
  const years = +$('term').value || 30;
  const principal = Math.max(price - down, 0);
  const tax = price * ((+$('taxRate').value || 0) / 100) / 12;
  const insurance = Math.max(+$('insurance').value || 0, 0) / 12;
  const hoa = Math.max(+$('hoa').value || 0, 0);
  const pmiRate = Math.max(+$('pmiRate').value || 0, 0);
  const extra = Math.max(+$('extra').value || 0, 0);

  const base = buildSchedule(principal, rate, years, 0, price, pmiRate);
  const accelerated = buildSchedule(principal, rate, years, extra, price, pmiRate);
  const monthlyPMI = base.rows.length ? base.rows[0].pmi : 0;
  const monthlyTotal = base.scheduledPI + tax + insurance + hoa + monthlyPMI;

  const interestSaved = Math.max(0, base.totalInterest - accelerated.totalInterest);
  const monthsSaved = Math.max(0, base.months - accelerated.months);
  const baseLoanPayments = principal + base.totalInterest;
  const acceleratedLoanPayments = principal + accelerated.totalInterest;

  $('loanAmount').textContent = money(principal);
  $('monthlyTotal').textContent = money(monthlyTotal);
  $('pi').textContent = money(base.scheduledPI);
  $('tax').textContent = money(tax);
  $('ins').textContent = money(insurance);
  $('pmi').textContent = money(monthlyPMI);
  $('hoaOut').textContent = money(hoa);
  $('interest').textContent = money(base.totalInterest);
  $('totalPaid').textContent = money(baseLoanPayments);

  const payoff = new Date();
  payoff.setDate(1);
  payoff.setMonth(payoff.getMonth() + base.months);
  $('payoff').textContent = payoff.toLocaleDateString('en-US',{month:'short',year:'numeric'});

  $('extraSavings').textContent = money(interestSaved);
  $('monthsSaved').textContent = monthsSaved ? `${monthsSaved} month${monthsSaved === 1 ? '' : 's'}` : '0 months';
  $('extraResult').textContent = extra > 0
    ? `With ${money(extra)} extra each month, estimated loan payoff is ${accelerated.months} months instead of ${base.months}.`
    : 'Enter an extra monthly principal amount to estimate interest and time savings.';

  const tbody = $('schedule');
  tbody.innerHTML = accelerated.rows.map(r =>
    `<tr><td>${r.month}</td><td>${money(r.principal)}</td><td>${money(r.interest)}</td><td>${money(r.payment)}</td><td>${money(r.balance)}</td></tr>`
  ).join('');
}

$('mortgageForm').addEventListener('submit', e => {
  e.preventDefault();
  calculate();
  trackEvent('calculator_used', { calculator_name: 'mortgage_calculator', extra_payment: extraValue() });
});
$('mortgageForm').addEventListener('input', calculate);
function extraValue(){ return Math.max(+$('extra').value || 0, 0); }

$('toggleSchedule').addEventListener('click', () => {
  const w = $('scheduleWrap');
  w.hidden = !w.hidden;
  $('toggleSchedule').textContent = w.hidden ? 'Show schedule' : 'Hide schedule';
  trackEvent('amortization_view', { calculator_name: 'mortgage_calculator', action: w.hidden ? 'hide' : 'show' });
});
calculate();