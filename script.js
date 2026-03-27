// Register Service Worker for offline PWA capability
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

// Data for auto-filling loan templates
const loanProfiles = {
    'two': { amt: 100000, rate: 11.5, time: 3, fee: 2, jargon: "💡 Vehicles depreciate quickly. Watch out for 'Flat Rates' offered by dealers—they almost double your actual APR!" },
    'four': { amt: 800000, rate: 9.0, time: 5, fee: 1, jargon: "💡 Loans are usually secured against the car. 'Reducing Balance' is the standard for banks." },
    'home': { amt: 5000000, rate: 8.5, time: 20, fee: 0.5, jargon: "💡 Extremely long tenure. Small changes in interest or prepayments save lakhs. You get tax benefits under 80C & 24(b)." },
    'personal': { amt: 300000, rate: 13.0, time: 3, fee: 2.5, jargon: "💡 Unsecured loan. Very high rates and high processing fees. Always check the final APR before signing." }
};

// Switch between dashboard views
function showView(viewId, event) {
    document.getElementById('emi-view').style.display = 'none';
    document.getElementById('calc-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';
    document.getElementById('privacy-view').style.display = 'none';
    document.getElementById('terms-view').style.display = 'none';
    
    document.getElementById(viewId).style.display = (viewId === 'calc-view') ? 'flex' : 'block';
    
    if(event) {
        let tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => tab.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
}

// Populate and trigger EMI calculations
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
    calculateEMI();
}

// Core IRR calculation logic
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

// Update the DOM based on user input
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
    } else {
        document.getElementById('emi-result').innerText = "₹ 0";
        document.getElementById('total-interest').innerText = "₹ 0";
        document.getElementById('total-fees').innerText = "₹ 0";
        document.getElementById('total-payment').innerText = "₹ 0";
        document.getElementById('apr-result').innerText = "Real APR: 0%";
        document.getElementById('pie-chart').style.background = `conic-gradient(#E5E7EB 0% 100%)`;
    }
}

// Logic for the basic calculator tab
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

// Set initial state on load
window.onload = () => showEMI('Two-Wheeler Loan', 'two');
