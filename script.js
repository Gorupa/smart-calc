if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

const loanProfiles = {
    'two': { title: 'Two-Wheeler Loan', amt: 100000, rate: 11.5, time: 3, fee: 2, country: 'IN', jargon: "💡 Dealers push 'Flat Rates' which hide the true cost. This calculator uses Reducing Balance to show reality." },
    'four': { title: 'Four-Wheeler Loan', amt: 800000, rate: 9.0, time: 5, fee: 1, country: 'IN', jargon: "💡 Loans are secured against the car. Try adding extra monthly payments to see how fast you can own it." },
    'home': { title: 'Home Loan', amt: 5000000, rate: 8.5, time: 20, fee: 0.5, country: 'IN', jargon: "💡 Use the Prepayment section below! Even a 10% lump sum every year shaves off years of debt." },
    'personal': { title: 'Personal Loan', amt: 300000, rate: 13.0, time: 3, fee: 2.5, country: 'IN', jargon: "💡 Unsecured loans carry high interest. Check the 'Real APR' below to see the true cost including fees." }
};

function showView(viewId, event) {
    const views = ['emi-view', 'calc-view', 'compare-view', 'about-view', 'privacy-view', 'settings-view'];
    views.forEach(v => document.getElementById(v).style.display = 'none');
    document.getElementById(viewId).style.display = (viewId === 'compare-view' || viewId === 'emi-view') ? 'block' : (viewId === 'calc-view' ? 'flex' : 'block');
    
    if(event) {
        let tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => tab.classList.remove('active'));
        if (event.currentTarget) event.currentTarget.classList.add('active');
        else document.getElementById(event).classList.add('active');
    }
    if (viewId === 'compare-view') runCompare();
}

// 1. Asset Builder Toggle
function toggleAssetBuilder() {
    const isAsset = document.getElementById('use-asset-builder').checked;
    document.getElementById('direct-loan-inputs').style.display = isAsset ? 'none' : 'block';
    document.getElementById('asset-builder-inputs').style.display = isAsset ? 'block' : 'none';
}

function getPrincipal() {
    if (document.getElementById('use-asset-builder').checked) {
        let asset = parseFloat(document.getElementById('asset-price').value) || 0;
        let down = parseFloat(document.getElementById('down-payment').value) || 0;
        let trade = parseFloat(document.getElementById('trade-in').value) || 0;
        let finalP = asset - down - trade;
        finalP = finalP < 0 ? 0 : finalP;
        document.getElementById('calc-loan-display').innerText = "₹" + Math.round(finalP).toLocaleString('en-IN');
        return finalP;
    }
    return parseFloat(document.getElementById('principal').value) || 0;
}

function showEMI(title, typeId) {
    const profile = loanProfiles[typeId];
    document.getElementById('loan-title').innerText = title;
    document.getElementById('jargon-box').innerHTML = profile.jargon;
    
    document.getElementById('use-asset-builder').checked = false;
    toggleAssetBuilder();
    
    document.getElementById('principal').value = profile.amt;
    document.getElementById('rate').value = profile.rate;
    document.getElementById('tenure').value = profile.time;
    document.getElementById('proc-fee').value = profile.fee;
    document.getElementById('country-rules').value = profile.country;
    
    document.getElementById('extra-emi').value = 0;
    document.getElementById('lump-sum').value = 0;
    
    document.getElementById('amortization-schedule').style.display = 'none';
    calculateEMI();
}

