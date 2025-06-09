// js/chat_app.js
// استيراد الدوال التي تحتاجها من Firebase SDKs لـ Firestore و Auth
import { auth, db } from "./firebaseInit.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously,
    fetchSignInMethodsForEmail // لاستخدامه في التحقق من وجود المستخدم
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ثابت لعنوان صفحة الشات
const CHAT_PAGE_URL = 'chat.html';

// تعريفات المتغيرات العامة لعناصر رسالة النظام
let systemMessageContainer;
let systemMessageText;

// دالة لعرض رسائل النظام (الخطأ أو النجاح) في أعلى الشاشة
function displaySystemMessage(message, type = 'info', duration = 3000) {
    if (!systemMessageContainer) {
        systemMessageContainer = document.getElementById('systemMessageContainer');
        systemMessageText = document.getElementById('systemMessageText');
    }

    if (!systemMessageContainer || !systemMessageText) {
        console.error("عناصر رسالة النظام غير موجودة في DOM. fallback to alert.");
        alert(message);
        return;
    }

    // إزالة أي كلاسات سابقة وإخفاء العنصر قبل البدء لتطبيق الانتقال من جديد
    systemMessageContainer.classList.remove('error', 'success', 'info', 'show');
    systemMessageContainer.style.display = 'none'; // تأكد أنه مخفي ليعاد تشغيل transition

    systemMessageText.textContent = message;
    
    // إضافة الكلاس المناسب للنوع واللون
    systemMessageContainer.classList.add(type);
    
    // إظهار الحاوية وتطبيق تأثير الظهور
    systemMessageContainer.style.display = 'block';
    // استخدام setTimeout منفصل لإضافة كلاس 'show' بعد أن يصبح العنصر 'block' لضمان عمل الانتقال
    setTimeout(() => {
        systemMessageContainer.classList.add('show');
    }, 10); // تأخير بسيط جدًا للسماح للمتصفح بإعادة حساب التخطيط

    // إخفاء الرسالة بعد مدة معينة إذا كانت المدة أكبر من 0
    if (duration > 0) {
        setTimeout(() => {
            systemMessageContainer.classList.remove('show'); // إزالة كلاس show لتطبيق تأثير الإخفاء
            // إخفاء display: none بعد انتهاء الانتقال
            setTimeout(() => {
                systemMessageContainer.style.display = 'none';
            }, 300); // يجب أن تتطابق هذه المدة مع مدة transition في CSS (0.3s)
        }, duration);
    } else if (duration === 0) {
        // إذا كانت المدة صفر (أي لا تختفي تلقائياً)، فقط اظهرها
        systemMessageContainer.style.display = 'block';
        setTimeout(() => {
            systemMessageContainer.classList.add('show');
        }, 10);
    }
}

// دالة لإظهار المودال المحدد
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open'); // لمنع التمرير في الخلفية
        displaySystemMessage('', 'info', 0); // مسح أي رسالة نظام سابقة
    }
}

// دالة لإخفاء جميع المودالات
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.classList.remove('modal-open'); // إعادة التمرير للخلفية
    displaySystemMessage('', 'info', 0); // مسح أي رسالة نظام متبقية من الشاشة الرئيسية
}

// دالة لتوجيه المستخدم لصفحة الشات
function redirectToChatPage() {
    window.location.href = CHAT_PAGE_URL;
}

// دالة لحفظ بيانات المستخدم في sessionStorage
function saveUserDataToSession(uid, username, photoURL, userType) {
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('userUid', uid);
    sessionStorage.setItem('userUsername', username);
    sessionStorage.setItem('userPhotoURL', photoURL);
    sessionStorage.setItem('userType', userType); // 'عضو' أو 'زائر'
    // لا نحفظ العمر والجنس في sessionStorage لأنها ليست ضرورية لكل طلب
    // يتم جلبها من Firestore عند الحاجة في صفحة الشات
}

// دالة لجلب بيانات المستخدم من Firestore
async function fetchAndSaveUserData(uid) {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // تأكد من تمرير جميع البيانات اللازمة بما فيها photoURL و userType
        saveUserDataToSession(uid, userData.username, userData.photoURL || 'default_images/user.png', userData.userType || 'عضو');
        return true;
    }
    return false;
}

// ===============================================
// معالجات أحداث النماذج والمصادقة
// ===============================================

