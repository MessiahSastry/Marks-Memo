if (typeof firebase === "undefined") alert("Firebase not loaded!");
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
// Add this block for persistent login
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
function showLoginUI() {
  const loginRoot = document.getElementById('login-root');
  if (!loginRoot) return;
  loginRoot.innerHTML = `
    <div class="login-box">
      <div class="school-title">St. Patrick’s School</div>
      <div class="subtitle">IIT & NEET FOUNDATION</div>
      <input type="email" id="email" placeholder="Email">
      <input type="password" id="password" placeholder="Password">
      <div class="forgot-row">
        <button type="button" onclick="forgotPassword()">Forgot Password?</button>
      </div>
      <button class="btn-email" onclick="emailSignIn()">Sign in with Email</button>
      <button class="btn-register" onclick="emailRegister()">Register (New User)</button>
      <button class="btn-google" onclick="googleSignIn()">
        <i class="fab fa-google" style="margin-right:10px;font-size:1.3em;vertical-align:middle;"></i>
        Sign in with Google
      </button>
    </div>
  `;
}
window.emailSignIn = function () {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return alert('Enter email and password!');
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => alert(err.message));
};
window.emailRegister = function () {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return alert('Enter email and password!');
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Registration successful! You are now signed in.");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
};
window.googleSignIn = function () {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => alert(err.message));
};
window.forgotPassword = function () {
  const email = document.getElementById('email').value.trim();
  if (!email) return alert('Enter your email to reset password.');
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => alert("Password reset email sent."))
    .catch(err => alert(err.message));
};

// ===== Dashboard Auth Check =====
let dashboardInitialized = false;
firebase.auth().onAuthStateChanged(function(user) {
  const path = window.location.pathname;
  const isIndex = path.endsWith('index.html') || path === '/' || path === '' || path.includes('Progress-card-app');
  const isDashboard = path.endsWith('dashboard.html');

  // On index.html (login page)
  if (isIndex) {
  if (user) {
    // User already logged in, go to dashboard
    if (!window.location.pathname.endsWith('dashboard.html')) {
      window.location.replace("dashboard.html");
    }
  } else {
    // User not logged in, show login UI!
    showLoginUI();
  }
}
  // On dashboard.html (main app)
  else if (isDashboard) {
    if (!user) {
      // Not logged in, go back to login
      if (!window.location.pathname.endsWith('index.html')) {
        window.location.replace("index.html");
      }
    } else {
      // User is logged in, initialize dashboard
      if (!dashboardInitialized) {
        dashboardInitialized = true;
        dashboardAppInit();
      }
    }
  }
  // On any other page: do nothing or handle as needed
});
 // Do NOT auto-redirect to dashboard from index.html here (it is handled by the login page logic)