// 2. The Core Math Engine
function calculateEMI() {
    let p = getPrincipal();
    let r_annual = parseFloat(document.getElementById('rate').value) || 0;
    let years = parseFloat(document.getElementById('tenure').value) || 0;
    let country = document.getElementById('country-rules').value;
    let rateType = document.getElementById('rate-type').value;
    
    let extraMonthly = parseFloat(document.getElementById('extra-emi').value) || 0;
    let lumpSum = parseFloat(document.getElementById('lump-sum').value) || 0;
    let lumpMonth = parseInt(document.getElementById('lump-month').value) || 12;

    let n = Math.ceil(years * 12);
    let monthlyRate = r_annual / 12 / 100;
    
    // Canadian Math (Semi-Annual Compounding)
    if (country === 'CA') monthlyRate = Math.pow(1 + (r_annual / 100) / 2, 2 / 12) - 1;

    // US PITI Toggle
    let pitiUI = document.getElementById('us-piti-inputs');
    pitiUI.style.display = country === 'US' ? 'flex' : 'none';

    if (p > 0 && r_annual > 0 && n > 0) {
        let baseEMI = 0;
        
        if (rateType === 'reducing') {
            baseEMI = (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        } else {
            baseEMI = (p + (p * (r_annual / 100) * years)) / n;
        }

        // Amortization & Prepayment Loop
        let balance = p;
        let totalInterestPaid = 0;
        let actualMonths = 0;
        let scheduleHtml = '';
        
        // India Tax Variables
        let year1Interest = 0, year1Principal = 0;

        for (let i = 1; i <= n; i++) {
            let interestPaid = rateType === 'reducing' ? (balance * monthlyRate) : (p * (r_annual/100) / 12);
            let principalPaid = baseEMI - interestPaid;
            
            // Add extra payments
            principalPaid += extraMonthly;
            if (i === lumpMonth) principalPaid += lumpSum;

            if (balance < principalPaid) {
                principalPaid = balance;
                baseEMI = principalPaid + interestPaid; // Final month correction
            }
            
            balance -= principalPaid;
            totalInterestPaid += interestPaid;
            actualMonths++;
            
            if (i <= 12) { year1Interest += interestPaid; year1Principal += principalPaid; }

            scheduleHtml += `<tr><td style="text-align: center;">${i}</td><td style="text-align: right; color: var(--md-sys-color-primary);">₹${Math.round(principalPaid).toLocaleString('en-IN')}</td><td style="text-align: right; color: #F43F5E;">₹${Math.round(interestPaid).toLocaleString('en-IN')}</td><td style="text-align: right;">₹${Math.round(balance).toLocaleString('en-IN')}</td></tr>`;
            
            if (balance <= 0) break;
        }

        // Update PITI additions for USA
        let totalMonthlyDisplay = baseEMI;
        let usTaxes = 0, usIns = 0, usHoa = 0;
        if (country === 'US') {
            usTaxes = (parseFloat(document.getElementById('us-tax').value) || 0) / 12;
            usIns = (parseFloat(document.getElementById('us-ins').value) || 0) / 12;
            usHoa = parseFloat(document.getElementById('us-hoa').value) || 0;
            totalMonthlyDisplay += (usTaxes + usIns + usHoa);
            document.getElementById('monthly-label').innerText = "Monthly PITI";
        } else { document.getElementById('monthly-label').innerText = "Monthly EMI"; }

        // Update Base UI
        let fees = p * ((parseFloat(document.getElementById('proc-fee').value) || 0) / 100) + (parseFloat(document.getElementById('other-fees').value) || 0);
        let totalPayment = p + totalInterestPaid + fees;

        document.getElementById('emi-result').innerText = "₹ " + Math.round(totalMonthlyDisplay).toLocaleString('en-IN');
        document.getElementById('total-interest').innerText = "₹ " + Math.round(totalInterestPaid).toLocaleString('en-IN');
        document.getElementById('total-fees').innerText = "₹ " + Math.round(fees).toLocaleString('en-IN');
        document.getElementById('total-payment').innerText = "₹ " + Math.round(totalPayment).toLocaleString('en-IN');
        document.getElementById('schedule-body').innerHTML = scheduleHtml;

        // Savings Badge Logic
        let noPrepayInterest = 0;
        if (rateType === 'reducing') {
            let standardEMI = (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
            noPrepayInterest = (standardEMI * n) - p;
        } else { noPrepayInterest = p * (r_annual / 100) * years; }
        
        let savedInt = noPrepayInterest - totalInterestPaid;
        let savedMonths = n - actualMonths;
        let sBadge = document.getElementById('savings-badge');
        
        if (savedInt > 100) {
            sBadge.style.display = 'inline-block';
            sBadge.innerText = `🔥 Saved ₹${Math.round(savedInt).toLocaleString('en-IN')} & finished ${savedMonths} months early!`;
        } else { sBadge.style.display = 'none'; }

        // Tax Badge Logic (India Only)
        let tBadge = document.getElementById('tax-badge');
        if (country === 'IN' && (year1Interest > 0 || year1Principal > 0)) {
            let taxSavings = (Math.min(year1Interest, 200000) + Math.min(year1Principal, 150000)) * 0.30;
            tBadge.style.display = 'inline-block';
            tBadge.innerText = `🛡️ Est. India Tax Saving (Yr 1): ₹${Math.round(taxSavings).toLocaleString('en-IN')}`;
        } else { tBadge.style.display = 'none'; }

        // Pie Chart Update
        let pPercent = (p / totalPayment) * 100;
        let iPercent = (totalInterestPaid / totalPayment) * 100;
        document.getElementById('pie-chart').style.background = `conic-gradient(var(--md-sys-color-primary) 0% ${pPercent}%, #A5B4FC ${pPercent}% ${pPercent + iPercent}%, #F43F5E ${pPercent + iPercent}% 100%)`;

    } else { resetEMI(); }
}

function resetEMI() {
    document.getElementById('emi-result').innerText = "₹ 0";
    document.getElementById('total-interest').innerText = "₹ 0";
    document.getElementById('total-payment').innerText = "₹ 0";
    document.getElementById('savings-badge').style.display = 'none';
    document.getElementById('tax-badge').style.display = 'none';
    document.getElementById('pie-chart').style.background = `conic-gradient(#E5E7EB 0% 100%)`;
}

function toggleSchedule() {
    const sched = document.getElementById('amortization-schedule');
    const btn = document.getElementById('toggle-schedule-btn');
    if (sched.style.display === 'block') { sched.style.display = 'none'; btn.innerText = '📊 View Repayment Schedule'; } 
    else { sched.style.display = 'block'; btn.innerText = 'Hide Repayment Schedule'; }
}

// 3. Compare View Logic
function runCompare() {
    let pA = parseFloat(document.getElementById('comp-p-a').value) || 0;
    let rA = parseFloat(document.getElementById('comp-r-a').value) / 12 / 100 || 0;
    let nA = (parseFloat(document.getElementById('comp-t-a').value) || 0) * 12;
    let fA = pA * ((parseFloat(document.getElementById('comp-f-a').value) || 0) / 100);

    let pB = parseFloat(document.getElementById('comp-p-b').value) || 0;
    let rB = parseFloat(document.getElementById('comp-r-b').value) / 12 / 100 || 0;
    let nB = (parseFloat(document.getElementById('comp-t-b').value) || 0) * 12;
    let fB = pB * ((parseFloat(document.getElementById('comp-f-b').value) || 0) / 100);

    let totalA = 0, totalB = 0;

    if (pA > 0 && rA > 0 && nA > 0) {
        let emiA = (pA * rA * Math.pow(1+rA, nA)) / (Math.pow(1+rA, nA) - 1);
        let intA = (emiA * nA) - pA;
        totalA = pA + intA + fA;
        document.getElementById('comp-emi-a').innerText = "₹" + Math.round(emiA).toLocaleString('en-IN');
        document.getElementById('comp-int-a').innerText = "₹" + Math.round(intA).toLocaleString('en-IN');
        document.getElementById('comp-fee-a').innerText = "₹" + Math.round(fA).toLocaleString('en-IN');
        document.getElementById('comp-total-a').innerText = "₹" + Math.round(totalA).toLocaleString('en-IN');
    }

    if (pB > 0 && rB > 0 && nB > 0) {
        let emiB = (pB * rB * Math.pow(1+rB, nB)) / (Math.pow(1+rB, nB) - 1);
        let intB = (emiB * nB) - pB;
        totalB = pB + intB + fB;
        document.getElementById('comp-emi-b').innerText = "₹" + Math.round(emiB).toLocaleString('en-IN');
        document.getElementById('comp-int-b').innerText = "₹" + Math.round(intB).toLocaleString('en-IN');
        document.getElementById('comp-fee-b').innerText = "₹" + Math.round(fB).toLocaleString('en-IN');
        document.getElementById('comp-total-b').innerText = "₹" + Math.round(totalB).toLocaleString('en-IN');
    }

    let banner = document.getElementById('compare-winner');
    let cardA = document.getElementById('res-a').parentElement;
    let cardB = document.getElementById('res-b').parentElement;
    cardA.classList.remove('winner'); cardB.classList.remove('winner');

    if (totalA > 0 && totalB > 0) {
        banner.classList.add('active');
        if (totalA < totalB) {
            let diff = totalB - totalA;
            banner.innerText = `🏆 Option A is cheaper by ₹${Math.round(diff).toLocaleString('en-IN')} overall.`;
            cardA.classList.add('winner');
        } else if (totalB < totalA) {
            let diff = totalA - totalB;
            banner.innerText = `🏆 Option B is cheaper by ₹${Math.round(diff).toLocaleString('en-IN')} overall.`;
            cardB.classList.add('winner');
        } else {
            banner.innerText = "⚖️ Both loans cost exactly the same overall.";
        }
    } else { banner.classList.remove('active'); banner.innerText = "Enter details for both options to compare."; }
}

// 4. Basic Calc & Settings
let calcExpr = "";
function calcAction(val) {
    let display = document.getElementById('calc-display');
    if (val === 'C') { calcExpr = ""; display.innerText = "0"; return; }
    if (val === '=') {
        try { let result = new Function('return ' + calcExpr)(); display.innerText = Math.round(result * 10000)/10000; calcExpr = display.innerText; } catch (e) { display.innerText = "Error"; calcExpr = ""; }
        return;
    }
    calcExpr += val; display.innerText = calcExpr;
}

function saveDefaultTab() {
    localStorage.setItem('smartCalcDefaultTab', document.getElementById('default-tab-select').value);
    document.getElementById('settings-saved-msg').style.display = 'block';
    setTimeout(() => { document.getElementById('settings-saved-msg').style.display = 'none'; }, 2000);
}

window.onload = () => {
    const defaultTab = localStorage.getItem('smartCalcDefaultTab') || 'two';
    document.getElementById('default-tab-select').value = defaultTab;
    if (defaultTab === 'calc') showView('calc-view', 'btn-calc');
    else { showView('emi-view', 'btn-' + defaultTab); showEMI(loanProfiles[defaultTab].title, defaultTab); }
};