// معالج نموذج تسجيل الدخول (الأعضاء)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    displaySystemMessage('جاري تسجيل الدخول...', 'info', 0); // رسالة جاري العمل تظهر حتى يتم التوجيه
    const username = document.getElementById('loginEmail').value.trim(); // تم تغيير هذا ليصبح اسم المستخدم
    const password = document.getElementById('loginPassword').value;

    try {
        // 1. البحث عن البريد الإلكتروني المرتبط باسم المستخدم في Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا غير موجود.', 'error');
            return;
        }

        const userData = querySnapshot.docs[0].data();
        const email = userData.email; // استخراج البريد الإلكتروني من بيانات المستخدم في Firestore

        if (!email) {
            displaySystemMessage('خطأ: لا يوجد بريد إلكتروني مرتبط بهذا الحساب.', 'error');
            return;
        }

        // 2. استخدام البريد الإلكتروني وكلمة المرور لتسجيل الدخول في Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (await fetchAndSaveUserData(user.uid)) {
            displaySystemMessage('تم تسجيل الدخول بنجاح!', 'success', 500); // رسالة نجاح قصيرة
            closeAllModals(); // إخفاء المودال فورًا
            redirectToChatPage(); // التوجيه فورًا
        } else {
            displaySystemMessage('حدث خطأ: لا يمكن العثور على بيانات المستخدم. يرجى الاتصال بالدعم.', 'error');
            auth.signOut(); // تسجيل الخروج من Firebase Authentication
        }
    } catch (error) {
        let errorMessage = "حدث خطأ غير معروف في تسجيل الدخول.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة."; // تم تعديل الرسالة
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "صيغة البريد الإلكتروني (المستخدم داخليًا) غير صحيحة."; // تم تعديل الرسالة
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
        }
        console.error("Login error:", error);
        displaySystemMessage(errorMessage, 'error');
    }
});

// معالج نموذج التسجيل (حساب جديد)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    displaySystemMessage('جاري إنشاء الحساب...', 'info', 0); // رسالة جاري العمل
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const age = document.getElementById('registerAge').value; // جلب قيمة العمر من الـ select
    const gender = document.getElementById('registerGender').value; // جلب قيمة الجنس

    if (password.length < 6) {
        displaySystemMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error');
        return;
    }
    
    // التحقق من العمر والجنس (القائمة المنسدلة تضمن أن العمر ضمن النطاق، فقط نتحقق إذا تم اختيار شيء)
    if (!age) { // إذا لم يتم اختيار عمر (القيمة الافتراضية "")
        displaySystemMessage('الرجاء اختيار العمر.', 'error');
        return;
    }
    if (!gender) {
        displaySystemMessage('الرجاء اختيار الجنس.', 'error');
        return;
    }

    // إنشاء بريد إلكتروني تلقائي وفريد للمستخدمين الجدد
    const uniqueSuffix = Date.now();
    const autoGeneratedEmail = `${username.toLowerCase().replace(/\s/g, '')}${uniqueSuffix}@chatnameapp.com`; // **تأكد من تغيير chatnameapp.com إذا أردت**

    try {
        // التحقق مما إذا كان اسم المستخدم موجودًا بالفعل في Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا موجود بالفعل. يرجى اختيار اسم آخر.', 'error');
            return;
        }

        // إنشاء المستخدم في Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, autoGeneratedEmail, password);
        const user = userCredential.user;

        // حفظ بيانات المستخدم في Firestore، بما في ذلك العمر والجنس
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: username,
            email: autoGeneratedEmail, 
            photoURL: 'default_images/user.png', 
            userType: 'عضو', 
            age: parseInt(age), // حفظ العمر كرقم
            gender: gender, // حفظ الجنس
            createdAt: serverTimestamp()
        });

        saveUserDataToSession(user.uid, username, 'default_images/user.png', 'عضو');
        displaySystemMessage('تم إنشاء الحساب بنجاح!', 'success', 500); // رسالة نجاح قصيرة
        closeAllModals(); // إخفاء المودال فورًا
        redirectToChatPage(); // التوجيه فورًا
    } catch (error) {
        let errorMessage = "حدث خطأ غير معروف في التسجيل.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "البريد الإلكتروني المستخدم للتسجيل موجود بالفعل.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "صيغة البريد الإلكتروني غير صحيحة.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "كلمة المرور ضعيفة جدًا (يجب أن تكون 6 أحرف على الأقل).";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
        }
        console.error("Register error:", error);
        displaySystemMessage(errorMessage, 'error');
    }
});

