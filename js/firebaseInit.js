// js/firebaseInit.js
// استيراد الدوال الأساسية من Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// تهيئة Firebase ببيانات مشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAZh5ghfkuIZR7XpflKy3FxqTXRliayBIc",
  authDomain: "alswrqyaymn-82ffe.firebaseapp.com",
  databaseURL: "https://alswrqyaymn-82ffe-default-rtdb.firebaseio.com",
  projectId: "alswrqyaymn-82ffe",
  storageBucket: "alswrqyaymn-82ffe.firebasestorage.app",
  messagingSenderId: "570972435530",
  appId: "1:570972435530:web:4315b7bef03fcf168a62b3"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// الحصول على مثيلات الخدمات
const auth = getAuth(app);
const db = getFirestore(app);

// تصدير المثيلات لتكون متاحة في ملفات JavaScript الأخرى
export { auth, db };