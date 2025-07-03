// app.js

document.addEventListener('DOMContentLoaded', () => {
    // === 1. DEKLARASI VARIABEL UTAMA ===
    const appContent = document.getElementById('app-content');
    const fab = document.getElementById('add-transaction-fab');
    const navButtons = document.querySelectorAll('.bottom-nav button');
    let currentChart = null;

    // === 2. FUNGSI BANTU (HELPERS) ===
    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    // === 3. LOGIKA NAVIGASI ===
    function navigate(page) {
        fab.style.display = (page === 'dashboard') ? 'block' : 'none';

        navButtons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`nav-${page}`);
        if (activeBtn) activeBtn.classList.add('active');

        const template = document.getElementById(`${page}-page`);
        if (template) {
            appContent.innerHTML = '';
            appContent.appendChild(template.content.cloneNode(true));

            if (page === 'dashboard') initDashboard();
            if (page === 'add-edit-transaction') initTransactionForm();
            if (page === 'reports') initReports();
            if (page === 'settings') initSettings();
        }
    }

    // === 4. FUNGSI INISIALISASI HALAMAN ===
    async function initDashboard() {
        try {
            const transactions = await getAllData('transactions');
            const listEl = document.getElementById('transaction-list');
            listEl.innerHTML = '';

            let monthlyIncome = 0;
            let monthlyExpense = 0;
            const now = new Date();
            const categoryExpenses = {};

            transactions.forEach(t => {
                const txDate = new Date(t.date);
                if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
                    if (t.type === 'income') {
                        monthlyIncome += t.amount;
                    } else {
                        monthlyExpense += t.amount;
                        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
                    }
                }
            });

            const totalBalance = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            
            document.getElementById('current-balance').textContent = formatCurrency(totalBalance);
            document.getElementById('monthly-income').textContent = formatCurrency(monthlyIncome);
            document.getElementById('monthly-expense').textContent = formatCurrency(monthlyExpense);

            if (transactions.length > 0) {
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                transactions.slice(0, 5).forEach(t => {
                    const item = document.createElement('li');
                    item.innerHTML = `
                        <div class="transaction-desc">
                            <strong>${t.description}</strong><br>
                            <small>${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</small>
                        </div>
                        <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</span>
                    `;
                    listEl.appendChild(item);
                });
            } else {
                listEl.innerHTML = '<li>Belum ada transaksi.</li>';
            }

            const ctx = document.getElementById('expense-pie-chart').getContext('2d');
            if (currentChart) currentChart.destroy();

            if (Object.keys(categoryExpenses).length > 0) {
                currentChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(categoryExpenses),
                        datasets: [{ data: Object.values(categoryExpenses), backgroundColor: ['#F44336', '#FFC107', '#2196F3', '#9C27B0', '#009688', '#FF9800'], borderWidth: 0 }]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
                });
            } else {
               const canvas = document.getElementById('expense-pie-chart');
               ctx.font = "16px Arial";
               ctx.textAlign = "center";
               ctx.fillText("Tidak ada data pengeluaran bulan ini", canvas.width / 2, canvas.height / 2);
            }
        } catch (error) {
            console.error("Gagal menginisialisasi dashboard:", error);
            appContent.innerHTML = `<p style="text-align: center; color: red;">Gagal memuat data. Pastikan file 'db.js' ada dan benar.</p>`;
        }
    }

    async function initTransactionForm() {
        const form = document.getElementById('transaction-form');
        const categorySelect = document.getElementById('category');
        const paymentMethodSelect = document.getElementById('payment-method');

        try {
            const categories = await getAllData('categories');
            const paymentMethods = await getAllData('paymentMethods');
            categorySelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            paymentMethodSelect.innerHTML = paymentMethods.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        } catch(error) {
             console.error("Gagal memuat kategori/metode pembayaran:", error);
        }
        
        document.getElementById('date').valueAsDate = new Date();
        const typeExpenseBtn = document.getElementById('type-expense');
        const typeIncomeBtn = document.getElementById('type-income');
        let transactionType = 'expense';

        typeExpenseBtn.onclick = () => { transactionType = 'expense'; typeExpenseBtn.classList.add('active'); typeIncomeBtn.classList.remove('active'); };
        typeIncomeBtn.onclick = () => { transactionType = 'income'; typeIncomeBtn.classList.add('active'); typeExpenseBtn.classList.remove('active'); };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const newTransaction = { type: transactionType, amount: parseFloat(document.getElementById('amount').value), description: document.getElementById('description').value, date: document.getElementById('date').value, category: document.getElementById('category').value, paymentMethod: document.getElementById('payment-method').value };
            await addData('transactions', newTransaction);
            alert('Transaksi berhasil disimpan!');
            navigate('dashboard');
        };
        document.getElementById('cancel-button').onclick = () => navigate('dashboard');
    }

    function initReports() {
        const reportContent = appContent.querySelector(".filter-group");
        if (reportContent) {
            reportContent.insertAdjacentHTML('afterend', '<p style="text-align:center; padding: 20px;">Halaman Laporan sedang dalam pengembangan.</p>');
        }
    }

    async function initSettings() {
        const categoryListEl = document.getElementById('category-list');
        const categoryForm = document.getElementById('category-form');

        async function renderCategories() {
            try {
                const categories = await getAllData('categories');
                categoryListEl.innerHTML = '';
                categories.forEach(cat => {
                    const li = document.createElement('li');
                    li.textContent = cat.name;
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Hapus';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.onclick = async () => {
                        if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
                            await deleteData('categories', cat.id);
                            renderCategories();
                        }
                    };
                    li.appendChild(deleteBtn);
                    categoryListEl.appendChild(li);
                });
            } catch (error) {
                 console.error("Gagal merender kategori:", error);
            }
        }

        categoryForm.onsubmit = async (e) => {
            e.preventDefault();
            const newCatNameInput = document.getElementById('new-category-name');
            const newCatName = newCatNameInput.value.trim();
            if (newCatName) {
                await addData('categories', { name: newCatName });
                categoryForm.reset();
                renderCategories();
                alert(`Kategori "${newCatName}" berhasil ditambahkan!`);
            }
        };
        renderCategories();
    }

    // === 5. EVENT LISTENERS & INISIASI PWA ===
    fab.addEventListener('click', () => navigate('add-edit-transaction'));
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.id.replace('nav-', '');
            navigate(page);
        });
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker terdaftar:', registration))
                .catch(error => console.log('Pendaftaran Service Worker gagal:', error));
        });
    }

    let deferredPrompt;
    const installButton = document.getElementById('install-button');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });
    
    installButton.addEventListener('click', () => {
        installButton.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    });

    // === 6. MULAI APLIKASI ===
    navigate('dashboard');
});