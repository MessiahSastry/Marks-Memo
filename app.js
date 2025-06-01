// Check if Firebase is loaded (basic sanity check)
if (typeof firebase === "undefined") {
    console.error("Firebase not loaded! Please check your script includes.");
    // Fallback to a simple alert if custom message system isn't ready
    alert("Firebase not loaded! Application cannot function.");
}

// Firebase configuration (replace with your actual config if different)
const firebaseConfig = {
    apiKey: "AIzaSyBXCXAB2n2qqF6lIxpX5XYnqBWHClYik14",
    authDomain: "stpatricksprogresscard.firebaseapp.com",
    projectId: "stpatricksprogresscard",
    storageBucket: "stpatricksprogresscard.appspot.com",
    messagingSenderId: "671416933178",
    appId: "1:671416933178:web:4921d57abc6eb11bd2ce03"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set Firebase Auth Persistence to LOCAL for persistent login sessions
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// --- Custom Message Popup Functions (replaces alert()) ---
/**
 * Displays a custom message popup.
 * @param {string} title - The title of the message.
 * @param {string} message - The content of the message.
 */
function showMessage(title, message) {
    const msgPopupBg = document.getElementById('message-popup-bg');
    const msgPopup = document.getElementById('message-popup');
    const msgPopupTitle = document.getElementById('message-popup-title');
    const msgPopupContent = document.getElementById('message-popup-content');

    if (msgPopupBg && msgPopup && msgPopupTitle && msgPopupContent) {
        msgPopupTitle.textContent = title;
        msgPopupContent.textContent = message;
        msgPopupBg.classList.remove('hidden');
        msgPopup.classList.remove('hidden');
    } else {
        // Fallback to console log if elements are not found
        console.error("Message popup elements not found. Title:", title, "Message:", message);
        // Fallback to browser alert if absolutely necessary, but avoid in production
        // alert(`${title}\n\n${message}`);
    }
}

/**
 * Closes the custom message popup.
 */
// Made global by attaching to window, but also ensuring it's called after DOM is ready
window.closeMessagePopup = function() {
    const msgPopupBg = document.getElementById('message-popup-bg');
    const msgPopup = document.getElementById('message-popup');
    if (msgPopupBg) msgPopupBg.classList.add('hidden');
    if (msgPopup) msgPopup.classList.add('hidden');
};

// Add event listener for the message popup's OK button
document.addEventListener('DOMContentLoaded', () => {
    const messagePopupOkBtn = document.getElementById('message-popup-ok-btn');
    if (messagePopupOkBtn) {
        messagePopupOkBtn.addEventListener('click', window.closeMessagePopup);
    }
});


// --- Splash Screen Logic ---
/**
 * Shows the splash screen, then executes a callback after a delay.
 * @param {function} cb - Callback function to execute after splash screen hides.
 */
function showSplashThen(cb) {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.classList.remove('hidden'); // Ensure splash is visible
        setTimeout(() => {
            splash.classList.add('hidden'); // Hide splash after delay
            cb && cb(); // Execute callback
        }, 1000); // 1 second delay
    } else {
        console.warn("Splash element not found.");
        cb && cb(); // Execute callback immediately if splash not found
    }
}

// --- Login UI Functions ---
/**
 * Renders the login UI into the login-root element.
 */
function showLoginUI() {
    const loginRoot = document.getElementById('login-root');
    if (!loginRoot) {
        console.error("Login root element not found.");
        return;
    }
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
    loginRoot.classList.remove('hidden'); // Show the login UI
}

/**
 * Handles email/password sign-in.
 */
window.emailSignIn = async function () {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!email || !password) {
        showMessage('Error', 'Please enter both email and password!');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = "dashboard.html"; // Redirect on success
    } catch (err) {
        console.error("Email Sign-in Error:", err);
        showMessage('Sign-in Failed', err.message);
    }
};

/**
 * Handles email/password registration for new users.
 */
