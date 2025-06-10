// --- إضافة في أعلى الملف للتحقق التلقائي من تسجيل الدخول ---
// يجب أن يكون هذا الكود أول شيء يُنفذ بعد استيراد firebaseInit.js
import { auth, db } from "./firebaseInit.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously,
    fetchSignInMethodsForEmail,
    onAuthStateChanged // استيراد onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ثابت لعنوان صفحة الشات
const CHAT_PAGE_URL = 'chat.html';

// --- التحقق التلقائي من تسجيل الدخول مع كل زيارة للصفحة ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = CHAT_PAGE_URL;
    }
    // إذا لم يكن مسجل دخول، يبقى في صفحة التسجيل كالعادة
});
// --- نهاية الإضافة ---

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
    setTimeout(() => {
        systemMessageContainer.classList.add('show');
    }, 10); // تأخير بسيط جدًا للسماح للمتصفح بإعادة حساب التخطيط

    // إخفاء الرسالة بعد مدة معينة إذا كانت المدة أكبر من 0
    if (duration > 0) {
        setTimeout(() => {
            systemMessageContainer.classList.remove('show'); // إزالة كلاس show لتطبيق تأثير الإخفاء
            setTimeout(() => {
                systemMessageContainer.style.display = 'none';
            }, 300); // يجب أن تتطابق هذه المدة مع مدة transition في CSS (0.3s)
        }, duration);
    } else if (duration === 0) {
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

// دالة توجيه المستخدم لصفحة الشات (تستخدم في أماكن أخرى)
function redirectToChatPage() {
    window.location.href = CHAT_PAGE_URL;
}

// دالة لحفظ بيانات المستخدم في sessionStorage (مسموح بها لوظائف إضافية غير المصادقة)
function saveUserDataToSession(uid, username, photoURL, userType) {
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('userUid', uid);
    sessionStorage.setItem('userUsername', username);
    sessionStorage.setItem('userPhotoURL', photoURL);
    sessionStorage.setItem('userType', userType);
}

// دالة لجلب بيانات المستخدم من Firestore
async function fetchAndSaveUserData(uid) {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
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
    displaySystemMessage('جاري تسجيل الدخول...', 'info', 0);
    const username = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا غير موجود.', 'error');
            return;
        }

        const userData = querySnapshot.docs[0].data();
        const email = userData.email;

        if (!email) {
            displaySystemMessage('خطأ: لا يوجد بريد إلكتروني مرتبط بهذا الحساب.', 'error');
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (await fetchAndSaveUserData(user.uid)) {
            displaySystemMessage('تم تسجيل الدخول بنجاح!', 'success', 500);
            closeAllModals();
            redirectToChatPage();
        } else {
            displaySystemMessage('حدث خطأ: لا يمكن العثور على بيانات المستخدم. يرجى الاتصال بالدعم.', 'error');
            auth.signOut();
        }
    } catch (error) {
        let errorMessage = "حدث خطأ غير معروف في تسجيل الدخول.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "صيغة البريد الإلكتروني (المستخدم داخليًا) غير صحيحة.";
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
    displaySystemMessage('جاري إنشاء الحساب...', 'info', 0);
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const age = document.getElementById('registerAge').value;
    const gender = document.getElementById('registerGender').value;

    if (password.length < 6) {
        displaySystemMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error');
        return;
    }
    if (!age) {
        displaySystemMessage('الرجاء اختيار العمر.', 'error');
        return;
    }
    if (!gender) {
        displaySystemMessage('الرجاء اختيار الجنس.', 'error');
        return;
    }

    const uniqueSuffix = Date.now();
    const autoGeneratedEmail = `${username.toLowerCase().replace(/\s/g, '')}${uniqueSuffix}@chatnameapp.com`;

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا موجود بالفعل. يرجى اختيار اسم آخر.', 'error');
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, autoGeneratedEmail, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: username,
            email: autoGeneratedEmail,
            photoURL: 'default_images/user.png',
            userType: 'عضو',
            age: parseInt(age),
            gender: gender,
            createdAt: serverTimestamp()
        });

        saveUserDataToSession(user.uid, username, 'default_images/user.png', 'عضو');
        displaySystemMessage('تم إنشاء الحساب بنجاح!', 'success', 500);
        closeAllModals();
        redirectToChatPage();
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
    displaySystemMessage('جاري الدخول كزائر...', 'info', 0);
    const guestUsername = document.getElementById('guestUsername').value.trim();
    const guestAge = document.getElementById('guestAge').value;
    const guestGender = document.getElementById('guestGender').value;

    if (!guestUsername) {
        displaySystemMessage('الرجاء إدخال اسم الزائر.', 'error');
        return;
    }
    if (!guestAge) {
        displaySystemMessage('الرجاء اختيار العمر للزائر.', 'error');
        return;
    }
    if (!guestGender) {
        displaySystemMessage('الرجاء اختيار الجنس للزائر.', 'error');
        return;
    }

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', guestUsername), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            displaySystemMessage('اسم المستخدم هذا محجوز بالفعل (عضو أو زائر سابق). يرجى اختيار اسم آخر.', 'error');
            return;
        }

        const userCredential = await signInAnonymously(auth);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            username: guestUsername,
            photoURL: 'default_images/guest.png',
            userType: 'زائر',
            age: parseInt(guestAge),
            gender: guestGender,
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
    const termsButton = document.getElementById('termsButton');
    const modalTermsLink = document.getElementById('modalTermsLink');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    systemMessageContainer = document.getElementById('systemMessageContainer');
    systemMessageText = document.getElementById('systemMessageText');

    if (guestLoginButton) guestLoginButton.addEventListener("click", () => showModal('guestLoginModal'));
    if (registerButton) registerButton.addEventListener("click", () => showModal('registerModal'));
    if (memberLoginButton) memberLoginButton.addEventListener("click", () => showModal('loginModal'));

    const showRules = () => {
        alert("شروط الاستخدام:\n1. احترم الآخرين.\n2. لا تنشر محتوى غير لائق.\n3. سيتم حذف الحسابات المخالفة.");
        closeAllModals();
    };

    if (termsButton) termsButton.addEventListener("click", showRules);
    if (modalTermsLink) modalTermsLink.addEventListener('click', (e) => { e.preventDefault(); showRules(); });
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("وظيفة استعادة كلمة المرور غير متاحة حالياً. يرجى التواصل مع الدعم الفني.");
    });

    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'flex' && event.target === modal) {
                closeAllModals();
            }
        });
    });

    // *** تم حذف التحقق القديم من sessionStorage نهائيًا ***
    // لا حاجة لفحص sessionStorage لتوجيه المستخدم، أصبح التحقق عن طريق onAuthStateChanged فقط
});
