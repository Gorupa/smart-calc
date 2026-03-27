if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

const loanProfiles = {
    'two': { title: 'Two-Wheeler Loan', amt: 100000, rate: 11.5, time: 3, fee: 2, jargon: "💡 Vehicles depreciate quickly. Watch out for 'Flat Rates' offered by dealers—they almost double your actual APR!" },
    'four': { title: 'Four-Wheeler Loan', amt: 800000, rate: 9.0, time: 5, fee: 1, jargon: "💡 Loans are usually secured against the car. 'Reducing Balance' is the standard for banks." },
    'home': { title: 'Home Loan', amt: 5000000, rate: 8.5, time: 20, fee: 0.5, jargon: "💡 Extremely long tenure. Small changes in interest or prepayments save lakhs. You get tax benefits under 80C & 24(b)." },
    'personal': { title: 'Personal Loan', amt: 300000, rate: 13.0, time: 3, fee: 2.5, jargon: "💡 Unsecured loan. Very high rates and high processing fees. Always check the final APR before signing." }
};

function showView(viewId, event) {
    // Hide all views
    document.getElementById('emi-view').style.display = 'none';
    document.getElementById('calc-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
    document.getElementById('privacy-view').style.display = 'none';
    document.getElementById('terms-view').style.display = 'none';
    document.getElementById('settings-view').style.display = 'none';
    
    // Show selected view
    document.getElementById(viewId).style.display = (viewId === 'calc-view') ? 'flex' : 'block';
    
    // Update active state in sidebar
    if(event) {
        let tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => tab.classList.remove('active'));
        if (event.currentTarget) {
            event.currentTarget.classList.add('active');
        } else {
            // For programmatic triggers (like on page load)
            document.getElementById(event).classList.add('active');
        }
    }
}

function showEMI(title, typeId) {
    const profile = loanProfiles[typeId];
    document.getElementById('loan-title').innerText = title;
    document.getElementById('jargon-box').innerHTML = profile.jargon;
    document.getElementById('principal').value = profile.amt;
    document.getElementById('rate').value = profile.rate;
    document.getElementById('tenure').value = profile.time;
    document.getElementById('proc-fee').value = profile.fee;
    document.getElementById('other-fees').value = 0;
    document.getElementById('rate-type').value = 'reducing';
    
    document.getElementById('amortization-schedule').style.display = 'none';
    document.getElementById('toggle-schedule-btn').innerText = '📊 View Repayment Schedule';
    
    calculateEMI();
}

function calculateTrueAPR(disbursed, emi, months) {
    if (disbursed <= 0 || emi <= 0 || months <= 0) return 0;
    let minRate = 0, maxRate = 100, guess = 1;
    for(let i=0; i<20; i++) {
        let pv = 0;
        for(let j=1; j<=months; j++) { pv += emi / Math.pow(1 + (guess/100), j); }
        if(pv > disbursed) { minRate = guess; guess = (guess + maxRate) / 2; } else { maxRate = guess; guess = (guess + minRate) / 2; }
    }
    return guess * 12; 
}