window.emailRegister = async function () {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!email || !password) {
        showMessage('Error', 'Please enter both email and password!');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        showMessage("Registration Successful", "You are now signed in.");
        window.location.href = "dashboard.html"; // Redirect on success
    } catch (err) {
        console.error("Email Registration Error:", err);
        showMessage('Registration Failed', err.message);
    }
};

/**
 * Handles Google Sign-in using a popup.
 */
window.googleSignIn = async function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        window.location.href = "dashboard.html"; // Redirect on success
    } catch (err) {
        console.error("Google Sign-in Error:", err);
        showMessage('Google Sign-in Failed', err.message);
    }
};

/**
 * Handles password reset for a given email.
 */
window.forgotPassword = async function () {
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showMessage('Forgot Password', 'Please enter your email to reset password.');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        showMessage("Password Reset", "Password reset email sent. Check your inbox.");
    } catch (err) {
        console.error("Password Reset Error:", err);
        showMessage('Password Reset Failed', err.message);
    }
};

// ===== Authentication State Change Listener (Main Router) =====
let dashboardInitialized = false; // Flag to ensure dashboard init runs only once
auth.onAuthStateChanged(function(user) {
    const path = window.location.pathname;
    const isIndex = path.endsWith('index.html') || path === '/' || path === '' || path.includes('Progress-card-app');
    const isDashboard = path.endsWith('dashboard.html');

    // Logic for index.html (Login Page)
    if (isIndex) {
        if (user) {
            // User is logged in, redirect to dashboard
            if (!isDashboard) { // Prevent infinite loop if already on dashboard.html
                window.location.replace("/Progress-card-app/dashboard.html");
            }
        } else {
            // User is not logged in, show login UI after splash
            showSplashThen(showLoginUI);
        }
    }
    // Logic for dashboard.html (Main Application Page)
    else if (isDashboard) {
        if (!user) {
            // User is not logged in, redirect to index.html
            if (!isIndex) { // Prevent infinite loop if already on index.html
                window.location.replace("index.html");
            }
        } else {
            // User is logged in, initialize dashboard
            if (!dashboardInitialized) {
                dashboardInitialized = true;
                dashboardAppInit(); // Call dashboard initialization
            }
        }
    }
    // For any other page, do nothing or add specific handling
});

