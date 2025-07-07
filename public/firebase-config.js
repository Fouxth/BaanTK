// Firebase Configuration for BaanTK Admin
// แก้ไขค่าเหล่านี้ให้ตรงกับ Firebase Project ของคุณ

const firebaseConfig = {
    apiKey: "AIzaSyBiOyDu0p-_kqrdlF8evuvlZJG7rgol5PE", // ใส่ API Key ของคุณ
    authDomain: "baan-tk.firebaseapp.com", // ใช้ project ID จาก .env
    projectId: "baan-tk", // จาก GOOGLE_PROJECT_ID ใน .env
    storageBucket: "baan-tk.firebasestorage.app", // จาก STORAGE_BUCKET ใน .env
    messagingSenderId: "1020814345061", // ใส่ Messaging Sender ID ของคุณ
    appId: "1:1020814345061:web:bca9e9b2f7d9245fdcd78c", // ใส่ App ID ของคุณ
    databaseURL: "https://baan-tk-default-rtdb.firebaseio.com/", // จาก FIRESTORE_DATABASE_URL ใน .env
    measurementId: "G-LDY9R8G8EG"
};

// Export for use in admin.html
window.firebaseConfig = firebaseConfig;

console.log('🔧 Firebase config loaded:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket
});
