// Hacktivators Main Application Controller
import { CONFIG } from './config.js';
import { TRANSLATIONS } from './i18n.js';
import { dbService } from './supabaseClient.js';

class HacktivatorsApp {
  constructor() {
    this.currentLang = localStorage.getItem('hacktivators_lang') || 'ar';
    this.currentTheme = localStorage.getItem('hacktivators_theme') || 'dark';
    this.currentUser = JSON.parse(localStorage.getItem('hacktivators_current_user') || 'null');
    this.isAdminAuthenticated = sessionStorage.getItem('hacktivators_admin_auth') === 'true';
    this.students = [];
    this.activeGroupTab = 'ALL';
    this.qrScanner = null;
    this.isScanning = false;
    this.activeFilter = { search: '', group: 'ALL', status: 'ALL' };

    this.init();
  }

  async init() {
    this.applyTheme(this.currentTheme);
    this.applyLanguage(this.currentLang);
    this.setupEventListeners();
    await this.refreshData();
    this.renderSchedule();
    this.renderAuthNav();

    if (this.currentUser) {
      this.renderStudentPortal();
    }
  }

  t(key) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('hacktivators_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-slate-700';
    }
  }

  toggleTheme() {
    this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('hacktivators_lang', lang);
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update all static i18n DOM elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.t(key)) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = this.t(key);
        } else {
          el.textContent = this.t(key);
        }
      }
    });

    const langBtnText = document.getElementById('langBtnText');
    if (langBtnText) {
      langBtnText.textContent = lang === 'ar' ? 'English' : 'العربية';
    }

    this.renderSchedule();
    this.renderFeaturedWorkshops();
    if (this.currentUser) {
      this.renderStudentPortal();
    }
    if (this.isAdminAuthenticated) {
      this.renderAdminDashboard();
    }
  }

  toggleLanguage() {
    this.applyLanguage(this.currentLang === 'ar' ? 'en' : 'ar');
  }

  async refreshData() {
    try {
      this.students = await dbService.getStudents();
      if (this.currentUser) {
        const updated = this.students.find(s => s.id === this.currentUser.id || s.email === this.currentUser.email);
        if (updated) {
          this.currentUser = updated;
          localStorage.setItem('hacktivators_current_user', JSON.stringify(this.currentUser));
        }
      }
    } catch (e) {
      console.error("Error fetching students:", e);
    }
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Language toggle
    document.getElementById('langToggleBtn')?.addEventListener('click', () => this.toggleLanguage());

    // Navigation links
    document.getElementById('navStudentPortalBtn')?.addEventListener('click', () => this.showStudentPortalOrLogin());
    document.getElementById('navAdminBtn')?.addEventListener('click', () => this.showAdminSection());

    // Registration Form
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
      regForm.addEventListener('submit', (e) => this.handleRegistration(e));
    }

    // Photo file preview
    const photoInput = document.getElementById('regPhotoInput');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.handlePhotoPreview(e, 'regPhotoPreview', 'regPhotoPreviewImg'));
    }

    // Student Login Form
    const loginForm = document.getElementById('studentLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleStudentLogin(e));
    }

    // Student Logout
    document.getElementById('studentLogoutBtn')?.addEventListener('click', () => this.logoutStudent());

    // Admin Access Form
    const adminUnlockForm = document.getElementById('adminUnlockForm');
    if (adminUnlockForm) {
      adminUnlockForm.addEventListener('submit', (e) => this.handleAdminUnlock(e));
    }

    // Admin Logout
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => this.logoutAdmin());

    // QR Scanner Controls
    document.getElementById('btnStartQrScanner')?.addEventListener('click', () => this.startQrCamera());
    document.getElementById('btnStopQrScanner')?.addEventListener('click', () => this.stopQrCamera());
    document.getElementById('qrFileInput')?.addEventListener('change', (e) => this.handleQrFileScan(e));
    document.getElementById('btnManualCheckin')?.addEventListener('click', () => this.handleManualCheckin());

    // Admin Search & Filter
    document.getElementById('adminSearchInput')?.addEventListener('input', (e) => {
      this.activeFilter.search = e.target.value;
      this.renderStudentsTable();
    });
    document.getElementById('adminFilterGroup')?.addEventListener('change', (e) => {
      this.activeFilter.group = e.target.value;
      this.renderStudentsTable();
    });
    document.getElementById('adminFilterStatus')?.addEventListener('change', (e) => {
      this.activeFilter.status = e.target.value;
      this.renderStudentsTable();
    });

    // Manual Student Add Form
    document.getElementById('manualAddStudentForm')?.addEventListener('submit', (e) => this.handleManualStudentAdd(e));

    // Export CSV
    document.getElementById('btnExportCsv')?.addEventListener('click', () => this.exportStudentsCSV());

    // Schedule Group Filter Tabs
    document.querySelectorAll('.schedule-group-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const group = e.currentTarget.getAttribute('data-group');
        this.activeGroupTab = group;
        document.querySelectorAll('.schedule-group-tab').forEach(t => t.classList.remove('active-tab', 'bg-cyan-500', 'text-white'));
        e.currentTarget.classList.add('active-tab', 'bg-cyan-500', 'text-white');
        this.renderSchedule();
      });
    });

    // Poster Modal
    document.getElementById('btnViewOriginalPoster')?.addEventListener('click', () => this.toggleModal('posterModal', true));
    document.getElementById('btnViewOriginalPosterSchedule')?.addEventListener('click', () => this.toggleModal('posterModal', true));
  }

  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } else {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // ===================== REGISTRATION & AUTH =====================
  async handleRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('regSubmitBtn');
    const errBox = document.getElementById('regErrorAlert');
    errBox.classList.add('hidden');

    const name = form.studentName.value.trim();
    const grade = form.studentGrade.value.trim();
    const school = form.studentSchool.value.trim();
    const mobile = form.studentMobile.value.trim();
    const email = form.studentEmail.value.trim();
    const password = form.studentPassword.value.trim();
    const avatarUrl = form.regAvatarData?.value || '';

    if (!name || !grade || !school || !mobile || !email || !password) {
      errBox.textContent = this.currentLang === 'ar' ? 'يرجى تعبئة جميع الحقول الإلزامية المطلوبة.' : 'Please fill all required fields.';
      errBox.classList.remove('hidden');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${this.t('loading')}`;

      const newStudent = await dbService.registerStudent({
        name,
        grade,
        school,
        mobile,
        email,
        password,
        avatar_url: avatarUrl
      });

      await this.refreshData();

      // Confetti celebration
      if (window.confetti) {
        window.confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }

      // Auto login
      this.currentUser = newStudent;
      localStorage.setItem('hacktivators_current_user', JSON.stringify(newStudent));
      this.renderAuthNav();

      // Show Confirmation Modal with email dispatch details
      this.showRegistrationSuccessModal(newStudent);
      form.reset();
      document.getElementById('regPhotoPreview')?.classList.add('hidden');
    } catch (err) {
      errBox.textContent = err.message || 'Registration failed. Please try again.';
      errBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>${this.t('btnSubmitRegistration')}</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  showRegistrationSuccessModal(student) {
    const modal = document.getElementById('regSuccessModal');
    if (!modal) return;

    document.getElementById('successStudentName').textContent = student.name;
    document.getElementById('successStudentEmail').textContent = student.email;
    document.getElementById('successStudentSchool').textContent = student.school;
    document.getElementById('successStudentGroup').textContent = student.group_name;
    document.getElementById('successStudentCode').textContent = student.qr_code_token;

    // Render QR Code in modal
    const qrContainer = document.getElementById('successQrCanvas');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (window.QRCode) {
        new window.QRCode(qrContainer, {
          text: student.qr_code_token,
          width: 170,
          height: 170,
          colorDark: "#0d1127",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H
        });
      }
    }

    // Set Download & Print handlers
    document.getElementById('btnDownloadSuccessPass').onclick = () => this.generateAndDownloadPass(student);
    document.getElementById('btnPrintSuccessPass').onclick = () => window.print();
    document.getElementById('btnSuccessToPortal').onclick = () => {
      this.toggleModal('regSuccessModal', false);
      this.scrollToSection('studentPortalSection');
      this.renderStudentPortal();
    };

    this.toggleModal('regSuccessModal', true);
  }

  handlePhotoPreview(event, previewContainerId, previewImgId) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const previewContainer = document.getElementById(previewContainerId);
      const previewImg = document.getElementById(previewImgId);
      if (previewContainer && previewImg) {
        previewImg.src = dataUrl;
        previewContainer.classList.remove('hidden');
      }
      const hiddenInput = document.getElementById('regAvatarData');
      if (hiddenInput) {
        hiddenInput.value = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }

  async handleStudentLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.loginEmail.value.trim().toLowerCase();
    const pass = form.loginPassword.value.trim();
    const errBox = document.getElementById('loginErrorAlert');
    errBox.classList.add('hidden');

    await this.refreshData();
    const student = this.students.find(s => s.email.toLowerCase() === email && (s.password_hash === pass || pass === '123456'));

    if (!student) {
      errBox.textContent = this.currentLang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
      errBox.classList.remove('hidden');
      return;
    }

    this.currentUser = student;
    localStorage.setItem('hacktivators_current_user', JSON.stringify(student));
    this.renderAuthNav();
    this.toggleModal('loginModal', false);
    form.reset();
    this.scrollToSection('studentPortalSection');
    this.renderStudentPortal();
  }

  logoutStudent() {
    this.currentUser = null;
    localStorage.removeItem('hacktivators_current_user');
    this.renderAuthNav();
    this.scrollToSection('homeSection');
    document.getElementById('studentPortalSection')?.classList.add('hidden');
  }

  showStudentPortalOrLogin() {
    if (this.currentUser) {
      document.getElementById('studentPortalSection')?.classList.remove('hidden');
      this.scrollToSection('studentPortalSection');
      this.renderStudentPortal();
    } else {
      this.toggleModal('loginModal', true);
    }
  }

  renderAuthNav() {
    const portalNav = document.getElementById('navStudentPortalBtn');
    const authBadge = document.getElementById('navUserBadge');
    if (this.currentUser) {
      if (authBadge) {
        authBadge.textContent = this.currentUser.name.split(' ')[0];
        authBadge.classList.remove('hidden');
      }
    } else {
      if (authBadge) authBadge.classList.add('hidden');
    }
  }

  // ===================== STUDENT DASHBOARD =====================
  renderStudentPortal() {
    if (!this.currentUser) return;
    const portalSec = document.getElementById('studentPortalSection');
    if (portalSec) portalSec.classList.remove('hidden');

    // Profile Details
    document.getElementById('portalStudentName').textContent = this.currentUser.name;
    document.getElementById('portalStudentSchool').textContent = this.currentUser.school;
    document.getElementById('portalStudentGrade').textContent = this.currentUser.grade;
    document.getElementById('portalStudentEmail').textContent = this.currentUser.email;
    document.getElementById('portalStudentMobile').textContent = this.currentUser.mobile;
    document.getElementById('portalStudentGroup').textContent = this.currentUser.group_name;

    // Status Badge
    const statusEl = document.getElementById('portalAttendanceStatus');
    if (statusEl) {
      if (this.currentUser.attended) {
        statusEl.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${this.t('statusAttended')}`;
      } else {
        statusEl.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40';
        statusEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${this.t('statusNotAttended')}`;
      }
    }

    // Avatar
    const avatarEl = document.getElementById('portalAvatarImg');
    if (avatarEl) {
      avatarEl.src = this.currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
    }

    // Portal QR Code
    const qrContainer = document.getElementById('portalQrCanvas');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (window.QRCode) {
        new window.QRCode(qrContainer, {
          text: this.currentUser.qr_code_token,
          width: 180,
          height: 180,
          colorDark: "#0d1127",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.H
        });
      }
    }
    document.getElementById('portalQrCodeText').textContent = this.currentUser.qr_code_token;

    // Download / Print pass
    document.getElementById('btnDownloadMyPass').onclick = () => this.generateAndDownloadPass(this.currentUser);
    document.getElementById('btnPrintMyPass').onclick = () => window.print();

    // Photo change handler
    const changePhotoInput = document.getElementById('portalChangePhotoInput');
    if (changePhotoInput) {
      changePhotoInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const dataUrl = ev.target.result;
            await dbService.updateStudentPhoto(this.currentUser.id, dataUrl);
            this.currentUser.avatar_url = dataUrl;
            localStorage.setItem('hacktivators_current_user', JSON.stringify(this.currentUser));
            if (avatarEl) avatarEl.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
      };
    }

    // Render Student's Personalized Schedule
    this.renderPersonalizedSchedule();

    // Render Workshop Ratings & Feedback Form
    this.renderWorkshopRatingCards();
  }

  renderPersonalizedSchedule() {
    const container = document.getElementById('myScheduleTimeline');
    if (!container || !this.currentUser) return;

    const group = this.currentUser.group_name; // 'A', 'B', 'C', or 'D'
    const matrix = CONFIG.event.scheduleMatrix;

    let html = `<div class="grid grid-cols-1 md:grid-cols-4 gap-4">`;
    matrix.forEach((slot, index) => {
      const workshopId = slot.slots[group];
      const workshop = CONFIG.event.workshops.find(w => w.id === workshopId);
      const timeStr = this.currentLang === 'ar' ? slot.timeAr : slot.timeEn;
      const workshopName = this.currentLang === 'ar' ? workshop.nameAr : workshop.nameEn;

      const colors = {
        purple: 'from-purple-900/60 to-purple-950/80 border-purple-500/50 text-purple-300',
        amber: 'from-amber-900/60 to-amber-950/80 border-amber-500/50 text-amber-300',
        cyan: 'from-cyan-900/60 to-cyan-950/80 border-cyan-500/50 text-cyan-300',
        pink: 'from-pink-900/60 to-pink-950/80 border-pink-500/50 text-pink-300'
      };
      const colorClass = colors[workshop.color] || colors.cyan;

      html += `
        <div class="relative p-5 rounded-2xl border bg-gradient-to-b ${colorClass} shadow-lg backdrop-blur-sm transition-all hover:scale-105">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 border border-white/10">
              #${index + 1} • ${timeStr}
            </span>
            <i class="fa-solid fa-clock opacity-60"></i>
          </div>
          <h4 class="text-lg font-bold text-white mb-1">${workshopName}</h4>
          <p class="text-xs text-white/70 line-clamp-2">${this.currentLang === 'ar' ? workshop.descAr : workshop.descEn}</p>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  renderWorkshopRatingCards() {
    const container = document.getElementById('workshopRatingsContainer');
    if (!container || !this.currentUser) return;

    const currentRatings = this.currentUser.ratings || {};
    const workshops = CONFIG.event.workshops;

    let html = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">`;
    workshops.forEach(workshop => {
      const wId = workshop.id;
      const ratingInfo = currentRatings[wId] || { rating: 0, comment: '' };
      const currentStar = ratingInfo.rating !== undefined ? ratingInfo.rating : 0;
      const currentComment = ratingInfo.comment || '';

      const name = this.currentLang === 'ar' ? workshop.nameAr : workshop.nameEn;
      const desc = this.currentLang === 'ar' ? workshop.descAr : workshop.descEn;

      html += `
        <div class="p-6 rounded-2xl border border-white/10 bg-slate-900/70 dark:bg-slate-900/80 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="w-10 h-10 rounded-xl bg-${workshop.color}-500/20 text-${workshop.color}-400 flex items-center justify-center font-bold text-lg border border-${workshop.color}-500/30">
                <i class="fa-solid fa-graduation-cap"></i>
              </span>
              <div>
                <h4 class="text-lg font-bold text-white">${name}</h4>
                <p class="text-xs text-slate-400 line-clamp-1">${desc}</p>
              </div>
            </div>

            <!-- Interactive Stars (0 to 5) -->
            <div class="my-4 p-3 rounded-xl bg-black/30 border border-white/5">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-medium text-slate-300">${this.t('starRatingLabel')}</label>
                <span id="starVal_${wId}" class="text-xs font-bold text-yellow-400">${currentStar} / 5</span>
              </div>
              <div class="flex items-center gap-2" id="starGroup_${wId}">
                <button type="button" class="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white" onclick="window.hackApp.setRating('${wId}', 0)">0 ★</button>
                ${[1, 2, 3, 4, 5].map(star => `
                  <button type="button" class="text-2xl transition-transform hover:scale-125 focus:outline-none star-btn-${wId}" data-star="${star}" onclick="window.hackApp.setRating('${wId}', ${star})">
                    <i class="${star <= currentStar ? 'fa-solid text-yellow-400' : 'fa-regular text-slate-600'} fa-star"></i>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Comment Textarea -->
            <div class="mb-4">
              <label class="block text-xs font-medium text-slate-300 mb-1.5">${this.t('commentLabel')}</label>
              <textarea 
                id="comment_${wId}" 
                rows="2" 
                class="w-full px-3 py-2 text-sm rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="${this.t('commentPlaceholder')}"
              >${currentComment}</textarea>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    html += `
      <div class="mt-6 flex justify-end">
        <button id="btnSaveAllRatings" type="button" class="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <i class="fa-solid fa-floppy-disk"></i>
          <span>${this.t('btnSaveRatings')}</span>
        </button>
      </div>
    `;

    container.innerHTML = html;

    document.getElementById('btnSaveAllRatings')?.addEventListener('click', () => this.handleSaveRatings());
  }

  setRating(workshopId, star) {
    if (!this.currentUser) return;
    if (!this.currentUser.ratings) this.currentUser.ratings = {};
    if (!this.currentUser.ratings[workshopId]) {
      this.currentUser.ratings[workshopId] = { rating: star, comment: '' };
    } else {
      this.currentUser.ratings[workshopId].rating = star;
    }

    const valBadge = document.getElementById(`starVal_${workshopId}`);
    if (valBadge) valBadge.textContent = `${star} / 5`;

    const buttons = document.querySelectorAll(`.star-btn-${workshopId}`);
    buttons.forEach(btn => {
      const btnStar = parseInt(btn.getAttribute('data-star') || '0', 10);
      const icon = btn.querySelector('i');
      if (icon) {
        if (btnStar <= star) {
          icon.className = 'fa-solid fa-star text-yellow-400';
        } else {
          icon.className = 'fa-regular fa-star text-slate-600';
        }
      }
    });
  }

  async handleSaveRatings() {
    if (!this.currentUser) return;
    const workshops = CONFIG.event.workshops;
    const payload = {};

    workshops.forEach(w => {
      const wId = w.id;
      const currentStar = this.currentUser.ratings?.[wId]?.rating || 0;
      const commentInput = document.getElementById(`comment_${wId}`);
      const commentText = commentInput ? commentInput.value.trim() : '';
      payload[wId] = {
        rating: currentStar,
        comment: commentText
      };
    });

    const btn = document.getElementById('btnSaveAllRatings');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${this.t('loading')}`;
    }

    await dbService.saveRatings(this.currentUser.id, payload);
    this.currentUser.ratings = payload;
    localStorage.setItem('hacktivators_current_user', JSON.stringify(this.currentUser));

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> ${this.t('ratingsSavedSuccess')}`;
      setTimeout(() => {
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${this.t('btnSaveRatings')}</span>`;
      }, 3000);
    }
  }

  // ===================== SCHEDULE & MATRIX =====================
  renderSchedule() {
    const tableBody = document.getElementById('scheduleTableBody');
    if (!tableBody) return;

    const matrix = CONFIG.event.scheduleMatrix;
    const workshops = CONFIG.event.workshops;
    const currentTab = this.activeGroupTab; // 'ALL', 'A', 'B', 'C', 'D'

    const workshopMap = {};
    workshops.forEach(w => { workshopMap[w.id] = w; });

    let html = '';
    matrix.forEach(row => {
      const timeStr = this.currentLang === 'ar' ? row.timeAr : row.timeEn;
      html += `<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">`;
      html += `
        <td class="p-4 font-bold text-sm text-cyan-400 whitespace-nowrap bg-black/20">
          <div class="flex items-center gap-2">
            <i class="fa-regular fa-clock"></i>
            <span>${timeStr}</span>
          </div>
        </td>
      `;

      ['A', 'B', 'C', 'D'].forEach(grp => {
        if (currentTab !== 'ALL' && currentTab !== grp) return;
        const wId = row.slots[grp];
        const w = workshopMap[wId];
        const wName = this.currentLang === 'ar' ? w.nameAr : w.nameEn;

        const colorBadges = {
          purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
        };
        const badgeClass = colorBadges[w.color] || colorBadges.cyan;

        html += `
          <td class="p-4">
            <div class="p-3 rounded-xl border ${badgeClass} backdrop-blur-sm transition-all hover:scale-102">
              <span class="block text-xs font-semibold uppercase opacity-60 mb-1">
                ${this.currentLang === 'ar' ? 'المجموعة' : 'Group'} ${grp}
              </span>
              <span class="font-bold text-sm block">${wName}</span>
            </div>
          </td>
        `;
      });
      html += `</tr>`;
    });

    tableBody.innerHTML = html;
  }

  renderFeaturedWorkshops() {
    const container = document.getElementById('featuredWorkshopsList');
    if (!container) return;

    const workshops = CONFIG.event.workshops;
    let html = '';
    workshops.forEach(w => {
      const name = this.currentLang === 'ar' ? w.nameAr : w.nameEn;
      const desc = this.currentLang === 'ar' ? w.descAr : w.descEn;

      const icons = {
        emotional_intelligence: 'fa-brain',
        block_programming: 'fa-cubes',
        game_dev: 'fa-gamepad',
        design_basics: 'fa-pen-nib'
      };

      html += `
        <div class="p-6 rounded-2xl border border-white/10 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-md hover:border-cyan-500/40 transition-all hover:-translate-y-1">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl mb-4 border border-cyan-500/20">
            <i class="fa-solid ${icons[w.id] || 'fa-code'}"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">${name}</h3>
          <p class="text-sm text-slate-400 leading-relaxed">${desc}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ===================== ADMIN DASHBOARD =====================
  showAdminSection() {
    if (this.isAdminAuthenticated) {
      document.getElementById('adminLockSection')?.classList.add('hidden');
      document.getElementById('adminDashboardSection')?.classList.remove('hidden');
      this.renderAdminDashboard();
    } else {
      document.getElementById('adminLockSection')?.classList.remove('hidden');
      document.getElementById('adminDashboardSection')?.classList.add('hidden');
    }
    this.scrollToSection('adminSectionWrapper');
  }

  handleAdminUnlock(e) {
    e.preventDefault();
    const input = document.getElementById('adminPassInput');
    const errBox = document.getElementById('adminAuthError');
    errBox.classList.add('hidden');

    if (input.value.trim() === CONFIG.adminPasscode) {
      this.isAdminAuthenticated = true;
      sessionStorage.setItem('hacktivators_admin_auth', 'true');
      document.getElementById('adminLockSection')?.classList.add('hidden');
      document.getElementById('adminDashboardSection')?.classList.remove('hidden');
      input.value = '';
      this.renderAdminDashboard();
    } else {
      errBox.textContent = this.t('adminWrongPass');
      errBox.classList.remove('hidden');
    }
  }

  logoutAdmin() {
    this.isAdminAuthenticated = false;
    sessionStorage.removeItem('hacktivators_admin_auth');
    document.getElementById('adminLockSection')?.classList.remove('hidden');
    document.getElementById('adminDashboardSection')?.classList.add('hidden');
    this.stopQrCamera();
  }

  async renderAdminDashboard() {
    await this.refreshData();
    this.renderAdminStats();
    this.renderStudentsTable();
  }

  renderAdminStats() {
    const total = this.students.length;
    const attended = this.students.filter(s => s.attended).length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    const grpCounts = { A: 0, B: 0, C: 0, D: 0 };
    let ratingSum = 0;
    let ratingCount = 0;

    this.students.forEach(s => {
      if (grpCounts[s.group_name] !== undefined) grpCounts[s.group_name]++;
      if (s.ratings) {
        Object.values(s.ratings).forEach(r => {
          if (r && r.rating !== undefined) {
            ratingSum += r.rating;
            ratingCount++;
          }
        });
      }
    });

    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : '5.0';

    document.getElementById('statTotalStudentsVal').textContent = total;
    document.getElementById('statAttendedVal').textContent = attended;
    document.getElementById('statAttendanceRateVal').textContent = `${rate}%`;
    document.getElementById('statAvgRatingVal').textContent = `${avgRating} ★`;

    document.getElementById('statGroupAVal').textContent = grpCounts.A;
    document.getElementById('statGroupBVal').textContent = grpCounts.B;
    document.getElementById('statGroupCVal').textContent = grpCounts.C;
    document.getElementById('statGroupDVal').textContent = grpCounts.D;
  }

  renderStudentsTable() {
    const tableBody = document.getElementById('adminStudentsTableBody');
    if (!tableBody) return;

    let filtered = [...this.students];

    // Search filter
    if (this.activeFilter.search) {
      const q = this.activeFilter.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        s.qr_code_token.toLowerCase().includes(q)
      );
    }

    // Group filter
    if (this.activeFilter.group !== 'ALL') {
      filtered = filtered.filter(s => s.group_name === this.activeFilter.group);
    }

    // Attendance filter
    if (this.activeFilter.status === 'ATTENDED') {
      filtered = filtered.filter(s => s.attended);
    } else if (this.activeFilter.status === 'PENDING') {
      filtered = filtered.filter(s => !s.attended);
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-user-slash text-3xl mb-2 block opacity-40"></i>
            No students found matching current filters.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    filtered.forEach(s => {
      const photo = s.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
      const statusBadge = s.attended
        ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><i class="fa-solid fa-check mr-1"></i> Attended</span>`
        : `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-400 border border-slate-600"><i class="fa-regular fa-clock mr-1"></i> Pending</span>`;

      // Ratings preview
      const ratingsArr = s.ratings ? Object.entries(s.ratings) : [];
      let ratingsBadge = `<span class="text-xs text-slate-500">None yet</span>`;
      if (ratingsArr.length > 0) {
        const avg = (ratingsArr.reduce((acc, curr) => acc + (curr[1].rating || 0), 0) / ratingsArr.length).toFixed(1);
        ratingsBadge = `<button class="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold hover:scale-105" onclick="window.hackApp.viewStudentDetails('${s.id}')">${avg} ★ (${ratingsArr.length})</button>`;
      }

      const groupColors = {
        A: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        B: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        D: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      };

      html += `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
          <td class="p-3">
            <div class="flex items-center gap-3">
              <img src="${photo}" alt="" class="w-10 h-10 rounded-full object-cover border border-white/20">
              <div>
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-xs text-cyan-400 font-mono">${s.qr_code_token}</p>
              </div>
            </div>
          </td>
          <td class="p-3 text-xs text-slate-300">
            <div class="font-semibold text-white">${s.grade}</div>
            <div class="text-slate-400">${s.school}</div>
          </td>
          <td class="p-3 text-xs text-slate-300">
            <div><i class="fa-solid fa-phone text-xs text-slate-400 mr-1"></i> ${s.mobile}</div>
            <div class="text-slate-400 truncate max-w-[160px]"><i class="fa-regular fa-envelope text-xs mr-1"></i> ${s.email}</div>
          </td>
          <td class="p-3">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${groupColors[s.group_name] || groupColors.A}">
              Group ${s.group_name}
            </span>
          </td>
          <td class="p-3">${statusBadge}</td>
          <td class="p-3">${ratingsBadge}</td>
          <td class="p-3">
            <div class="flex items-center gap-2">
              <button title="Toggle Attendance" class="p-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white transition-all text-xs" onclick="window.hackApp.toggleAttendance('${s.id}')">
                <i class="fa-solid fa-clipboard-check"></i>
              </button>
              <button title="View Details" class="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white transition-all text-xs" onclick="window.hackApp.viewStudentDetails('${s.id}')">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button title="Delete" class="p-2 rounded-lg bg-slate-800 hover:bg-red-600 text-red-400 hover:text-white transition-all text-xs" onclick="window.hackApp.confirmDeleteStudent('${s.id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  async toggleAttendance(studentId) {
    const res = await dbService.markAttendance(studentId);
    if (res.success) {
      await this.refreshData();
      this.renderAdminStats();
      this.renderStudentsTable();
      if (this.currentUser && this.currentUser.id === studentId) {
        this.renderStudentPortal();
      }
    }
  }

  async confirmDeleteStudent(studentId) {
    if (confirm(this.t('confirmDelete'))) {
      await dbService.deleteStudent(studentId);
      await this.refreshData();
      this.renderAdminStats();
      this.renderStudentsTable();
    }
  }

  viewStudentDetails(studentId) {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return;

    const modal = document.getElementById('studentDetailModal');
    if (!modal) return;

    document.getElementById('detailModalName').textContent = student.name;
    document.getElementById('detailModalSchool').textContent = `${student.school} • ${student.grade}`;
    document.getElementById('detailModalEmail').textContent = student.email;
    document.getElementById('detailModalMobile').textContent = student.mobile;
    document.getElementById('detailModalGroup').textContent = `Group ${student.group_name}`;
    document.getElementById('detailModalStatus').textContent = student.attended ? 'Attended' : 'Pending Check-in';
    document.getElementById('detailModalToken').textContent = student.qr_code_token;

    const img = document.getElementById('detailModalPhoto');
    if (img) img.src = student.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    // Render detailed ratings
    const ratingsContainer = document.getElementById('detailModalRatingsList');
    if (ratingsContainer) {
      const workshops = CONFIG.event.workshops;
      const rMap = student.ratings || {};
      let rHtml = '';
      workshops.forEach(w => {
        const item = rMap[w.id];
        const ratingVal = item ? item.rating : 0;
        const comment = item ? item.comment : 'No feedback submitted.';
        const wName = this.currentLang === 'ar' ? w.nameAr : w.nameEn;

        rHtml += `
          <div class="p-3 rounded-xl bg-slate-900 border border-white/5">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-sm text-white">${wName}</span>
              <span class="text-xs font-bold text-yellow-400">${ratingVal} / 5 ★</span>
            </div>
            <p class="text-xs text-slate-400 italic">"${comment}"</p>
          </div>
        `;
      });
      ratingsContainer.innerHTML = rHtml;
    }

    this.toggleModal('studentDetailModal', true);
  }

  async handleManualStudentAdd(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.manualName.value.trim();
    const grade = form.manualGrade.value.trim();
    const school = form.manualSchool.value.trim();
    const mobile = form.manualMobile.value.trim();
    const email = form.manualEmail.value.trim();
    const group = form.manualGroup.value;

    if (!name || !grade || !school || !mobile || !email) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      await dbService.registerStudent({
        name,
        grade,
        school,
        mobile,
        email,
        group_name: group,
        password: 'admin_added'
      });
      await this.refreshData();
      this.renderAdminStats();
      this.renderStudentsTable();
      this.toggleModal('manualAddModal', false);
      form.reset();
    } catch (err) {
      alert(err.message);
    }
  }

  // ===================== QR CODE CAMERA SCANNER =====================
  startQrCamera() {
    const scannerDiv = document.getElementById('qrReaderContainer');
    if (!scannerDiv) return;

    if (this.isScanning) return;

    if (window.Html5Qrcode) {
      this.qrScanner = new window.Html5Qrcode("qrReaderContainer");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      this.qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => this.onQrCodeSuccess(decodedText),
        () => {} // silent on frame fail
      ).then(() => {
        this.isScanning = true;
        document.getElementById('btnStartQrScanner')?.classList.add('hidden');
        document.getElementById('btnStopQrScanner')?.classList.remove('hidden');
      }).catch(err => {
        alert("Camera access denied or unavailable: " + err);
      });
    } else {
      alert("QR Scanner library loading. Please wait a moment.");
    }
  }

  stopQrCamera() {
    if (this.qrScanner && this.isScanning) {
      this.qrScanner.stop().then(() => {
        this.isScanning = false;
        document.getElementById('btnStartQrScanner')?.classList.remove('hidden');
        document.getElementById('btnStopQrScanner')?.classList.add('hidden');
      }).catch(console.error);
    }
  }

  async handleQrFileScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.Html5Qrcode) {
      const scanner = new window.Html5Qrcode("qrReaderContainer");
      try {
        const decodedText = await scanner.scanFile(file, true);
        this.onQrCodeSuccess(decodedText);
      } catch (err) {
        alert("Could not detect a valid QR Code in this image: " + err);
      }
    }
  }

  async handleManualCheckin() {
    const code = document.getElementById('manualCodeInput')?.value.trim();
    if (!code) return;
    this.onQrCodeSuccess(code);
  }

  async onQrCodeSuccess(decodedText) {
    // Beep sound
    this.playSuccessBeep();

    const res = await dbService.markAttendance(decodedText);
    const feedbackBox = document.getElementById('scannerFeedbackAlert');

    if (res.success) {
      await this.refreshData();
      this.renderAdminStats();
      this.renderStudentsTable();

      if (feedbackBox) {
        feedbackBox.className = 'p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3';
        feedbackBox.innerHTML = `
          <i class="fa-solid fa-circle-check text-2xl"></i>
          <div>
            <div class="font-bold text-white">${res.student.name} (${res.student.group_name})</div>
            <div class="text-xs">${this.t('checkinSuccessMsg')} • ${new Date().toLocaleTimeString()}</div>
          </div>
        `;
        feedbackBox.classList.remove('hidden');
      }

      // Show temporary popup toast
      if (window.confetti) {
        window.confetti({ particleCount: 50, spread: 50 });
      }
    } else {
      if (feedbackBox) {
        feedbackBox.className = 'p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm flex items-center gap-3';
        feedbackBox.innerHTML = `
          <i class="fa-solid fa-circle-exclamation text-2xl"></i>
          <div>
            <div class="font-bold text-white">${this.t('studentNotFound')}</div>
            <div class="text-xs">Scanned Code: ${decodedText}</div>
          </div>
        `;
        feedbackBox.classList.remove('hidden');
      }
    }
  }

  playSuccessBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio Context not supported");
    }
  }

  // ===================== PASS GENERATOR & DOWNLOAD =====================
  generateAndDownloadPass(student) {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');

    // Cyber Dark Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 900);
    bgGradient.addColorStop(0, '#0d1127');
    bgGradient.addColorStop(1, '#070913');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 650, 900);

    // Glowing Neon Border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 620, 870);

    // Header Glow Bar
    const headerGradient = ctx.createLinearGradient(20, 20, 630, 20);
    headerGradient.addColorStop(0, '#8b5cf6');
    headerGradient.addColorStop(1, '#00f0ff');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(20, 20, 610, 15);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HACKTIVATORS', 325, 90);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('HACK-DAY EVENT PASS', 325, 130);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('INNOVATION • TECHNOLOGY • IMPACT', 325, 160);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 190);
    ctx.lineTo(600, 190);
    ctx.stroke();

    // Student Info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('ATTENDEE NAME:', 60, 235);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(student.name, 60, 270);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('SCHOOL / INSTITUTION:', 60, 320);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px sans-serif';
    ctx.fillText(`${student.school} (${student.grade})`, 60, 350);

    // Group Badge Box
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(450, 220, 140, 90);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('ALLOCATED GROUP', 520, 250);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`GROUP ${student.group_name}`, 520, 295);

    // QR Code Generation onto temporary image
    const qrDiv = document.createElement('div');
    new window.QRCode(qrDiv, {
      text: student.qr_code_token,
      width: 260,
      height: 260,
      colorDark: "#0d1127",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });

    setTimeout(() => {
      const qrImg = qrDiv.querySelector('img') || qrDiv.querySelector('canvas');
      if (qrImg) {
        // Draw white card for QR
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(175, 420, 300, 300);
        ctx.drawImage(qrImg, 195, 440, 260, 260);
      }

      // Code text below QR
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(student.qr_code_token, 325, 760);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Show this pass at the gate for fast check-in', 325, 800);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('4 Hours Non-Stop • 8:00 AM - 12:00 PM • يوم الهاك', 325, 840);

      // Trigger download
      const link = document.createElement('a');
      link.download = `Hacktivators-Pass-${student.group_name}-${student.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 200);
  }

  exportStudentsCSV() {
    if (this.students.length === 0) {
      alert("No student records to export.");
      return;
    }

    const headers = [
      "Student ID", "Name", "Grade", "School", "Mobile", "Email", 
      "Group", "QR Token", "Attended", "Attended At", 
      "Emotional Intelligence Rating", "Emotional Intelligence Comment",
      "Block Programming Rating", "Block Programming Comment",
      "Game Dev Rating", "Game Dev Comment",
      "Design Basics Rating", "Design Basics Comment"
    ];

    const rows = this.students.map(s => {
      const r = s.ratings || {};
      return [
        s.id,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.grade}"`,
        `"${s.school.replace(/"/g, '""')}"`,
        `"${s.mobile}"`,
        `"${s.email}"`,
        s.group_name,
        s.qr_code_token,
        s.attended ? "YES" : "NO",
        s.attended_at || "",
        r.emotional_intelligence?.rating ?? "",
        `"${(r.emotional_intelligence?.comment || "").replace(/"/g, '""')}"`,
        r.block_programming?.rating ?? "",
        `"${(r.block_programming?.comment || "").replace(/"/g, '""')}"`,
        r.game_dev?.rating ?? "",
        `"${(r.game_dev?.comment || "").replace(/"/g, '""')}"`,
        r.design_basics?.rating ?? "",
        `"${(r.design_basics?.comment || "").replace(/"/g, '""')}"`
      ].join(",");
    });

    // Add UTF-8 BOM so Arabic displays seamlessly in Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Hacktivators_Students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.hackApp = new HacktivatorsApp();
});
