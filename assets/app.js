const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n || 0);
function calculate(){
 const price=+$('homePrice').value||0, down=Math.min(+$('downPayment').value||0,price), rate=(+$('rate').value||0)/100, years=+$('term').value||30;
 const principal=Math.max(price-down,0), monthlyRate=rate/12, n=years*12;
 const pi=monthlyRate===0 ? principal/n : principal*(monthlyRate*Math.pow(1+monthlyRate,n))/(Math.pow(1+monthlyRate,n)-1);
 const tax=price*((+$('taxRate').value||0)/100)/12, ins=(+$('insurance').value||0)/12, hoa=+$('hoa').value||0;
 const pmi=down/Math.max(price,1)<0.2 ? principal*((+$('pmiRate').value||0)/100)/12 : 0;
 const extra=Math.max(+$('extra').value||0,0), total=pi+tax+ins+hoa+pmi;
 let balance=principal,totalInterest=0,rows=[],month=0; const start=new Date();
 while(balance>0.01 && month<n+600){ month++; const interest=monthlyRate?balance*monthlyRate:0; const principalPaid=Math.min(balance,Math.max(pi-interest,0)+extra); const payment=principalPaid+interest; balance=Math.max(0,balance-principalPaid); totalInterest+=interest; rows.push({month,principal:principalPaid,interest,payment,balance}); if(month===n && balance>0 && extra===0) break; }
 const totalPaid=principal+totalInterest;
 $('monthlyTotal').textContent=money(total); $('pi').textContent=money(pi); $('tax').textContent=money(tax); $('ins').textContent=money(ins); $('pmi').textContent=money(pmi); $('hoaOut').textContent=money(hoa); $('interest').textContent=money(totalInterest); $('totalPaid').textContent=money(totalPaid);
 const payoff=new Date(start.getFullYear(),start.getMonth()+month,1); $('payoff').textContent=payoff.toLocaleDateString('en-US',{month:'short',year:'numeric'});
 const tbody=$('schedule'); tbody.innerHTML=rows.map(r=>`<tr><td>${r.month}</td><td>${money(r.principal)}</td><td>${money(r.interest)}</td><td>${money(r.payment)}</td><td>${money(r.balance)}</td></tr>`).join('');
}
$('mortgageForm').addEventListener('submit',e=>{e.preventDefault();calculate();});
$('mortgageForm').addEventListener('input',calculate);
$('toggleSchedule').addEventListener('click',()=>{const w=$('scheduleWrap');w.hidden=!w.hidden;$('toggleSchedule').textContent=w.hidden?'Show schedule':'Hide schedule';});
calculate();