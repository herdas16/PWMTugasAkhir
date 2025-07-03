// db.js
const dbName = 'DompetKuDB';
const dbVersion = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('transactions')) {
                db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('categories')) {
                const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                ['Makanan', 'Transportasi', 'Hiburan', 'Gaji', 'Bonus'].forEach(cat => categoryStore.add({ name: cat }));
            }
             if (!db.objectStoreNames.contains('paymentMethods')) {
                const paymentStore = db.createObjectStore('paymentMethods', { keyPath: 'id', autoIncrement: true });
                ['Tunai', 'Debit', 'Kredit', 'E-wallet'].forEach(pm => paymentStore.add({ name: pm }));
            }
        };

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => {
            console.error("Database error: ", event.target.error);
            reject(event.target.error);
        };
    });
}

async function getStore(storeName, mode) {
    const db = await openDB();
    return db.transaction(storeName, mode).objectStore(storeName);
}

async function addData(storeName, data) {
    const store = await getStore(storeName, 'readwrite');
    const request = store.add(data);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllData(storeName) {
    const store = await getStore(storeName, 'readonly');
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteData(storeName, id) {
    const store = await getStore(storeName, 'readwrite');
    const request = store.delete(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}