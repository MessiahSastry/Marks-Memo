if (typeof firebase === "undefined") {
  console.error("Firebase not loaded! Please check your network connection.");
}
// IMPORTANT: Restrict Firebase rules in the Firebase Console to secure the API key
// Example rules:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }
const firebaseConfig = {
  apiKey: "AIzaSyBXCXAB2n2qqF6lIxpX5XYnqBWHClYik14",
  authDomain: "stpatricksprogresscard.firebaseapp.com",
  projectId: "stpatricksprogresscard",
  storageBucket: "stpatricksprogresscard.appspot.com",
  messagingSenderId: "671416933178",
  appId: "1:671416933178:web:4921d57abc6eb11bd2ce03"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Simple XSS sanitization
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

function showLoginUI() {
  const loginRoot = document.getElementById('login-root');
  if (!loginRoot) return;
  loginRoot.innerHTML = `
    <div class="login-box" role="form" aria-label="Login Form">
      <div class="school-title">St. Patrick’s School</div>
      <div class="subtitle">IIT & NEET FOUNDATION</div>
      <input type="email" id="email" placeholder="Email" aria-label="Email">
      <input type="password" id="password" placeholder="Password" aria-label="Password">
      <div class="forgot-row">
        <button type="button" id="forgot-password" aria-label="Forgot Password">Forgot Password?</button>
      </div>
      <button class="btn-email" id="btn-email">Sign in with Email</button>
      <button class="btn-register" id="btn-register">Register (New User)</button>
      <button class="btn-google" id="btn-google">
        <i class="fab fa-google" style="margin-right:10px;font-size:1.3em;vertical-align:middle;"></i>
        Sign in with Google
      </button>
    </div>
  `;
  // Attach event listeners
  document.getElementById('btn-email')?.addEventListener('click', emailSignIn);
  document.getElementById('btn-register')?.addEventListener('click', emailRegister);
  document.getElementById('btn-google')?.addEventListener('click', googleSignIn);
  document.getElementById('forgot-password')?.addEventListener('click', forgotPassword);
}

function emailSignIn() {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value.trim();
  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => alert(`Sign-in failed: ${err.message}`));
}

function emailRegister() {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value.trim();
  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Registration successful! You are now signed in.");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(`Registration failed: ${err.message}`));
}

function googleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => alert(`Google sign-in failed: ${err.message}`));
}

function forgotPassword() {
  const email = document.getElementById('email')?.value.trim();
  if (!email) {
    alert('Please enter your email to reset password.');
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => alert("Password reset email sent."))
    .catch(err => alert(`Password reset failed: ${err.message}`));
}

// Dashboard Auth Check
let dashboardInitialized = false;
auth.onAuthStateChanged(user => {
  const path = window.location.pathname;
  const isIndex = path.endsWith('index.html') || path === '/' || path === '' || path.includes('Progress-card-app');
  const isDashboard = path.endsWith('dashboard.html');

  if (isIndex) {
    if (user) {
      if (!path.endsWith('dashboard.html')) {
        window.location.replace("dashboard.html");
      }
    } else {
      showLoginUI();
      document.getElementById('login-root').style.display = 'flex';
    }
  } else if (isDashboard) {
    if (!user) {
      if (!path.endsWith('index.html')) {
        window.location.replace("index.html");
      }
    } else if (!dashboardInitialized) {
      dashboardInitialized = true;
      dashboardAppInit();
    }
  }
});