// ==== DASHBOARD LOGIC STARTS HERE ====
// This function is called ONLY when the user is authenticated and on dashboard.html
function dashboardAppInit() {
    console.log('dashboardAppInit started'); // Confirm dashboard init starts

    // Global state variables for the dashboard
    let academicYear = null;
    let yearsList = [];
    let classes = [];
    // A palette of colors for UI elements like class/section buttons
    let colorPalette = [
        "#e74c3c", "#fdc600", "#27ae60", "#2980b9", "#e67e22",
        "#9b59b6", "#f39c12", "#e84393", "#00b894", "#fdc600"
    ];
    let currentClass = null, currentSection = null, currentStudent = null;
    let sectionColors = colorPalette; // Reusing color palette for sections
    let subjectsByExam = {}; // Stores exam settings (e.g., subjects for each exam)

    // DOM references for main dashboard elements
    const mainArea = document.getElementById("main-area");
    const fab = document.getElementById("fab");
    const settingsBtn = document.getElementById("settings-btn");
    const headerExam = document.getElementById("header-exam");
    const popupBg = document.getElementById("popup-bg"); // Generic popup background
    const popup = document.getElementById("popup");     // Generic popup content area

    // --- Initial Dashboard Load ---
    // Directly load academic years as dashboardAppInit is only called on dashboard.html
    loadAcademicYears();

    // --- Academic Years Management ---
    /**
     * Loads academic years from Firestore and initializes the dashboard view.
     */
    function loadAcademicYears() {
        console.log("Attempting to load academic years...");
        db.collection('years').orderBy('name', 'desc').get()
            .then(snap => {
                yearsList = [];
                snap.forEach(doc => yearsList.push(doc.id)); // Store year IDs
                console.log("Years loaded from Firestore:", yearsList);

                if (yearsList.length > 0) {
                    // Set current academic year from localStorage or default to the latest
                    academicYear = localStorage.getItem('sp_selectedYear') || yearsList[0];
                    console.log("Selected academic year:", academicYear);
                    showDashboard(); // Proceed to show the main dashboard (classes)
                } else {
                    // No academic years found, prompt user to add one
                    console.log("No academic years found. Showing add year popup.");
                    showMessage("No Academic Years", "Please add an academic year to get started.");
                    showAddYearPopup(); // Show the form to add a new year
                }
            })
            .catch(error => {
                console.error("Error loading academic years:", error);
                showMessage("Error", "Failed to load academic years: " + error.message);
            });
    }

    // --- Main Dashboard View: Classes ---
    /**
     * Displays the main dashboard, showing the list of classes for the current academic year.
     */
    function showDashboard() {
        headerExam.textContent = academicYear || ''; // Update header with academic year
        console.log("Showing dashboard for academic year:", academicYear);
        db.collection('years').doc(academicYear).collection('classes').orderBy('order', 'asc').get()
            .then(snap => {
                classes = [];
                snap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
                console.log("Classes loaded:", classes);
                renderClassList(); // Render the list of classes
            })
            .catch(error => {
                console.error("Error loading classes:", error);
                showMessage("Error", "Failed to load classes: " + error.message);
            });
    }

    /**
     * Renders the list of classes onto the main content area.
     */
    function renderClassList() {
        let html = `<div class="screen-title">Select a Class</div>
            <div class="class-list">`;
        const defaultClasses = [ // Standard classes for display order
            "Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th",
            "6th", "7th", "8th", "9th", "10th"
        ];
        let classesToShow = defaultClasses.map((name, i) => {
            let found = classes.find(c => c.name === name);
            return found || { name, id: null, order: i }; // Use existing class or a placeholder
        });

        classesToShow.forEach((cls, idx) => {
            let color = colorPalette[idx % colorPalette.length]; // Cycle through colors
            // Only make button clickable if class exists in DB (has an ID)
            const onClickHandler = cls.id ? `showSections('${cls.id}', '${cls.name}')` : `showMessage('Class Not Added', 'This class has not been added yet. Please add it via the "Add Class" button.')`;
            html += `<button class="class-btn" style="border-color:${color};color:${color};"
                onclick="${onClickHandler}">${cls.name}</button>`;
        });
        html += "</div>";
        mainArea.innerHTML = html; // Update main content area
        showFAB("Add Class", showAddClassPopup); // Show FAB for adding classes
        showSettingsBtn("main"); // Show main settings button
        setScreenTitle("Select a Class");
        setHistory(() => showDashboard()); // Set history for back navigation
    }

    // --- Section View ---
    /**
     * Displays sections for a selected class.
     * @param {string} classId - Firestore ID of the selected class.
     * @param {string} className - Name of the selected class.
     */
    window.showSections = async function(classId, className) {
        console.log(`Showing sections for Class: ${className} (ID: ${classId})`);
        try {
            // Verify class exists (already done in renderClassList, but good for direct calls)
            const classDocRef = db.collection('years').doc(academicYear).collection('classes').doc(classId);
            const classDoc = await classDocRef.get();
            if (!classDoc.exists) {
                showMessage("Class Not Found", "The selected class does not exist.");
                showDashboard(); // Go back to class list
                return;
            }

            const secSnap = await classDocRef.collection('sections').orderBy('name').get();
            let sections = [];
            secSnap.forEach(sec => sections.push({ id: sec.id, ...sec.data() }));
            renderSectionList(classId, className, sections); // Render the list of sections
        } catch (error) {
            console.error("Error loading sections:", error);
            showMessage("Error", "Failed to load sections: " + error.message);
        }
    };

    /**
     * Renders the list of sections for a given class.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} className - Name of the class.
     * @param {Array<Object>} sections - Array of section objects.
     */
    function renderSectionList(classId, className, sections) {
        let html = `<div class="screen-title">${className} - Sections</div>
            <div class="section-list">`;
        sections.forEach((sec, idx) => {
            let color = colorPalette[idx % colorPalette.length]; // Cycle through colors
            html += `<div class="section-chip" style="border-left-color:${color}"
                onclick="showStudents('${classId}','${sec.id}','${className}','${sec.name}')">${sec.name}</div>`;
        });
        html += "</div>";
        mainArea.innerHTML = html;
        showFAB("Add Section", () => showAddSectionPopup(classId, className)); // FAB for adding sections
        settingsBtn.style.display = "none"; // Hide settings button on section view for now
        setScreenTitle(`${className} - Sections`);
        setHistory(() => renderSectionList(classId, className, sections)); // Set history
    }

    // --- Student View ---
    /**
     * Displays students for a selected section.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} sectionId - Firestore ID of the section.
     * @param {string} className - Name of the class.
     * @param {string} sectionName - Name of the section.
     */
    window.showStudents = async function(classId, sectionId, className, sectionName) {
        console.log(`Showing students for Class: ${className}, Section: ${sectionName}`);
        try {
            const snap = await db.collection('years').doc(academicYear).collection('classes').doc(classId)
                .collection('sections').doc(sectionId).collection('students').orderBy('roll').get();
            let students = [];
            snap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
            renderStudentList(classId, sectionId, className, sectionName, students); // Render student list
        } catch (error) {
            console.error("Error loading students:", error);
            showMessage("Error", "Failed to load students: " + error.message);
        }
    };

    /**
     * Renders the list of students for a given section.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} sectionId - Firestore ID of the section.
     * @param {string} className - Name of the class.
     * @param {string} sectionName - Name of the section.
     * @param {Array<Object>} students - Array of student objects.
     */
    function renderStudentList(classId, sectionId, className, sectionName, students) {
        let html = `<div class="screen-title">${className} – Section ${sectionName}</div>
            <div class="student-list">`;
        if (students.length === 0) {
            html += `<p style="text-align:center; margin-top:20px; color:#555;">No students found in this section. Add one!</p>`;
        }
        students.forEach(stu => {
            html += `<div class="student-row"><span class="roll-no">${stu.roll}.</span> ${stu.name}</div>`;
        });
        html += "</div>";
        mainArea.innerHTML = html;
        showFAB("Add Student", () => showAddStudentPopup(classId, sectionId, className, sectionName)); // FAB for adding students
        showSettingsBtn("section", classId, sectionId, className, sectionName); // Show settings for class/section
        setScreenTitle(`${className} – ${sectionName} - Students`);
        setHistory(() => renderStudentList(classId, sectionId, className, sectionName, students)); // Set history
    }

    // --- Add Popups (Forms) ---
    /**
     * Displays a popup form to add a new class.
     */
    function showAddClassPopup() {
        let html = `
            <form class="popup-content" onsubmit="addClassToDB(event)">
                <label>Class Name</label>
                <input name="className" maxlength="12" required placeholder="e.g., 9th">
                <div class="btn-row">
                    <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
                    <button type="submit">Add</button>
                </div>
            </form>`;
        showPopup(html);
    }

    /**
     * Adds a new class to Firestore.
     * @param {Event} e - The submit event.
     */
    window.addClassToDB = async function(e) {
        e.preventDefault();
        const name = e.target.className.value.trim();
        if (!name) return;

        const order = [ // Define order for common classes
            "Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th",
            "6th", "7th", "8th", "9th", "10th"
        ].indexOf(name); // Get order, -1 if not in list

        try {
            await db.collection('years').doc(academicYear).collection('classes').add({ name, order });
            closePopup();
            showDashboard(); // Refresh dashboard to show new class
            showMessage("Success", `Class '${name}' added successfully.`);
        } catch (error) {
            console.error("Error adding class:", error);
            showMessage("Error", "Failed to add class: " + error.message);
        }
    };

    /**
     * Displays a popup form to add a new section to a class.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} className - Name of the class.
     */
    function showAddSectionPopup(classId, className) {
        let html = `
            <form class="popup-content" onsubmit="addSectionToDB(event, '${classId}', '${className}')">
                <label>Section Name</label>
                <input name="sectionName" maxlength="6" required placeholder="e.g., A">
                <div class="btn-row">
                    <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
                    <button type="submit">Add</button>
                </div>
            </form>`;
        showPopup(html);
    }

    /**
     * Adds a new section to a class in Firestore.
     * @param {Event} e - The submit event.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} className - Name of the class.
     */
    window.addSectionToDB = async function(e, classId, className) {
        e.preventDefault();
        const name = e.target.sectionName.value.trim();
        if (!name) return;

        try {
            await db.collection('years').doc(academicYear).collection('classes').doc(classId)
                .collection('sections').add({ name });
            closePopup();
            window.showSections(classId, className); // Reload sections for the current class
            showMessage("Success", `Section '${name}' added to ${className}.`);
        } catch (error) {
            console.error("Error adding section:", error);
            showMessage("Error", "Failed to add section: " + error.message);
        }
    };

    /**
     * Displays a popup form to add a new student to a section.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} sectionId - Firestore ID of the section.
     * @param {string} className - Name of the class.
     * @param {string} sectionName - Name of the section.
     */
    function showAddStudentPopup(classId, sectionId, className, sectionName) {
        let html = `
            <form class="popup-content" onsubmit="addStudentToDB(event, '${classId}', '${sectionId}', '${className}', '${sectionName}')">
                <label>Student Name</label>
                <input name="studentName" maxlength="40" required>
                <label>Father's Name</label>
                <input name="fatherName" maxlength="40" required>
                <label>Roll Number</label>
                <input name="rollNo" type="number" min="1" max="999" required>
                <div class="btn-row">
                    <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
                    <button type="submit">Add</button>
                </div>
            </form>`;
        showPopup(html);
    }

    /**
     * Adds a new student to a section in Firestore.
     * @param {Event} e - The submit event.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} sectionId - Firestore ID of the section.
     * @param {string} className - Name of the class.
     * @param {string} sectionName - Name of the section.
     */
    window.addStudentToDB = async function(e, classId, sectionId, className, sectionName) {
        e.preventDefault();
        const name = e.target.studentName.value.trim();
        const father = e.target.fatherName.value.trim();
        const roll = parseInt(e.target.rollNo.value.trim(), 10); // Parse roll number as integer

        if (!name || !father || isNaN(roll) || roll < 1) {
            showMessage("Input Error", "Please fill all fields correctly, especially Roll Number.");
            return;
        }

        try {
            await db.collection('years').doc(academicYear).collection('classes').doc(classId)
                .collection('sections').doc(sectionId).collection('students')
                .add({ name, father, roll });
            closePopup();
            window.showStudents(classId, sectionId, className, sectionName); // Reload student list
            showMessage("Success", `Student '${name}' added to ${className} - ${sectionName}.`);
        } catch (error) {
            console.error("Error adding student:", error);
            showMessage("Error", "Failed to add student: " + error.message);
        }
    };

    // --- Settings Button Logic ---
    /**
     * Configures and displays the settings button.
     * @param {string} mode - "main" for main settings, "section" for class/section actions.
     * @param {...any} args - Arguments passed to the settings popup function.
     */
    function showSettingsBtn(mode, ...args) {
        settingsBtn.onclick = null; // Clear previous click handler
        settingsBtn.style.display = "flex"; // Ensure button is visible

        if (mode === "main") {
            settingsBtn.onclick = showMainSettingsPopup;
        } else if (mode === "section") {
            // Pass all relevant IDs and names to the class actions popup
            settingsBtn.onclick = () => showClassActionsPopup(...args);
        } else {
            settingsBtn.style.display = "none"; // Hide if no specific mode
        }
    }

    /**
     * Displays the main settings popup.
     */
    function showMainSettingsPopup() {
        let html = `
            <div style="font-weight:600;color:#0f3d6b;margin-bottom:12px;font-size:1.08em;">Main Settings</div>
            <div class="option-row" style="flex-direction:column;gap:14px;">
                <button class="option-btn" onclick="showAddYearPopup()">Add Academic Year</button>
                <button class="option-btn" onclick="logout()">Logout</button>
                <button class="option-btn" onclick="closePopup()">Close</button>
            </div>`;
        showPopup(html);
    }

    /**
     * Displays a popup form to add a new academic year.
     */
    window.showAddYearPopup = function() {
        let html = `
            <form class="popup-content" onsubmit="addAcademicYear(event)">
                <label>Academic Year</label>
                <input name="yearName" required placeholder="e.g., 2024-25" maxlength="10">
                <div class="btn-row">
                    <button type="button" class="cancel-btn" onclick="closePopup()">Cancel</button>
                    <button type="submit">Add</button>
                </div>
            </form>`;
        showPopup(html);
    };

    /**
     * Adds a new academic year to Firestore.
     * @param {Event} e - The submit event.
     */
    window.addAcademicYear = async function(e) {
        e.preventDefault();
        const year = e.target.yearName.value.trim();
        if (!year) return;

        try {
            // Check if year already exists to avoid overwriting
            const yearDoc = await db.collection('years').doc(year).get();
            if (yearDoc.exists) {
                showMessage("Duplicate Year", `Academic year '${year}' already exists.`);
                return;
            }

            await db.collection('years').doc(year).set({ name: year, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            closePopup();
            academicYear = year; // Set the newly added year as current
            localStorage.setItem('sp_selectedYear', year); // Save to local storage
            showDashboard(); // Refresh dashboard
            showMessage("Success", `Academic year '${year}' added and selected.`);
        } catch (error) {
            console.error("Error adding academic year:", error);
            showMessage("Error", "Failed to add academic year: " + error.message);
        }
    };

    /**
     * Logs the user out of Firebase.
     */
    window.logout = async function() {
        try {
            await auth.signOut();
            window.location.href = "index.html"; // Redirect to login page
        } catch (error) {
            console.error("Logout Error:", error);
            showMessage("Error", "Failed to log out: " + error.message);
        }
    };

    // --- Class/Section Actions Popup ---
    /**
     * Displays a popup with actions for a specific class/section.
     * @param {string} classId - Firestore ID of the class.
     * @param {string} sectionId - Firestore ID of the section.
     * @param {string} className - Name of the class.
     * @param {string} sectionName - Name of the section.
     */
    function showClassActionsPopup(classId, sectionId, className, sectionName) {
        // Store current context for feature functions
        currentClass = { id: classId, name: className };
        currentSection = { id: sectionId, name: sectionName };

        let html = `
            <div style="font-weight:600;color:#0f3d6b;margin-bottom:13px;font-size:1.1em;">
                Actions for ${className}${sectionName ? " - " + sectionName : ""}
            </div>
            <div class="option-row" style="flex-direction:column;gap:14px;">
                <button class="option-btn" onclick="showExamSettingsPopup()">Exam Settings</button>
                <button class="option-btn" onclick="showEnterMarksPopup()">Enter Marks</button>
                <button class="option-btn" onclick="downloadClassMemos()">Download Class Marks Memos (PDF)</button>
                <button class="option-btn" onclick="downloadHallTickets()">Download Hall Tickets</button>
                <button class="option-btn" onclick="downloadClassExcel()">Download Class Marks (Excel)</button>
                <button class="option-btn" onclick="showPerformanceGraph()">Performance Graph</button>
                <button class="option-btn" onclick="closePopup()">Close</button>
            </div>`;
        showPopup(html);
    }

    // ======= ALL FEATURE LOGIC (PLACEHOLDER; implement actual logic here) =======
    // These functions will use currentClass and currentSection global variables
    window.showExamSettingsPopup = function() {
        showMessage("Coming Soon!", "Exam Settings feature is under development.");
    };
    window.showEnterMarksPopup = function() {
        showMessage("Coming Soon!", "Enter Marks feature is under development.");
    };
    window.downloadClassMemos = function() {
        showMessage("Coming Soon!", "Download Class Marks Memos (PDF) feature is under development. (Will use memo.png)");
    };
    window.downloadHallTickets = function() {
        showMessage("Coming Soon!", "Download Hall Tickets feature is under development. (No PNG background)");
    };
    window.downloadClassExcel = function() {
        showMessage("Coming Soon!", "Download Class Marks (Excel) feature is under development.");
    };
    window.showPerformanceGraph = function() {
        showMessage("Coming Soon!", "Performance Graph feature is under development.");
    };

    // --- Generic Popup Functions ---
    /**
     * Closes the generic popup.
     */
    function closePopup() {
        if (popupBg) popupBg.classList.add("hidden");
        if (popup) popup.classList.add("hidden");
        popup.innerHTML = ''; // Clear content to prevent old forms from reappearing
    }

    /**
     * Displays a generic popup with provided HTML content.
     * @param {string} htmlContent - The HTML string to display inside the popup.
     */
    function showPopup(htmlContent) {
        if (popupBg && popup) {
            popup.innerHTML = htmlContent; // Set the content of the popup
            popupBg.classList.remove("hidden");
            popup.classList.remove("hidden");

            // Close popup when clicking the overlay (not the popup itself)
            popupBg.onclick = function(e) {
                if (e.target === popupBg) closePopup();
            };

            // Enable Cancel/Close button for dynamically created popups
            const cancelBtn = popup.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.onclick = function(e) {
                    e.preventDefault(); // Prevent form submission if it's a form button
                    closePopup();
                };
            }
        } else {
            console.error("Generic popup elements (popup-bg or popup) not found.");
        }
    }

    // --- Floating Action Button (FAB) Functions ---
    /**
     * Configures and displays the Floating Action Button.
     * @param {string} label - Text label for the FAB (not directly displayed, but for context).
     * @param {function} onClick - The function to execute when FAB is clicked.
     */
    function showFAB(label, onClick) {
        // The Font Awesome icon is now directly in dashboard.html
        fab.onclick = onClick;
        fab.style.display = "flex"; // Ensure FAB is visible
        fab.title = label; // Update title for accessibility
    }

    // --- Screen Title Management ---
    /**
     * Sets the title displayed at the top of the main content area.
     * @param {string} title - The title to display.
     */
    function setScreenTitle(title) {
        const screenTitleElement = document.querySelector(".screen-title");
        if (screenTitleElement) {
            screenTitleElement.textContent = title;
        } else {
            console.warn("Screen title element not found.");
        }
    }

    // --- History Logic (for browser back button) ---
    let lastViewFn = null; // Stores the function to re-render the previous view

    /**
     * Sets the function to be called when the browser's back button is pressed.
     * This allows for single-step navigation within the app's views.
     * @param {function} fn - The function to call to re-render the current view.
     */
    function setHistory(fn) {
        lastViewFn = fn;
        // Note: We are not using pushState here to simplify history management
        // and avoid complex state restoration. This provides a simple "one step back"
        // functionality.
    }

    // Event listener for browser's popstate (back/forward button)
    window.onpopstate = function() {
        if (lastViewFn) {
            lastViewFn(); // Execute the function to re-render the previous view
        } else {
            // If no history function, default to dashboard or a safe state
            showDashboard();
        }
    };
} // End of dashboardAppInit