// معالج نموذج الدخول كزائر
document.getElementById('guestLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    displaySystemMessage('جاري الدخول كزائر...', 'info', 0); // رسالة جاري العمل
    const guestUsername = document.getElementById('guestUsername').value.trim();
    const guestAge = document.getElementById('guestAge').value; // جلب قيمة العمر للزائر من الـ select
    const guestGender = document.getElementById('guestGender').value; // جلب قيمة الجنس للزائر

    if (!guestUsername) {
        displaySystemMessage('الرجاء إدخال اسم الزائر.', 'error');
        return;
    }
    // التحقق من العمر والجنس للزوار (القائمة المنسدلة تضمن أن العمر ضمن النطاق، فقط نتحقق إذا تم اختيار شيء)
    if (!guestAge) { // إذا لم يتم اختيار عمر (القيمة الافتراضية "")
        displaySystemMessage('الرجاء اختيار العمر للزائر.', 'error');
        return;
    }
    if (!guestGender) {
        displaySystemMessage('الرجاء اختيار الجنس للزائر.', 'error');
        return;
    }

    try {
        // التحقق مما إذا كان اسم المستخدم موجودًا بالفعل في Firestore (لمنع تضارب الزوار)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', guestUsername), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا محجوز بالفعل (عضو أو زائر سابق). يرجى اختيار اسم آخر.', 'error');
            return;
        }

        // تسجيل الدخول كمستخدم مجهول في Firebase Authentication
        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        // حفظ بيانات الزائر في Firestore، بما في ذلك العمر والجنس
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: guestUsername,
            photoURL: 'default_images/guest.png', 
            userType: 'زائر', 
            age: parseInt(guestAge), // حفظ العمر كرقم
            gender: guestGender, // حفظ الجنس
            createdAt: serverTimestamp()
        });

        saveUserDataToSession(user.uid, guestUsername, 'default_images/guest.png', 'زائر');
        displaySystemMessage(`مرحباً ${guestUsername}!`, 'success', 500); 
        closeAllModals(); 
        redirectToChatPage(); 
    } catch (error) {
        let errorMessage = "حدث خطأ غير معروف في دخول الزائر.";
        if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "مصادقة الزوار غير مفعلة في مشروع Firebase الخاص بك.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
        }
        console.error("Guest login error:", error);
        displaySystemMessage(errorMessage, 'error');
    }
});

// ===============================================
// معالجات أحداث الأزرار والمودالات
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    const memberLoginButton = document.getElementById('memberLoginBtn');
    const guestLoginButton = document.getElementById('guestLoginBtn');
    const registerButton = document.getElementById('registerBtn');
    const termsButton = document.getElementById('termsButton'); // شروط الاستخدام في الصفحة الرئيسية
    const modalTermsLink = document.getElementById('modalTermsLink'); // شروط الاستخدام داخل مودال التسجيل
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // إعداد متغيرات رسائل النظام بمجرد تحميل DOM
    systemMessageContainer = document.getElementById('systemMessageContainer');
    systemMessageText = document.getElementById('systemMessageText');

    // ربط الأزرار بفتح المودالات
    if (guestLoginButton) guestLoginButton.addEventListener("click", () => showModal('guestLoginModal'));
    if (registerButton) registerButton.addEventListener("click", () => showModal('registerModal'));
    if (memberLoginButton) memberLoginButton.addEventListener("click", () => showModal('loginModal'));

    // وظيفة وهمية لعرض شروط الاستخدام
    const showRules = () => {
        alert("شروط الاستخدام:\n1. احترم الآخرين.\n2. لا تنشر محتوى غير لائق.\n3. سيتم حذف الحسابات المخالفة.");
        closeAllModals(); // إغلاق أي مودال مفتوح بعد عرض الشروط
    };

    if (termsButton) termsButton.addEventListener("click", showRules);
    if (modalTermsLink) modalTermsLink.addEventListener('click', (e) => { e.preventDefault(); showRules(); });
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("وظيفة استعادة كلمة المرور غير متاحة حالياً. يرجى التواصل مع الدعم الفني.");
    });

    // ربط أزرار الإغلاق في المودالات
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // إغلاق المودال عند النقر خارج المحتوى
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'flex' && event.target === modal) {
                closeAllModals(); // استخدم الدالة الموحدة
            }
        });
    });

    // التحقق عند تحميل الصفحة إذا كان المستخدم مسجل دخولًا بالفعل
    const loggedIn = sessionStorage.getItem('loggedIn');
    const userUid = sessionStorage.getItem('userUid'); 
    
    // إذا كان هناك بيانات تسجيل دخول صالحة، قم بتوجيه المستخدم مباشرة لصفحة الشات
    if (loggedIn === 'true' && userUid) {
        redirectToChatPage();
    }
});