// ==== DASHBOARD LOGIC STARTS HERE ====
console.log('dashboardAppInit started');
function dashboardAppInit() {
  // Global state
  let academicYear = null;
  let yearsList = [];
  let classes = [];
  let colorPalette = [
    "#e74c3c", "#fdc600", "#27ae60", "#2980b9", "#e67e22",
    "#9b59b6", "#f39c12", "#e84393", "#00b894", "#fdc600"
  ];
  let currentClass = null, currentSection = null, currentStudent = null;
  let sectionColors = colorPalette;
  let subjectsByExam = {}; // For Exam Settings
  // DOM refs
  const mainArea = document.getElementById("main-area");
  const fab = document.getElementById("fab");
  const settingsBtn = document.getElementById("settings-btn");
  const headerExam = document.getElementById("header-exam");
 const path = window.location.pathname;
const isDashboard = path.endsWith('dashboard.html');

if (isDashboard) {
  // Dashboard page: skip splash, load immediately
  loadAcademicYears();
} else {
  // Other pages (like login): show splash then load
  showSplashThen(() => {
    showLoginUI();  // replace with your login init function if different
  });
}
function showSplashThen(cb) {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.remove('hidden');
  setTimeout(() => {
    if (splash) splash.classList.add('hidden');
    cb && cb();
  }, 1000);
}
  // == Academic Years ==
 function loadAcademicYears() {
  db.collection('years').orderBy('name', 'desc').get().then(snap => {
    yearsList = [];
    snap.forEach(doc => yearsList.push(doc.id));
    console.log("Years loaded from Firestore:", yearsList);  // <-- ADD THIS LINE
    if (yearsList.length > 0) {
      academicYear = localStorage.getItem('sp_selectedYear') || yearsList[0];
      showDashboard();
    } else {
      showAddYearPopup();
    }
  });
}
  // == Main Dashboard: Classes ==
  function showDashboard() {
    headerExam.textContent = academicYear || '';
    db.collection('years').doc(academicYear).collection('classes').orderBy('order','asc').get()
      .then(snap => {
        classes = [];
        snap.forEach(doc => classes.push({id: doc.id, ...doc.data()}));
        renderClassList();
      });
  }
  function renderClassList() {
    let html = `<div class="screen-title">Select a Class</div>
      <div class="class-list">`;
    const defaultClasses = [
      "Nursery","LKG","UKG","1st","2nd","3rd","4th","5th",
      "6th","7th","8th","9th","10th"
    ];
    let classesToShow = defaultClasses.map((name, i) => {
      let found = classes.find(c => c.name === name);
      return found || {name, id: null, order: i};
    });
    classesToShow.forEach((cls, idx) => {
      let color = colorPalette[idx % colorPalette.length];
      html += `<button class="class-btn" style="border-color:${color};color:${color};"
        onclick="showSections('${cls.id}', '${cls.name}')">${cls.name}</button>`;
    });
    html += "</div>";
    mainArea.innerHTML = html;
    showFAB("Add Class", showAddClassPopup);
    showSettingsBtn("main");
    setScreenTitle("Select a Class");
    setHistory(() => showDashboard());
  }
  window.showSections = function(classId, className) {
    db.collection('years').doc(academicYear).collection('classes').where('name', '==', className).limit(1).get()
      .then(snap => {
        if (snap.empty) {
          alert("Class not found. Please add it first.");
          return;
        }
        let classDoc = snap.docs[0];
        db.collection('years').doc(academicYear).collection('classes').doc(classDoc.id)
          .collection('sections').orderBy('name').get().then(secSnap => {
          let sections = [];
          secSnap.forEach(sec => sections.push({id: sec.id, ...sec.data()}));
          renderSectionList(classDoc.id, className, sections);
        });
      });
  };
  function renderSectionList(classId, className, sections) {
  let html = `<div class="screen-title">${className} (Class Name)</div>
    <div class="section-list">`;
  sections.forEach((sec, idx) => {
    let color = colorPalette[idx % colorPalette.length];
    html += `<div class="section-chip" style="border-color:${color}"
      onclick="showStudents('${classId}','${sec.id}','${className}','${sec.name}')">${sec.name}</div>`;
  });
  html += "</div>";
  mainArea.innerHTML = html;
  showFAB("Add Section", () => showAddSectionPopup(classId, className));
  settingsBtn.style.display = "none";
  setScreenTitle(`${className} - Sections`);
  setHistory(() => renderSectionList(classId, className, sections));
}
 window.showStudents = function(classId, sectionId, className, sectionName) {
    db.collection('years').doc(academicYear).collection('classes').doc(classId)
      .collection('sections').doc(sectionId).collection('students').orderBy('roll').get()
      .then(snap => {
        let students = [];
        snap.forEach(doc => students.push({id: doc.id, ...doc.data()}));
        renderStudentList(classId, sectionId, className, sectionName, students);
      });
  };
  function renderStudentList(classId, sectionId, className, sectionName, students) {
    let html = `<div class="screen-title">${className} – Section ${sectionName}</div>
      <div class="student-list">`;
    students.forEach(stu => {
      html += `<div class="student-row"><span class="roll-no">${stu.roll}.</span> ${stu.name}</div>`;
    });
    html += "</div>";
    mainArea.innerHTML = html;
    showFAB("Add Student", () => showAddStudentPopup(classId, sectionId, className, sectionName));
    showSettingsBtn("section", classId, sectionId, className, sectionName);
    setScreenTitle(`${className} – ${sectionName} - Students`);
    setHistory(() => renderStudentList(classId, sectionId, className, sectionName, students));
  }

  // == Add Popups ==
  function showAddClassPopup() {
    let html = `
      <div class="popup-bg" id="popup-bg">
        <form class="popup" onsubmit="addClassToDB(event)">
          <label>Class Name</label>
          <input name="className" maxlength="12" required placeholder="e.g., 9th">
          <div class="btn-row">
            <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
            <button>Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
  }
  window.addClassToDB = function(e) {
    e.preventDefault();
    const name = e.target.className.value.trim();
    if (!name) return;
    const order = [
      "Nursery","LKG","UKG","1st","2nd","3rd","4th","5th",
      "6th","7th","8th","9th","10th"
    ].indexOf(name);
    db.collection('years').doc(academicYear).collection('classes').add({name, order})
      .then(() => {
        closePopup();
        showDashboard();
      });
  };
  function showAddSectionPopup(classId, className) {
    let html = `
      <div class="popup-bg" id="popup-bg">
        <form class="popup" onsubmit="addSectionToDB(event, '${classId}', '${className}')">
          <label>Section Name</label>
          <input name="sectionName" maxlength="6" required placeholder="e.g., A">
          <div class="btn-row">
            <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
            <button>Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
  }
  window.addSectionToDB = function(e, classId, className) {
    e.preventDefault();
    const name = e.target.sectionName.value.trim();
    if (!name) return;
    db.collection('years').doc(academicYear).collection('classes').doc(classId)
      .collection('sections').add({name})
      .then(() => {
        closePopup();
        window.showSections(classId, className); // reload sections
      });
  };
  function showAddStudentPopup(classId, sectionId, className, sectionName) {
    let html = `
      <div class="popup-bg" id="popup-bg">
        <form class="popup" onsubmit="addStudentToDB(event, '${classId}', '${sectionId}', '${className}', '${sectionName}')">
          <label>Student Name</label>
          <input name="studentName" maxlength="40" required>
          <label>Father's Name</label>
          <input name="fatherName" maxlength="40" required>
          <label>Roll Number</label>
          <input name="rollNo" type="number" min="1" max="999" required>
          <div class="btn-row">
            <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
            <button>Add</button>
          </div>
        </form>
      </div>`;
    showPopup(html);
  }
  window.addStudentToDB = function(e, classId, sectionId, className, sectionName) {
    e.preventDefault();
    const name = e.target.studentName.value.trim();
    const father = e.target.fatherName.value.trim();
    const roll = e.target.rollNo.value.trim();
    if (!name || !father || !roll) return;
    db.collection('years').doc(academicYear).collection('classes').doc(classId)
      .collection('sections').doc(sectionId).collection('students')
      .add({name, father, roll})
      .then(() => {
        closePopup();
        window.showStudents(classId, sectionId, className, sectionName); // reload
      });
  };

  // == Settings Button Logic ==
  function showSettingsBtn(mode, ...args) {
    settingsBtn.onclick = null;
    settingsBtn.style.display = "flex";
    if (mode === "main") {
      settingsBtn.onclick = showMainSettingsPopup;
    } else if (mode === "class" || mode === "section") {
      settingsBtn.onclick = () => showClassActionsPopup(...args);
    }
  }
  function showMainSettingsPopup() {
  let html = `
    <div class="popup" id="popup">
      <div style="font-weight:600;color:#0f3d6b;margin-bottom:12px;font-size:1.08em;">Main Settings</div>
      <div class="option-row" style="flex-direction:column;gap:14px;">
        <button class="option-btn" onclick="showAddYearPopup()">Add Academic Year</button>
        <button class="option-btn" onclick="logout()">Logout</button>
        <button class="option-btn" onclick="closePopup()">Close</button>
      </div>
    </div>
  `;
  // Set BOTH popup and popup-bg innerHTML for closing to work
  document.getElementById('popup').innerHTML = html;
  document.getElementById('popup-bg').classList.remove("hidden");
  document.getElementById('popup').classList.remove("hidden");
}
window.showAddYearPopup = function() {
    let html = `
      <div class="popup-bg" id="popup-bg">
        <form class="popup" onsubmit="addAcademicYear(event)">
          <label>Academic Year</label>
          <input name="yearName" required placeholder="e.g., 2024-25" maxlength="10">
          <div class="btn-row">
            <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
            <button>Add</button>
          </div>
        </form>
      </div>
    `;
    showPopup(html);
  };
  window.addAcademicYear = function(e) {
    e.preventDefault();
    const year = e.target.yearName.value.trim();
    if (!year) return;
    db.collection('years').doc(year).set({name: year})
      .then(() => {
        closePopup();
        academicYear = year;
        localStorage.setItem('sp_selectedYear', year);
        showDashboard();
      });
  };
  window.logout = function() {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  };

  // == Class/Section Actions ==
  function showClassActionsPopup(classId, sectionId, className, sectionName) {
    let html = `
      <div class="popup-bg" id="popup-bg">
        <div class="popup">
          <div style="font-weight:600;color:#0f3d6b;margin-bottom:13px;font-size:1.1em;">
            Class Actions (${className}${sectionName ? " - " + sectionName : ""})
          </div>
          <div class="option-row" style="flex-direction:column;gap:14px;">
            <button class="option-btn" onclick="showExamSettingsPopup()">Exam Settings</button>
            <button class="option-btn" onclick="showEnterMarksPopup()">Enter Marks</button>
            <button class="option-btn" onclick="downloadClassMemos()">Download Class Marks Memos (PDF)</button>
            <button class="option-btn" onclick="downloadHallTickets()">Download Hall Tickets</button>
            <button class="option-btn" onclick="downloadClassExcel()">Download Class Marks (Excel)</button>
            <button class="option-btn" onclick="showPerformanceGraph()">Performance Graph</button>
            <button class="option-btn" onclick="closePopup()">Close</button>
          </div>
        </div>
      </div>
    `;
    showPopup(html);
  }

  // ======= ALL FEATURE LOGIC (PLACEHOLDER for now; you must fill with actual logic as per your templates) =======
  window.showExamSettingsPopup = function() {
    alert("Exam Settings coming soon!");
  }
  window.showEnterMarksPopup = function() {
    alert("Enter Marks coming soon!");
  }
  window.downloadClassMemos = function() {
    alert("Download Class Marks Memos coming soon! (Will use memo.png)");
  }
  window.downloadHallTickets = function() {
    // Uses jsPDF, generates without PNG background
    alert("Download Hall Tickets coming soon! (No PNG background)");
  }
  window.downloadClassExcel = function() {
    alert("Download Class Marks Excel coming soon!");
  }
  window.showPerformanceGraph = function() {
    alert("Performance Graph coming soon!");
  }

  // == Popups ==
  function closePopup() {
    let bg = document.getElementById("popup-bg");
    if (bg) bg.classList.add("hidden");
    let popup = document.getElementById("popup");
    if (popup) popup.classList.add("hidden");
  }
 function showPopup(html) {
  let bg = document.getElementById("popup-bg");
  let popup = document.getElementById("popup");
  if (bg) {
    bg.innerHTML = "";
    bg.classList.remove("hidden");
  }
  if (popup) {
    popup.innerHTML = html;
    popup.classList.remove("hidden");
  }
  // Close popup when clicking the overlay (not the popup)
  if (bg) {
    bg.onclick = function(e) {
      if (e.target === bg) closePopup();
    };
  }
  // Enable Cancel/Close button for dynamically created popups
  if (popup) {
    const cancelBtn = popup.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = function(e) {
        e.preventDefault();
        closePopup();
      }
    }
  }
}
  // == FAB
 function showFAB(label, onClick) {
  fab.innerHTML = ""; 
  fab.onclick = onClick;
  fab.style.display = "flex";
}
  // == Heading for Each Screen ==
  function setScreenTitle(title) {
    document.querySelector(".screen-title").textContent = title;
  }
  // == History Logic (Mobile Back Button): Only one step back
  // == History Logic (Mobile Back Button): Only one step back
let lastViewFn = null;
function setHistory(fn) {
  lastViewFn = fn;
  // Do NOT push state at all to avoid loop
}
window.onpopstate = function() {
  if (lastViewFn) lastViewFn();
};
}