function dashboardAppInit() {
  // Encapsulated state
  const state = {
    academicYear: null,
    yearsList: [],
    classes: [],
    colorPalette: ["#e74c3c", "#fdc600", "#27ae60", "#2980b9", "#e67e22", "#9b59b6", "#f39c12", "#e84393", "#00b894", "#fdc600"],
    currentClass: null,
    currentSection: null,
    currentStudent: null,
    sectionColors: null,
    subjectsByExam: {}
  };
  state.sectionColors = state.colorPalette;

  // DOM refs
  const mainArea = document.getElementById("main-area");
  const fab = document.getElementById("fab");
  const settingsBtn = document.getElementById("settings-btn");
  const headerExam = document.getElementById("header-exam");

  if (window.location.pathname.endsWith('dashboard.html')) {
    loadAcademicYears();
  }

  function showSplashThen(cb) {
    const splash = document.getElementById('splash');
    if (!splash) {
      cb && cb();
      return;
    }
    splash.classList.remove('hidden');
    setTimeout(() => {
      splash.classList.add('hidden');
      cb && cb();
    }, 1000);
  }

  function loadAcademicYears() {
    db.collection('years').orderBy('name', 'desc').get()
      .then(snap => {
        state.yearsList = [];
        snap.forEach(doc => state.yearsList.push(doc.id));
        console.log("Years loaded from Firestore:", state.yearsList);
        if (state.yearsList.length > 0) {
          state.academicYear = localStorage.getItem('sp_selectedYear') || state.yearsList[0];
          showDashboard();
        } else {
          showAddYearPopup();
        }
      })
      .catch(err => {
        console.error("Failed to load academic years:", err);
        alert("Failed to load academic years. Please try again.");
      });
  }

  function showDashboard() {
    headerExam.textContent = state.academicYear || '';
    db.collection('years').doc(state.academicYear).collection('classes').orderBy('order', 'asc').get()
      .then(snap => {
        state.classes = [];
        snap.forEach(doc => state.classes.push({ id: doc.id, ...doc.data() }));
        renderClassList();
      })
      .catch(err => {
        console.error("Failed to load classes:", err);
        alert("Failed to load classes. Please try again.");
      });
  }

  function renderClassList() {
    const defaultClasses = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
    const classesToShow = defaultClasses.map((name, i) => {
      const found = state.classes.find(c => c.name === name);
      return found || { name, id: null, order: i };
    });
    let html = `<div class="screen-title">Select a Class</div><div class="class-list">`;
    classesToShow.forEach((cls, idx) => {
      const color = state.colorPalette[idx % state.colorPalette.length];
      html += `<button class="class-btn interactive-hover" style="border-color:${color};color:${color};" data-class-id="${cls.id}" data-class-name="${sanitizeInput(cls.name)}">${sanitizeInput(cls.name)}</button>`;
    });
    html += "</div>";
    mainArea.innerHTML = html;
    showFAB("Add Class", showAddClassPopup);
    showSettingsBtn("main");
    setScreenTitle("Select a Class");
    setHistory(() => showDashboard());
    document.querySelectorAll('.class-btn').forEach(btn => {
      btn.addEventListener('click', () => showSections(btn.dataset.classId, btn.dataset.className));
    });
  }

  function showSections(classId, className) {
    db.collection('years').doc(state.academicYear).collection('classes').where('name', '==', className).limit(1).get()
      .then(snap => {
        if (snap.empty) {
          alert("Class not found. Please add it first.");
          return;
        }
        const classDoc = snap.docs[0];
        db.collection('years').doc(state.academicYear).collection('classes').doc(classDoc.id)
          .collection('sections').orderBy('name').get()
          .then(secSnap => {
            const sections = [];
            secSnap.forEach(sec => sections.push({ id: sec.id, ...sec.data() }));
            renderSectionList(classDoc.id, className, sections);
          })
          .catch(err => {
            console.error("Failed to load sections:", err);
            alert("Failed to load sections. Please try again.");
          });
      });
  }

  function renderSectionList(classId, className, sections) {
    let html = `<div class="screen-title">${sanitizeInput(className)} (Class Name)</div><div class="section-list">`;
    sections.forEach((sec, idx) => {
      const color = state.colorPalette[idx % state.colorPalette.length];
      html += `<div class="section-chip interactive-hover" style="border-color:${color}" data-class-id="${classId}" data-section-id="${sec.id}" data-class-name="${sanitizeInput(className)}" data-section-name="${sanitizeInput(sec.name)}">${sanitizeInput(sec.name)}</div>`;
    });
    html += "</div>";
    mainArea.innerHTML = html;
    showFAB("Add Section", () => showAddSectionPopup(classId, className));
    settingsBtn.style.display = "none";
    setScreenTitle(`${sanitizeInput(className)} - Sections`);
    setHistory(() => renderSectionList(classId, className, sections));
    document.querySelectorAll('.section-chip').forEach(chip => {
      chip.addEventListener('click', () => showStudents(chip.dataset.classId, chip.dataset.sectionId, chip.dataset.className, chip.dataset.sectionName));
    });
  }

  function showStudents(classId, sectionId, className, sectionName) {
    db.collection('years').doc(state.academicYear).collection('classes').doc(classId)
      .collection('sections').doc(sectionId).collection('students').orderBy('roll').get()
      .then(snap => {
        const students = [];
        snap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
        renderStudentList(classId, sectionId, className, sectionName, students);
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        alert("Failed to load students. Please try again.");
      });
  }

  function renderStudentList(classId, sectionId, className, sectionName, students) {
    let html = `<div class="screen-title">${sanitizeInput(className)} – Section ${sanitizeInput(sectionName)}</div><div class="student-list">`;
    students.forEach(stu => {
      html += `<div class="student-row"><span class="roll-no">${sanitizeInput(stu.roll)}.</span> ${sanitizeInput(stu.name)}</div>`;
    });
    html += "</div>";
    mainArea.innerHTML = html;
    showFAB("Add Student", () => showAddStudentPopup(classId, sectionId, className, sectionName));
    showSettingsBtn("section", classId, sectionId, className, sectionName);
    setScreenTitle(`${sanitizeInput(className)} – ${sanitizeInput(sectionName)} - Students`);
    setHistory(() => renderStudentList(classId, sectionId, className, sectionName, students));
  }

  function showAddClassPopup() {
    const html = `
      <div class="popup-bg" id="popup-bg" role="dialog" aria-modal="true">
        <form class="popup" id="add-class-form" aria-label="Add Class Form">
          <label for="className">Class Name</label>
          <input id="className" name="className" maxlength="12" required placeholder="e.g., 9th">
          <div class="btn-row">
            <button type="button" class="cancel-btn" aria-label="Cancel">Cancel</button>
            <button type="submit" class="action-btn">Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
    document.getElementById('add-class-form').addEventListener('submit', addClassToDB);
  }

  function addClassToDB(e) {
    e.preventDefault();
    const name = e.target.className.value.trim();
    if (!name) return;
    const order = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].indexOf(name);
    db.collection('years').doc(state.academicYear).collection('classes').add({ name, order })
      .then(() => {
        closePopup();
        showDashboard();
      })
      .catch(err => {
        console.error("Failed to add class:", err);
        alert("Failed to add class. Please try again.");
      });
  }

  function showAddSectionPopup(classId, className) {
    const html = `
      <div class="popup-bg" id="popup-bg" role="dialog" aria-modal="true">
        <form class="popup" id="add-section-form" aria-label="Add Section Form">
          <label for="sectionName">Section Name</label>
          <input id="sectionName" name="sectionName" maxlength="6" required placeholder="e.g., A">
          <div class="btn-row">
            <button type="button" class="cancel-btn" aria-label="Cancel">Cancel</button>
            <button type="submit" class="action-btn">Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
    document.getElementById('add-section-form').addEventListener('submit', e => addSectionToDB(e, classId, className));
  }

  function addSectionToDB(e, classId, className) {
    e.preventDefault();
    const name = e.target.sectionName.value.trim();
    if (!name) return;
    db.collection('years').doc(state.academicYear).collection('classes').doc(classId)
      .collection('sections').add({ name })
      .then(() => {
        closePopup();
        showSections(classId, className);
      })
      .catch(err => {
        console.error("Failed to add section:", err);
        alert("Failed to add section. Please try again.");
      });
  }

  function showAddStudentPopup(classId, sectionId, className, sectionName) {
    const html = `
      <div class="popup-bg" id="popup-bg" role="dialog" aria-modal="true">
        <form class="popup" id="add-student-form" aria-label="Add Student Form">
          <label for="studentName">Student Name</label>
          <input id="studentName" name="studentName" maxlength="40" required>
          <label for="fatherName">Father's Name</label>
          <input id="fatherName" name="fatherName" maxlength="40" required>
          <label for="rollNo">Roll Number</label>
          <input id="rollNo" name="rollNo" type="number" min="1" max="999" required>
          <div class="btn-row">
            <button type="button" class="cancel-btn" aria-label="Cancel">Cancel</button>
            <button type="submit" class="action-btn">Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
    document.getElementById('add-student-form').addEventListener('submit', e => addStudentToDB(e, classId, sectionId, className, sectionName));
  }

  function addStudentToDB(e, classId, sectionId, className, sectionName) {
    e.preventDefault();
    const name = e.target.studentName.value.trim();
    const father = e.target.fatherName.value.trim();
    const roll = e.target.rollNo.value.trim();
    if (!name || !father || !roll) return;
    db.collection('years').doc(state.academicYear).collection('classes').doc(classId)
      .collection('sections').doc(sectionId).collection('students')
      .add({ name, father, roll })
      .then(() => {
        closePopup();
        showStudents(classId, sectionId, className, sectionName);
      })
      .catch(err => {
        console.error("Failed to add student:", err);
        alert("Failed to add student. Please try again.");
      });
  }

  function showSettingsBtn(mode, ...args) {
    settingsBtn.onclick = null;
    settingsBtn.style.display = "flex";
    if (mode === "main") {
      settingsBtn.onclick = showMainSettingsPopup;
    } else if (mode === "section") {
      settingsBtn.onclick = () => showClassActionsPopup(...args);
    }
  }

  function showMainSettingsPopup() {
    const html = `
      <div class="popup" id="popup" role="dialog" aria-modal="true">
        <div class="popup-title">Main Settings</div>
        <div class="option-row">
          <button class="option-btn" id="add-year-btn">Add Academic Year</button>
          <button class="option-btn" id="logout-btn">Logout</button>
          <button class="option-btn" id="close-popup-btn">Close</button>
        </div>
      </div>`;
    showPopup(html);
    document.getElementById('add-year-btn').addEventListener('click', showAddYearPopup);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('close-popup-btn').addEventListener('click', closePopup);
  }

  function showAddYearPopup() {
    const html = `
      <div class="popup-bg" id="popup-bg" role="dialog" aria-modal="true">
        <form class="popup" id="add-year-form" aria-label="Add Academic Year Form">
          <label for="yearName">Academic Year</label>
          <input id="yearName" name="yearName" required placeholder="e.g., 2024-25" maxlength="10">
          <div class="btn-row">
            <button type="button" class="cancel-btn" aria-label="Cancel">Cancel</button>
            <button type="submit" class="action-btn">Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
    document.getElementById('add-year-form').addEventListener('submit', addAcademicYear);
  }

  function addAcademicYear(e) {
    e.preventDefault();
    const year = e.target.yearName.value.trim();
    if (!year) return;
    db.collection('years').doc(year).set({ name: year })
      .then(() => {
        closePopup();
        state.academicYear = year;
        localStorage.setItem('sp_selectedYear', year);
        showDashboard();
      })
      .catch(err => {
        console.error("Failed to add academic year:", err);
        alert("Failed to add academic year. Please try again.");
      });
  }

  function logout() {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    }).catch(err => {
      console.error("Logout failed:", err);
      alert("Logout failed. Please try again.");
    });
  }

  function showClassActionsPopup(classId, sectionId, className, sectionName) {
    const html = `
      <div class="popup-bg" id="popup-bg" role="dialog" aria-modal="true">
        <div class="popup">
          <div class="popup-title">Class Actions (${sanitizeInput(className)}${sectionName ? " - " + sanitizeInput(sectionName) : ""})</div>
          <div class="option-row">
            <button class="option-btn" id="exam-settings-btn">Exam Settings</button>
            <button class="option-btn" id="enter-marks-btn">Enter Marks</button>
            <button class="option-btn" id="download-memos-btn">Download Class Marks Memos (PDF)</button>
            <button class="option-btn" id="download-hall-tickets-btn">Download Hall Tickets</button>
            <button class="option-btn" id="download-excel-btn">Download Class Marks (Excel)</button>
            <button class="option-btn" id="performance-graph-btn">Performance Graph</button>
            <button class="option-btn" id="close-popup-btn">Close</button>
          </div>
        </div>
      </div>`;
    showPopup(html);
    document.getElementById('exam-settings-btn').addEventListener('click', showExamSettingsPopup);
    document.getElementById('enter-marks-btn').addEventListener('click', showEnterMarksPopup);
    document.getElementById('download-memos-btn').addEventListener('click', downloadClassMemos);
    document.getElementById('download-hall-tickets-btn').addEventListener('click', downloadHallTickets);
    document.getElementById('download-excel-btn').addEventListener('click', downloadClassExcel);
    document.getElementById('performance-graph-btn').addEventListener('click', showPerformanceGraph);
    document.getElementById('close-popup-btn').addEventListener('click', closePopup);
  }

  // Placeholder functions (implement as needed)
  function showExamSettingsPopup() {
    alert("Exam Settings coming soon! Implement logic to configure exam settings.");
  }
  function showEnterMarksPopup() {
    alert("Enter Marks coming soon! Implement logic to enter student marks.");
  }
  function downloadClassMemos() {
    alert("Download Class Marks Memos coming soon! Implement logic using jsPDF and memo.png.");
  }
  function downloadHallTickets() {
    alert("Download Hall Tickets coming soon! Implement logic using jsPDF without PNGDroid background.");
  }
  function downloadClassExcel() {
    alert("Download Class Marks Excel coming soon! Implement logic using XLSX library.");
  }
  function showPerformanceGraph() {
    alert("Performance Graph coming soon! Implement logic to display performance charts.");
  }

  function closePopup() {
    const bg = document.getElementById("popup-bg");
    const popup = document.getElementById("popup");
    if (bg) bg.classList.add("hidden");
    if (popup) popup.classList.add("hidden");
  }

  function showPopup(html) {
    const bg = document.getElementById("popup-bg");
    const popup = document.getElementById("popup");
    if (bg) {
      bg.innerHTML = "";
      bg.classList.remove("hidden");
      bg.setAttribute('aria-hidden', 'false');
    }
    if (popup) {
      popup.innerHTML = html;
      popup.classList.remove("hidden");
      popup.setAttribute('aria-hidden', 'false');
    }
    if (bg) {
      bg.onclick = e => {
        if (e.target === bg) closePopup();
      };
    }
  }

  function showFAB(label, onClick) {
    fab.innerHTML = `<i class="fas fa-plus"></i>`;
    fab.setAttribute('aria-label', label);
    fab.onclick = onClick;
    fab.style.display = "flex";
  }

  function setScreenTitle(title) {
    const titleEl = document.querySelector(".screen-title");
    if (titleEl) titleEl.textContent = sanitizeInput(title);
  }

  let lastViewFn = null;
  function setHistory(fn) {
    lastViewFn = fn;
    history.pushState({ view: fn.name }, '', window.location.href);
  }

  window.onpopstate = function(event) {
    if (lastViewFn) lastViewFn();
  };
}

// Recommendation: Migrate to modular Firebase SDK for better performance
// Example: import { initializeApp } from 'firebase/app';