function calculateEMI() {
    let p = parseFloat(document.getElementById('principal').value) || 0;
    let r_annual = parseFloat(document.getElementById('rate').value) || 0;
    let years = parseFloat(document.getElementById('tenure').value) || 0;
    let procFeePerc = parseFloat(document.getElementById('proc-fee').value) || 0;
    let otherFees = parseFloat(document.getElementById('other-fees').value) || 0;
    let rateType = document.getElementById('rate-type').value;

    let n = years * 12;
    let r = r_annual / 12 / 100;
    
    if (p > 0 && r_annual > 0 && n > 0) {
        let emi = 0, totalInterest = 0, totalPayment = 0;
        let totalFeesCalculated = (p * (procFeePerc / 100)) + otherFees;

        if (rateType === 'reducing') {
            emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            totalInterest = (emi * n) - p;
        } else {
            totalInterest = p * (r_annual / 100) * years;
            emi = (p + totalInterest) / n;
        }
        totalPayment = p + totalInterest + totalFeesCalculated;

        let actualDisbursed = p - totalFeesCalculated;
        let trueAPR = calculateTrueAPR(actualDisbursed, emi, n);

        document.getElementById('emi-result').innerText = "₹ " + Math.round(emi).toLocaleString('en-IN');
        document.getElementById('total-interest').innerText = "₹ " + Math.round(totalInterest).toLocaleString('en-IN');
        document.getElementById('total-fees').innerText = "₹ " + Math.round(totalFeesCalculated).toLocaleString('en-IN');
        document.getElementById('total-payment').innerText = "₹ " + Math.round(totalPayment).toLocaleString('en-IN');
        document.getElementById('apr-result').innerText = "Real APR: " + trueAPR.toFixed(2) + "%";
        
        let pPercent = (p / totalPayment) * 100;
        let iPercent = (totalInterest / totalPayment) * 100;
        document.getElementById('pie-chart').style.background = `conic-gradient(var(--md-sys-color-primary) 0% ${pPercent}%, #A5B4FC ${pPercent}% ${pPercent + iPercent}%, #F43F5E ${pPercent + iPercent}% 100%)`;
        
        generateSchedule(p, r, n, emi, rateType, r_annual);
        
    } else {
        document.getElementById('emi-result').innerText = "₹ 0";
        document.getElementById('total-interest').innerText = "₹ 0";
        document.getElementById('total-fees').innerText = "₹ 0";
        document.getElementById('total-payment').innerText = "₹ 0";
        document.getElementById('apr-result').innerText = "Real APR: 0%";
        document.getElementById('pie-chart').style.background = `conic-gradient(#E5E7EB 0% 100%)`;
        document.getElementById('schedule-body').innerHTML = "";
    }
}

function toggleSchedule() {
    const sched = document.getElementById('amortization-schedule');
    const btn = document.getElementById('toggle-schedule-btn');
    if (sched.style.display === 'block') {
        sched.style.display = 'none';
        btn.innerText = '📊 View Repayment Schedule';
    } else {
        sched.style.display = 'block';
        btn.innerText = 'Hide Repayment Schedule';
    }
}

function generateSchedule(principal, monthlyRate, months, emi, rateType, annualRate) {
    const tbody = document.getElementById('schedule-body');
    let balance = principal;
    let html = '';
    
    let flatPrincipal = principal / months;
    let flatInterest = (principal * (annualRate / 100) * (months / 12)) / months;

    for (let i = 1; i <= months; i++) {
        let interestPaid = 0;
        let principalPaid = 0;

        if (rateType === 'reducing') {
            interestPaid = balance * monthlyRate;
            principalPaid = emi - interestPaid;
        } else {
            interestPaid = flatInterest;
            principalPaid = flatPrincipal;
        }

        balance -= principalPaid;
        if (balance < 0) balance = 0; 

        html += `
            <tr>
                <td style="text-align: center; color: var(--md-sys-color-on-surface-variant); font-weight: 600;">${i}</td>
                <td style="text-align: right; color: var(--md-sys-color-primary);">₹${Math.round(principalPaid).toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: #F43F5E;">₹${Math.round(interestPaid).toLocaleString('en-IN')}</td>
                <td style="text-align: right; font-weight: 600;">₹${Math.round(balance).toLocaleString('en-IN')}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

let calcExpr = "";
function calcAction(val) {
    let display = document.getElementById('calc-display');
    if (val === 'C') { calcExpr = ""; display.innerText = "0"; return; }
    if (val === '=') {
        try {
            let result = new Function('return ' + calcExpr)();
            result = Math.round(result * 10000) / 10000;
            display.innerText = result; calcExpr = result.toString();
        } catch (e) { display.innerText = "Error"; calcExpr = ""; }
        return;
    }
    calcExpr += val; display.innerText = calcExpr;
    display.scrollLeft = display.scrollWidth;
}

// NEW: Settings Management
function saveDefaultTab() {
    const selectedTab = document.getElementById('default-tab-select').value;
    localStorage.setItem('smartCalcDefaultTab', selectedTab);
    
    const msg = document.getElementById('settings-saved-msg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
}

// Check settings on load and display the correct screen
window.onload = () => {
    const defaultTab = localStorage.getItem('smartCalcDefaultTab') || 'two';
    document.getElementById('default-tab-select').value = defaultTab;
    
    if (defaultTab === 'calc') {
        showView('calc-view', 'btn-calc');
    } else {
        showView('emi-view', 'btn-' + defaultTab);
        showEMI(loanProfiles[defaultTab].title, defaultTab);
    }
};
