// PolyTalk 번역 시스템

// 상태 관리
const state = {
    selectedSubject: null,
    isTranslating: false,
    startTime: null,
    timerInterval: null,
    translations: [],
    currentSTT: '',
    currentHistoryItem: null,
    inputLanguage: 'ko',
    outputLanguages: ['LANGUAGE::ENGLISH'],
    hiddenLanguages: new Set(), // 숨겨진 언어 추적
    currentSubjectTab: '교과', // 현재 선택된 탭 (교과/비교과)
    qaNotificationCount: 0, // Q&A 알림 카운트
    isListening: false, // 음성 인식 상태
    recognition: null, // 음성 인식 객체
    isMicPassedToStudents: false, // 마이크 넘기기 상태 (false: 교수자 답변 모드, true: 학생 질문 모드)
    usedQuestions: [], // Q&A 질문 중복 방지를 위한 배열
    qaSimulationActive: true // Q&A 시뮬레이션 활성화 상태 (강의 시작 전후 모두 작동)
};

// 샘플 과목 데이터
const subjects = [
    { id: 1, name: '웹 프로그래밍', code: 'CS101', color: '#4682B4', type: '교과' },
    { id: 2, name: '데이터베이스 시스템', code: 'CS201', color: '#10b981', type: '교과' },
    { id: 3, name: '인공지능 기초', code: 'CS301', color: '#f59e0b', type: '교과' },
    { id: 4, name: '소프트웨어 공학', code: 'CS401', color: '#ef4444', type: '교과' },
    { id: 5, name: '컴퓨터 네트워크', code: 'CS501', color: '#8b5cf6', type: '교과' },
    { id: 6, name: '창의적 문제해결', code: 'GE101', color: '#ec4899', type: '비교과' },
    { id: 7, name: '리더십 개발', code: 'GE201', color: '#14b8a6', type: '비교과' },
    { id: 8, name: '글로벌 커뮤니케이션', code: 'GE301', color: '#f97316', type: '비교과' }
];

// 과목 ID로 색상 가져오기
function getSubjectColor(subjectId) {
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.color : '#4682B4';
}

// DOM 요소
const elements = {
    subjectModal: document.getElementById('subjectModal'),
    closeModal: document.getElementById('closeModal'),
    subjectList: document.getElementById('subjectList'),
    subjectSelectBtn: document.getElementById('subjectSelectBtn'),
    subjectSelectText: document.getElementById('subjectSelectText'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    timer: document.getElementById('timer'),
    realtimeCaption: null, // 동적으로 생성됨
    translatedCaption: null, // 동적으로 생성됨
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // localStorage에서 저장된 설정 불러오기
    const savedInputLanguage = localStorage.getItem('inputLanguage');
    if (savedInputLanguage && savedInputLanguage !== 'null') {
        state.inputLanguage = savedInputLanguage;
    } else {
        // 기본값은 한국어
        state.inputLanguage = 'ko';
    }
    
    const savedOutputLanguages = localStorage.getItem('outputLanguages');
    if (savedOutputLanguages) {
        try {
            state.outputLanguages = JSON.parse(savedOutputLanguages);
        } catch (e) {
            console.error('Failed to parse outputLanguages from localStorage', e);
        }
    }
    
    // 저장된 언어 설정이 있으면 레이아웃 업데이트
    if (state.outputLanguages.length > 0) {
        updateTranslatedLayout();
    }
    
    // localStorage에서 저장된 과목 불러오기
    const savedSubject = localStorage.getItem('selectedSubject');
    if (savedSubject) {
        try {
            state.selectedSubject = JSON.parse(savedSubject);
            if (state.selectedSubject) {
                elements.subjectSelectText.textContent = state.selectedSubject.name;
            }
        } catch (e) {
            console.error('Failed to parse selectedSubject from localStorage', e);
        }
    }
    
    // 페이지 로드 시 과목 선택 모달 표시
    showSubjectModal();
    
    // 페이지 새로고침 여부 확인 (페이지 로드 시 플래그 설정)
    // sessionStorage는 탭이 닫히기 전까지 유지되므로, 페이지 로드 시마다 true로 설정
    sessionStorage.setItem('isPageRefresh', 'true');
    
    // Room Code 생성 및 표시
    displayRoomCode();
    
    // 이벤트 리스너 등록
    elements.subjectSelectBtn.addEventListener('click', showSubjectModal);
    elements.closeModal.addEventListener('click', hideSubjectModal);
    elements.startBtn.addEventListener('click', startTranslation);
    elements.stopBtn.addEventListener('click', stopTranslation);
    
    // Q&A 패널 토글 버튼 이벤트 리스너
    const qaToggleBtn = document.getElementById('qaToggleBtn');
    const qaToggleBtnMobile = document.getElementById('qaToggleBtnMobile');
    const qaPanelCloseBtn = document.getElementById('qaPanelCloseBtn');
    const qaOverlay = document.getElementById('qaOverlay');
    const qaMicToggleBtn = document.getElementById('qaMicToggleBtn');
    
    if (qaToggleBtn) {
        qaToggleBtn.addEventListener('click', toggleQAPanel);
    }
    if (qaToggleBtnMobile) {
        qaToggleBtnMobile.addEventListener('click', toggleQAPanel);
    }
    if (qaPanelCloseBtn) {
        qaPanelCloseBtn.addEventListener('click', toggleQAPanel);
    }
    if (qaOverlay) {
        qaOverlay.addEventListener('click', toggleQAPanel);
    }
    
    // 마이크 넘기기 버튼 클릭 이벤트
    if (qaMicToggleBtn) {
        qaMicToggleBtn.addEventListener('click', toggleMicPassMode);
    }
    
    // Q&A 채팅 기능 초기화
    initQAChat();
    
    // 3초 후 자동으로 학생 질문 시뮬레이션
    setTimeout(() => {
        startQASimulation();
    }, 3000);
    
    // 모달 외부 클릭 시 닫기
    elements.subjectModal.addEventListener('click', (e) => {
        if (e.target === elements.subjectModal) {
            hideSubjectModal();
        }
    });
    
    // Room Code 모달 외부 클릭 시 닫기
    const roomCodeModal = document.getElementById('roomCodeModal');
    if (roomCodeModal) {
        roomCodeModal.addEventListener('click', (e) => {
            if (e.target === roomCodeModal) {
                closeRoomCodeModal();
            }
        });
    }
    
    // 과목 목록 렌더링
    renderSubjectList();
    
    // 탭 이벤트 리스너 등록
    setupSubjectTabs();
    
    // Output Languages 체크박스 최대 3개 선택 제한
    setupLanguageCheckboxLimits();
    
    // PC 기반 4열 패널 레이아웃 초기화
    updateTranslatedLayout();
}

// Output Languages 체크박스 최대 3개 선택 제한 설정
function setupLanguageCheckboxLimits() {
    // 과목 선택 모달의 체크박스
    const subjectModalCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]');
    subjectModalCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked').length;
            if (checkedCount > 3) {
                this.checked = false;
                showToast('최대 3개까지 선택할 수 있습니다.');
            }
            // 레이아웃은 저장 시에만 업데이트
        });
    });
    
    // Language Settings 모달의 체크박스
    const popupCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]');
    popupCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked').length;
            if (checkedCount > 3) {
                this.checked = false;
                showToast('최대 3개까지 선택할 수 있습니다.');
            }
            // 레이아웃은 저장 시에만 업데이트
        });
    });
}

// PC 기반 4열 패널 레이아웃 생성
function updateTranslatedLayout() {
    const container = document.getElementById('cp_trans');
    if (!container) return;
    
    // 현재 선택된 언어 가져오기 - state.outputLanguages를 우선 사용
    const selectedLanguages = [];
    
    // state에서 가져오기 (우선순위 1)
    if (state.outputLanguages.length > 0) {
        selectedLanguages.push(...state.outputLanguages);
    } else {
        // state가 비어있으면 체크박스에서 가져오기 (우선순위 2)
        const subjectModalCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked');
        const popupCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked');
        
        const checkboxes = subjectModalCheckboxes.length > 0 ? subjectModalCheckboxes : popupCheckboxes;
        checkboxes.forEach(cb => {
            selectedLanguages.push(cb.value);
        });
    }
    
    // 기본값: 영어
    if (selectedLanguages.length === 0) {
        selectedLanguages.push('LANGUAGE::ENGLISH');
    }
    
    // 언어 이름 매핑
    const languageNames = {
        'LANGUAGE::ENGLISH': 'English',
        'LANGUAGE::CHINESE': '中文',
        'LANGUAGE::JAPANESE': '日本語',
        'LANGUAGE::VIETNAMESE': 'Tiếng Việt',
        'LANGUAGE::UZBEK': 'O\'zbek',
        'LANGUAGE::MONGOLIAN': 'Монгол',
        'LANGUAGE::INDONESIAN': 'Bahasa Indonesia',
        'LANGUAGE::NEPALI': 'नेपाली',
        'LANGUAGE::RUSSIAN': 'Русский',
        'LANGUAGE::THAI': 'ไทย',
        'LANGUAGE::KHMER': 'ភាសាខ្មែរ',
        'LANGUAGE::KAZAKH': 'Қазақ',
        'LANGUAGE::KYRGYZ': 'Кыргызча',
        'LANGUAGE::MYANMAR': 'မြန်မာ',
        'LANGUAGE::ARABIC': 'العربية',
        'LANGUAGE::HINDI': 'हिन्दी',
        'LANGUAGE::PASHTO': 'پښتو',
        'LANGUAGE::FILIPINO': 'Filipino',
        'LANGUAGE::FRENCH': 'Français',
        'LANGUAGE::SPANISH': 'Español',
        'LANGUAGE::BENGALI': 'বাংলা'
    };
    
    // Input Language 이름
    const inputLanguageNames = {
        'ko': '한국어',
        'en': 'English',
        'zh': '中文',
        'ja': '日本語',
        'es': 'Español'
    };
    
    // 기존 패널 제거
    container.innerHTML = '';
    
    // 1. 강의 언어 패널 (항상 첫 번째)
    const inputLang = state.inputLanguage || 'ko';
    const inputLangName = inputLanguageNames[inputLang] || inputLang;
    createLanguagePanel(container, 'input', inputLang, inputLangName, 'cp_cols_1', 'cp_cols_content_1');
    
    // 2. 번역 언어 패널들 (선택된 개수만큼만)
    selectedLanguages.forEach((lang, index) => {
        const langName = languageNames[lang] || lang;
        const panelId = `cp_cols_${lang}`;
        const contentId = `cp_cols_content_${lang}`;
        createLanguagePanel(container, 'output', lang, langName, panelId, contentId);
    });
    
    // 3. 숨겨진 언어 태그 버튼 업데이트
    updateHiddenLanguagesBar();
    
    // 4. Grid 클래스 업데이트 (보이는 패널만 계산)
    updateGridLayout();
}

// Grid 레이아웃 업데이트 (보이는 패널만 계산)
function updateGridLayout() {
    const container = document.getElementById('cp_trans');
    if (!container) return;
    
    // 보이는 패널 개수 계산
    const visiblePanels = container.querySelectorAll('.cp_cols_container:not(.hidden-column)').length;
    
    // Grid 클래스 제거 및 추가
    container.classList.remove('grid-1', 'grid-2', 'grid-3', 'grid-4');
    if (visiblePanels > 0) {
        container.classList.add(`grid-${visiblePanels}`);
    }
}

// 언어 패널 생성 함수 - 전문적인 데스크탑 UI
function createLanguagePanel(container, type, langCode, langName, panelId, contentId) {
    const panelContainer = document.createElement('div');
    panelContainer.className = 'cp_cols_container';
    panelContainer.dataset.langCode = langCode;
    panelContainer.dataset.panelType = type;
    
    // 숨겨진 상태 확인
    if (state.hiddenLanguages.has(langCode)) {
        panelContainer.classList.add('hidden-column');
    }
    
    if (type === 'input' && state.inputLanguage === 'null') {
        panelContainer.classList.add('hidden-column');
    }
    
    const panel = document.createElement('div');
    panel.className = 'cp_cols';
    panel.id = panelId;
    
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'cp_title_wrapper';
    
    // 언어 정보 영역
    const titleInfo = document.createElement('div');
    titleInfo.className = 'cp_title_info';
    
    // 언어명 + 배지
    const title = document.createElement('p');
    title.className = 'cp_title';
    
    const badge = document.createElement('span');
    badge.className = 'cp_title_badge';
    badge.textContent = getLanguageLabel(langCode);
    
    title.appendChild(badge);
    titleInfo.appendChild(title);
    
    // 서브타이틀
    const subtitle = document.createElement('p');
    subtitle.className = 'cp_subtitle';
    if (type === 'input') {
        subtitle.textContent = '원문';
    } else {
        subtitle.textContent = '번역';
    }
    titleInfo.appendChild(subtitle);
    
    titleWrapper.appendChild(titleInfo);
    
    // 닫기 버튼 (눈 아이콘)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'column-close-btn';
    closeBtn.innerHTML = '<img src="눈.png" alt="숨김">';
    closeBtn.setAttribute('aria-label', '숨김');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLanguageColumn(langCode, panelContainer);
    });
    
    titleWrapper.appendChild(closeBtn);
    
    const content = document.createElement('div');
    content.className = 'cp_cols_content';
    content.id = contentId;
    
    panel.appendChild(titleWrapper);
    panel.appendChild(content);
    panelContainer.appendChild(panel);
    container.appendChild(panelContainer);
}

// 언어 컬럼 토글 함수 - 완전히 숨기기/보이기 (애니메이션 없음)
function toggleLanguageColumn(langCode, container) {
    if (state.hiddenLanguages.has(langCode)) {
        // 보이기
        state.hiddenLanguages.delete(langCode);
        container.classList.remove('hidden-column');
        updateHiddenLanguagesBar();
        updateTranslatedLayout();
    } else {
        // 숨기기
        state.hiddenLanguages.add(langCode);
        container.classList.add('hidden-column');
        updateHiddenLanguagesBar();
        updateTranslatedLayout();
    }
}

// 숨겨진 언어 태그 버튼 업데이트
function updateHiddenLanguagesBar() {
    const hiddenBar = document.getElementById('hiddenLanguagesBar');
    if (!hiddenBar) return;
    
    hiddenBar.innerHTML = '';
    
    if (state.hiddenLanguages.size === 0) {
        hiddenBar.style.display = 'none';
        return;
    }
    
    hiddenBar.style.display = 'flex';
    
    state.hiddenLanguages.forEach(langCode => {
        const tagBtn = document.createElement('button');
        tagBtn.className = 'language-tag-btn';
        tagBtn.textContent = getLanguageLabel(langCode);
        tagBtn.setAttribute('aria-label', `Show ${langCode} column`);
        tagBtn.addEventListener('click', () => {
            restoreLanguageColumn(langCode);
        });
        hiddenBar.appendChild(tagBtn);
    });
}

// 숨겨진 언어 컬럼 복원
function restoreLanguageColumn(langCode) {
    const container = document.querySelector(`.cp_cols_container[data-lang-code="${langCode}"]`);
    if (container) {
        state.hiddenLanguages.delete(langCode);
        container.classList.remove('hidden-column');
        updateHiddenLanguagesBar();
        updateTranslatedLayout();
    }
}

// 과목 선택 모달 표시
function showSubjectModal() {
    elements.subjectModal.classList.add('active');
    // 과목 선택 화면으로 초기화
    showSubjectStep();
    
    // 페이지 새로고침 시 저장 버튼 숨기기
    const isPageRefresh = sessionStorage.getItem('isPageRefresh') === 'true';
    const subjectSaveBtn = document.getElementById('subjectSaveBtn');
    const modalFooter = document.querySelector('#subjectStep .modal-step-footer');
    if (isPageRefresh && modalFooter) {
        modalFooter.style.display = 'none';
    } else if (modalFooter) {
        modalFooter.style.display = 'flex';
    }
}

// 과목 선택 모달 숨기기
function hideSubjectModal() {
    elements.subjectModal.classList.remove('active');
    // 과목 선택 화면으로 리셋
    showSubjectStep();
    updateButtonStates();
}

// 과목 선택 화면 표시
function showSubjectStep() {
    const subjectStep = document.getElementById('subjectStep');
    const languageStep = document.getElementById('languageStep');
    const modalTitle = document.getElementById('modalTitle');
    
    if (subjectStep) subjectStep.style.display = 'block';
    if (languageStep) languageStep.style.display = 'none';
    if (modalTitle) modalTitle.textContent = '과목 선택';
    
    // 탭 초기화 (교과 탭 활성화)
    state.currentSubjectTab = '교과';
    const tabs = document.querySelectorAll('.subject-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === '교과') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 페이지 새로고침 시 저장 버튼 숨기기
    const isPageRefresh = sessionStorage.getItem('isPageRefresh') === 'true';
    const modalFooter = document.querySelector('#subjectStep .modal-step-footer');
    if (isPageRefresh && modalFooter) {
        modalFooter.style.display = 'none';
    } else if (modalFooter) {
        modalFooter.style.display = 'flex';
    }
    
    // 과목 목록 다시 렌더링
    renderSubjectList();
}

// 언어 설정 화면 표시
function showLanguageStep() {
    const subjectStep = document.getElementById('subjectStep');
    const languageStep = document.getElementById('languageStep');
    const modalTitle = document.getElementById('modalTitle');
    
    if (subjectStep) subjectStep.style.display = 'none';
    if (languageStep) languageStep.style.display = 'block';
    if (modalTitle) modalTitle.textContent = '언어 설정';
    
    // 현재 설정된 언어 값 불러오기 (localStorage 우선, 그 다음 state, 마지막 기본값)
    const inputSelect = document.getElementById('subjectModal_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect) {
        const savedInputLanguage = localStorage.getItem('inputLanguage');
        // null 값이면 기본값 'ko'로 설정
        const inputLang = savedInputLanguage || state.inputLanguage || (speakerSelect ? speakerSelect.value : 'ko');
        const finalLang = (inputLang === 'null' || inputLang === null) ? 'ko' : inputLang;
        
        // select의 value 설정
        inputSelect.value = finalLang;
        
        // 모든 option의 selected 속성 제거 후 해당 option에 selected 추가
        const options = inputSelect.querySelectorAll('option');
        options.forEach(opt => {
            opt.removeAttribute('selected');
            if (opt.value === finalLang) {
                opt.setAttribute('selected', 'selected');
            }
        });
        
        // state에도 반영
        state.inputLanguage = finalLang;
        if (savedInputLanguage && savedInputLanguage !== 'null') {
            state.inputLanguage = savedInputLanguage;
        }
        
        // 강제로 change 이벤트 발생시켜 UI 업데이트
        inputSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Output Languages 체크박스 상태 불러오기
    const outputCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]');
    if (state.outputLanguages.length > 0) {
        outputCheckboxes.forEach(cb => {
            cb.checked = state.outputLanguages.includes(cb.value);
        });
    } else {
        // 기본값: 영어만 체크
        outputCheckboxes.forEach(cb => {
            cb.checked = cb.value === 'LANGUAGE::ENGLISH';
        });
    }
}

// 과목 선택 화면으로 돌아가기
function goBackToSubjectStep() {
    showSubjectStep();
}

// 탭 이벤트 리스너 설정
function setupSubjectTabs() {
    const tabs = document.querySelectorAll('.subject-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            switchSubjectTab(tabType);
        });
    });
}

// 탭 전환
function switchSubjectTab(tabType) {
    state.currentSubjectTab = tabType;
    
    // 탭 활성화 상태 업데이트
    const tabs = document.querySelectorAll('.subject-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabType) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 과목 목록 다시 렌더링
    renderSubjectList();
}

// 과목 목록 렌더링
function renderSubjectList() {
    elements.subjectList.innerHTML = '';
    
    // 현재 선택된 탭에 맞는 과목만 필터링
    const filteredSubjects = subjects.filter(subject => subject.type === state.currentSubjectTab);
    
    if (filteredSubjects.length === 0) {
        elements.subjectList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">선택 가능한 과목이 없습니다.</div>';
        return;
    }
    
    filteredSubjects.forEach(subject => {
        const item = document.createElement('div');
        item.className = 'subject-item';
        item.innerHTML = `
            <div class="subject-name">${subject.name}</div>
            <div class="subject-code">${subject.code}</div>
        `;
        item.addEventListener('click', () => selectSubject(subject, item));
        elements.subjectList.appendChild(item);
    });
}

// 과목 선택
function selectSubject(subject, element) {
    state.selectedSubject = subject;
    
    // 선택된 과목 표시
    document.querySelectorAll('.subject-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    
    // 버튼 텍스트 업데이트
    elements.subjectSelectText.textContent = subject.name;
    
    // 페이지 새로고침 시에만 언어 설정 화면으로 바로 전환
    const isPageRefresh = sessionStorage.getItem('isPageRefresh') === 'true';
    if (isPageRefresh) {
        // 언어 설정 화면으로 바로 전환
        setTimeout(() => {
            showLanguageStep();
        }, 300);
        // 플래그를 false로 설정하여 이후에는 언어 설정으로 넘어가지 않도록
        sessionStorage.setItem('isPageRefresh', 'false');
    }
    // 일반적인 경우는 과목 선택만 (언어 설정으로 전환하지 않음)
}

// 버튼 상태 업데이트
function updateButtonStates() {
    if (state.selectedSubject && !state.isTranslating) {
        elements.startBtn.disabled = false;
        elements.stopBtn.disabled = true;
    } else if (state.isTranslating) {
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = false;
    } else {
        elements.startBtn.disabled = true;
        elements.stopBtn.disabled = true;
    }
}

// 번역 시작
function startTranslation() {
    if (!state.selectedSubject) {
        showToast('과목을 선택해주세요.');
        showSubjectModal();
        return;
    }
    
    state.isTranslating = true;
    state.startTime = new Date();
    state.translations = [];
    state.currentSTT = '';
    state.currentHistoryItem = null;
    state.usedQuestions = []; // Q&A 질문 중복 방지를 위한 초기화
    
    // 타이머 시작
    startTimer();
    
    // 재생 바는 금융 터미널 스타일에서는 숨김
    
    // 실시간 STT 및 번역 시뮬레이션 시작
    startSTTSimulation();
    
    // UI 업데이트
    updateButtonStates();
    clearCaptions();
    
    // 모든 번역 패널의 스크롤을 맨 위로 설정 (위에서부터 내려오도록)
    const allContentPanels = document.querySelectorAll('.cp_cols_content');
    allContentPanels.forEach(panel => {
        panel.scrollTop = 0;
    });
    
    showToast(`번역이 시작되었습니다.`);
}

// 번역 종료
function stopTranslation() {
    if (!state.isTranslating) {
        return;
    }
    
    // 저장 중 팝업 표시
    showSavePopup();
    
    state.isTranslating = false;
    
    // 타이머 정지
    stopTimer();
    
    // 재생 바는 이미 숨김 상태
    
    // STT 시뮬레이션 정지
    stopSTTSimulation();
    
    // 마지막 문장을 번역 기록에 추가
    if (state.translations.length > 0) {
        const lastTranslation = state.translations[state.translations.length - 1];
        if (!lastTranslation.addedToHistory) {
            addTranslationToHistory(lastTranslation);
            lastTranslation.addedToHistory = true;
        }
    }
    
    // 현재 번역 기록 업데이트
    if (state.currentHistoryItem) {
        updateCurrentHistoryItem();
    }
    
    // 번역 데이터 저장 (비동기 시뮬레이션)
    setTimeout(() => {
        saveTranslationData();
        
        // 저장 완료 후 팝업 전환
        showSaveCompletePopup();
        // UI 업데이트
        updateButtonStates();
    }, 1500); // 1.5초 저장 시뮬레이션
}

// 저장 중 팝업 표시
function showSavePopup() {
    const popup = document.getElementById('savePopupOverlay');
    const message = document.getElementById('savePopupMessage');
    const loadingDots = document.getElementById('loadingDots');
    const completeIcon = document.getElementById('saveCompleteIcon');
    const buttonContainer = document.getElementById('savePopupButtonContainer');
    
    if (popup) {
        popup.style.display = 'flex';
        if (message) message.textContent = '번역 기록을 저장하는 중입니다';
        if (loadingDots) loadingDots.style.display = 'flex';
        if (completeIcon) completeIcon.style.display = 'none';
        if (buttonContainer) buttonContainer.style.display = 'none';
    }
}

// 저장 완료 팝업 표시
function showSaveCompletePopup() {
    const popup = document.getElementById('savePopupOverlay');
    const message = document.getElementById('savePopupMessage');
    const loadingDots = document.getElementById('loadingDots');
    const completeIcon = document.getElementById('saveCompleteIcon');
    const buttonContainer = document.getElementById('savePopupButtonContainer');
    
    if (popup) {
        popup.style.display = 'flex';
        if (message) message.textContent = '저장이 완료되었습니다';
        if (loadingDots) loadingDots.style.display = 'none';
        if (completeIcon) completeIcon.style.display = 'flex';
        if (buttonContainer) buttonContainer.style.display = 'flex';
    }
}

// 저장 팝업 닫기
function closeSavePopup() {
    const popup = document.getElementById('savePopupOverlay');
    if (popup) {
        popup.style.display = 'none';
    }
}

// 재생 바는 금융 터미널 스타일에서 사용하지 않음

// 타이머 시작
function startTimer() {
    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000); // 1초마다 업데이트
}

// 타이머 업데이트
function updateTimer() {
    if (!state.startTime) return;
    
    const now = new Date();
    const diff = now - state.startTime;
    
    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    
    elements.timer.textContent = `${hours}:${minutes}:${seconds}`;
}

// 타이머 정지
function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// STT 시뮬레이션 시작
let sttSimulationInterval = null;

function startSTTSimulation() {
    const sampleSentences = [
        '안녕하세요. 오늘은 웹 프로그래밍에 대해 배워보겠습니다.',
        '먼저 HTML과 CSS의 기본 개념을 설명하겠습니다.',
        'HTML은 웹 페이지의 구조를 정의하는 마크업 언어입니다.',
        'CSS는 웹 페이지의 스타일을 정의하는 스타일시트 언어입니다.',
        'JavaScript는 웹 페이지에 동적인 기능을 추가하는 프로그래밍 언어입니다.',
        '오늘 수업은 여기까지입니다. 다음 시간에 뵙겠습니다.'
    ];
    
    let sentenceIndex = 0;
    
    sttSimulationInterval = setInterval(() => {
        if (!state.isTranslating) return;
        
        if (sentenceIndex < sampleSentences.length) {
            const sentence = sampleSentences[sentenceIndex];
            const translated = translateSentence(sentence);
            state.currentSTT = sentence;
            
            // 이전 문장을 번역 기록에 추가 (첫 문장이 아닐 때)
            if (sentenceIndex > 0 && state.translations.length > 0) {
                const previousTranslation = state.translations[state.translations.length - 1];
                if (!previousTranslation.addedToHistory) {
                    addTranslationToHistory(previousTranslation);
                    previousTranslation.addedToHistory = true;
                }
            }
            
            // 실시간 자막에 추가 (한 문장만 표시)
            addRealtimeCaption(sentence);
            
            // 번역된 텍스트 추가 (시뮬레이션, 한 문장만 표시)
            setTimeout(() => {
                addTranslatedCaption(translated);
            }, 500);
            
            // 번역 데이터 저장 (여러 언어를 하나의 문자열로 결합하여 저장)
            const translation = {
                original: sentence,
                translated: translated.map(t => t.text).join(' | '), // 여러 언어를 구분자로 결합
                translations: translated, // 각 언어별 번역도 별도로 저장
                timestamp: new Date(),
                addedToHistory: false
            };
            state.translations.push(translation);
            
            sentenceIndex++;
        } else {
            // 모든 문장을 표시한 후 반복
            sentenceIndex = 0;
        }
    }, 3000); // 3초마다 새 문장 추가
}

// STT 시뮬레이션 정지
function stopSTTSimulation() {
    if (sttSimulationInterval) {
        clearInterval(sttSimulationInterval);
        sttSimulationInterval = null;
    }
}

// 번역 함수 (시뮬레이션)
function translateSentence(sentence) {
    // 실제로는 API를 호출하여 번역하지만, 여기서는 시뮬레이션
    // 설정된 Output Languages에 따라 번역 생성
    const translations = {
        '안녕하세요. 오늘은 웹 프로그래밍에 대해 배워보겠습니다.': {
            'LANGUAGE::ENGLISH': 'Hello. Today we will learn about web programming.',
            'LANGUAGE::CHINESE': '你好。今天我们将学习网络编程。',
            'LANGUAGE::JAPANESE': 'こんにちは。今日はウェブプログラミングについて学びます。',
            'LANGUAGE::VIETNAMESE': 'Xin chào. Hôm nay chúng ta sẽ học về lập trình web.',
            'default': 'Hello. Today we will learn about web programming.'
        },
        '먼저 HTML과 CSS의 기본 개념을 설명하겠습니다.': {
            'LANGUAGE::ENGLISH': 'First, I will explain the basic concepts of HTML and CSS.',
            'LANGUAGE::CHINESE': '首先，我将解释HTML和CSS的基本概念。',
            'LANGUAGE::JAPANESE': 'まず、HTMLとCSSの基本概念を説明します。',
            'LANGUAGE::VIETNAMESE': 'Đầu tiên, tôi sẽ giải thích các khái niệm cơ bản của HTML và CSS.',
            'default': 'First, I will explain the basic concepts of HTML and CSS.'
        },
        'HTML은 웹 페이지의 구조를 정의하는 마크업 언어입니다.': {
            'LANGUAGE::ENGLISH': 'HTML is a markup language that defines the structure of web pages.',
            'LANGUAGE::CHINESE': 'HTML是定义网页结构的标记语言。',
            'LANGUAGE::JAPANESE': 'HTMLは、ウェブページの構造を定義するマークアップ言語です。',
            'LANGUAGE::VIETNAMESE': 'HTML là ngôn ngữ đánh dấu định nghĩa cấu trúc của các trang web.',
            'default': 'HTML is a markup language that defines the structure of web pages.'
        },
        'CSS는 웹 페이지의 스타일을 정의하는 스타일시트 언어입니다.': {
            'LANGUAGE::ENGLISH': 'CSS is a stylesheet language that defines the style of web pages.',
            'LANGUAGE::CHINESE': 'CSS是定义网页样式的样式表语言。',
            'LANGUAGE::JAPANESE': 'CSSは、ウェブページのスタイルを定義するスタイルシート言語です。',
            'LANGUAGE::VIETNAMESE': 'CSS là ngôn ngữ bảng định kiểu định nghĩa phong cách của các trang web.',
            'default': 'CSS is a stylesheet language that defines the style of web pages.'
        },
        'JavaScript는 웹 페이지에 동적인 기능을 추가하는 프로그래밍 언어입니다.': {
            'LANGUAGE::ENGLISH': 'JavaScript is a programming language that adds dynamic functionality to web pages.',
            'LANGUAGE::CHINESE': 'JavaScript是一种为网页添加动态功能的编程语言。',
            'LANGUAGE::JAPANESE': 'JavaScriptは、ウェブページに動的な機能を追加するプログラミング言語です。',
            'LANGUAGE::VIETNAMESE': 'JavaScript là ngôn ngữ lập trình thêm chức năng động vào các trang web.',
            'default': 'JavaScript is a programming language that adds dynamic functionality to web pages.'
        },
        '오늘 수업은 여기까지입니다. 다음 시간에 뵙겠습니다.': {
            'LANGUAGE::ENGLISH': 'That\'s all for today\'s class. See you next time.',
            'LANGUAGE::CHINESE': '今天的课程到此结束。下次见。',
            'LANGUAGE::JAPANESE': '今日の授業はここまでです。次回お会いしましょう。',
            'LANGUAGE::VIETNAMESE': 'Đó là tất cả cho lớp học hôm nay. Hẹn gặp lại lần sau.',
            'default': 'That\'s all for today\'s class. See you next time.'
        }
    };
    
    const sentenceTranslations = translations[sentence];
    if (!sentenceTranslations) {
        // 선택된 언어가 없으면 기본값 반환
        if (state.outputLanguages.length > 0) {
            return state.outputLanguages.map(lang => ({
                language: lang,
                text: `[Translated: ${sentence}]`
            }));
        }
        return [{ language: 'default', text: `[Translated: ${sentence}]` }];
    }
    
    // 설정된 모든 Output Languages에 대한 번역 반환
    const result = [];
    if (state.outputLanguages.length > 0) {
        state.outputLanguages.forEach(lang => {
            const translatedText = sentenceTranslations[lang] || sentenceTranslations['default'];
            result.push({
                language: lang,
                text: translatedText
            });
        });
    } else {
        // 선택된 언어가 없으면 기본값 반환
        result.push({
            language: 'default',
            text: sentenceTranslations['default'] || `[Translated: ${sentence}]`
        });
    }
    
    return result;
}

// 타이핑 애니메이션 함수 (기존 텍스트에 이어서 추가)
function typeTextAppend(element, text, speed = 30) {
    let index = 0;
    const currentText = element.textContent;
    const separator = currentText ? ' ' : ''; // 기존 텍스트가 있으면 공백 추가
    
    // 타이핑 중 표시를 위한 부모 요소 찾기
    const textBlock = element.closest('.text-block');
    if (textBlock) {
        textBlock.classList.add('typing');
    }
    
    const typeInterval = setInterval(() => {
        if (index < text.length) {
            element.textContent = currentText + separator + text.substring(0, index + 1);
            index++;
        } else {
            clearInterval(typeInterval);
            // 타이핑 완료 후 클래스 제거
            if (textBlock) {
                textBlock.classList.remove('typing');
            }
        }
    }, speed);
    
    return typeInterval;
}

// 타이핑 애니메이션 함수 (새 텍스트로 시작)
function typeText(element, text, speed = 30) {
    let index = 0;
    
    // 타이핑 중 표시를 위한 부모 요소 찾기
    const textBlock = element.closest('.text-block');
    if (textBlock) {
        textBlock.classList.add('typing');
    }
    
    // 초기 텍스트 비우기
    element.textContent = '';
    
    const typeInterval = setInterval(() => {
        if (index < text.length) {
            element.textContent = text.substring(0, index + 1);
            index++;
        } else {
            clearInterval(typeInterval);
            // 타이핑 완료 후 클래스 제거
            if (textBlock) {
                textBlock.classList.remove('typing');
            }
        }
    }, speed);
    
    return typeInterval;
}

// 실시간 자막 추가 - 한 문장마다 한 박스로 생성
function addRealtimeCaption(text) {
    const contentElement = document.getElementById('cp_cols_content_1');
    if (!contentElement) return;
    
    // 새로운 텍스트 블록 생성 (각 문장마다)
    const textBlock = document.createElement('div');
    textBlock.className = 'text-block';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'text-block-content';
    
    textBlock.appendChild(contentEl);
    // 새로운 박스를 맨 아래에 추가 (위에서부터 내려오도록)
    contentElement.appendChild(textBlock);
    
    // 위에서 내려오는 애니메이션 효과
    textBlock.style.opacity = '0';
    textBlock.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        textBlock.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        textBlock.style.opacity = '1';
        textBlock.style.transform = 'translateY(0)';
    }, 10);
    
    // 타이핑 애니메이션 시작 (새 텍스트로)
    typeText(contentEl, text, 20);
    
    // 스크롤을 맨 아래로 (최신 텍스트가 보이도록)
    const scrollInterval = setInterval(() => {
        contentElement.scrollTop = contentElement.scrollHeight;
    }, 50);
    
    // 타이핑 완료 후 스크롤 정리
    setTimeout(() => {
        clearInterval(scrollInterval);
        contentElement.scrollTop = contentElement.scrollHeight;
    }, text.length * 20 + 100);
}

// 번역된 자막 추가 - 한 문장마다 한 박스로 생성
function addTranslatedCaption(translations) {
    if (Array.isArray(translations)) {
        // 같은 문장의 번역들을 그룹화하기 위한 고유 ID 생성
        const sentenceId = `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const textBlocks = [];
        let maxTypingDuration = 0;
        
        translations.forEach((trans) => {
            const contentId = `cp_cols_content_${trans.language}`;
            const contentElement = document.getElementById(contentId);
            if (contentElement) {
                // 새로운 텍스트 블록 생성 (각 문장마다)
                const textBlock = document.createElement('div');
                textBlock.className = 'text-block';
                textBlock.setAttribute('data-sentence-id', sentenceId);
                
                const contentEl = document.createElement('div');
                contentEl.className = 'text-block-content';
                
                textBlock.appendChild(contentEl);
                // 새로운 박스를 맨 아래에 추가 (위에서부터 내려오도록)
                contentElement.appendChild(textBlock);
                textBlocks.push(textBlock);
                
                // 위에서 내려오는 애니메이션 효과
                textBlock.style.opacity = '0';
                textBlock.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    textBlock.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    textBlock.style.opacity = '1';
                    textBlock.style.transform = 'translateY(0)';
                }, 10);
                
                // 타이핑 애니메이션 시작 (새 텍스트로)
                typeText(contentEl, trans.text, 20);
                
                // 스크롤을 맨 아래로 (최신 텍스트가 보이도록)
                const scrollInterval = setInterval(() => {
                    contentElement.scrollTop = contentElement.scrollHeight;
                }, 50);
                
                // 타이핑 완료 후 스크롤 정리
                const typingDuration = trans.text.length * 20 + 100;
                if (typingDuration > maxTypingDuration) {
                    maxTypingDuration = typingDuration;
                }
                
                setTimeout(() => {
                    clearInterval(scrollInterval);
                    contentElement.scrollTop = contentElement.scrollHeight;
                }, typingDuration);
            }
        });
        
        // 모든 번역의 타이핑이 완료된 후 높이 동기화
        setTimeout(() => {
            syncTextBlockHeights(sentenceId);
        }, maxTypingDuration + 300);
    } else {
        // 기존 호환성을 위해 문자열인 경우도 처리
        const firstOutputPanel = document.querySelector('.cp_cols_container:not(:first-child) .cp_cols_content');
        if (firstOutputPanel) {
            // 새로운 텍스트 블록 생성 (각 문장마다)
            const textBlock = document.createElement('div');
            textBlock.className = 'text-block';
            
            const contentEl = document.createElement('div');
            contentEl.className = 'text-block-content';
            
            textBlock.appendChild(contentEl);
            // 새로운 박스를 맨 아래에 추가 (위에서부터 내려오도록)
            firstOutputPanel.appendChild(textBlock);
            
            // 위에서 내려오는 애니메이션 효과
            textBlock.style.opacity = '0';
            textBlock.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                textBlock.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                textBlock.style.opacity = '1';
                textBlock.style.transform = 'translateY(0)';
            }, 10);
            
            // 타이핑 애니메이션 시작 (새 텍스트로)
            typeText(contentEl, translations, 20);
            
            // 스크롤을 맨 아래로 (최신 텍스트가 보이도록)
            const scrollInterval = setInterval(() => {
                firstOutputPanel.scrollTop = firstOutputPanel.scrollHeight;
            }, 50);
            
            // 타이핑 완료 후 스크롤 정리
            setTimeout(() => {
                clearInterval(scrollInterval);
                firstOutputPanel.scrollTop = firstOutputPanel.scrollHeight;
            }, translations.length * 20 + 100);
        }
    }
}

// 같은 문장의 번역 박스들의 높이를 동기화하는 함수
function syncTextBlockHeights(sentenceId) {
    const textBlocks = document.querySelectorAll(`.text-block[data-sentence-id="${sentenceId}"]`);
    if (textBlocks.length === 0) return;
    
    // 가장 높은 박스의 높이 찾기
    let maxHeight = 0;
    textBlocks.forEach(block => {
        // 실제 높이 측정 (offsetHeight 사용)
        const height = block.offsetHeight;
        if (height > maxHeight) {
            maxHeight = height;
        }
    });
    
    // 모든 박스에 최대 높이 적용
    if (maxHeight > 0) {
        textBlocks.forEach(block => {
            block.style.height = `${maxHeight}px`;
        });
    }
}

// 언어 레이블 가져오기 함수
function getLanguageLabel(languageCode) {
    const labels = {
        'ko': '한국어',
        'LANGUAGE::KOREAN': '한국어',
        'LANGUAGE::ENGLISH': 'English',
        'LANGUAGE::CHINESE': '中文',
        'LANGUAGE::JAPANESE': '日本語',
        'LANGUAGE::VIETNAMESE': 'Tiếng Việt',
        'LANGUAGE::UZBEK': 'O\'zbek',
        'LANGUAGE::MONGOLIAN': 'Монгол',
        'LANGUAGE::INDONESIAN': 'Bahasa Indonesia',
        'LANGUAGE::NEPALI': 'नेपाली',
        'LANGUAGE::RUSSIAN': 'Русский',
        'LANGUAGE::THAI': 'ไทย',
        'LANGUAGE::KHMER': 'ភាសាខ្មែរ',
        'LANGUAGE::KAZAKH': 'Қазақ',
        'LANGUAGE::KYRGYZ': 'Кыргызча',
        'LANGUAGE::MYANMAR': 'မြန်မာ',
        'LANGUAGE::ARABIC': 'العربية',
        'LANGUAGE::HINDI': 'हिन्दी',
        'LANGUAGE::PASHTO': 'پښتو',
        'LANGUAGE::FILIPINO': 'Filipino',
        'LANGUAGE::FRENCH': 'Français',
        'LANGUAGE::SPANISH': 'Español',
        'LANGUAGE::BENGALI': 'বাংলা',
        'en': 'English',
        'zh': '中文',
        'ja': '日本語',
        'es': 'Español'
    };
    return labels[languageCode] || 'English';
}

// 자막 영역 초기화
function clearCaptions() {
    // 모든 패널의 내용 제거
    const allContentPanels = document.querySelectorAll('.cp_cols_content');
    allContentPanels.forEach(panel => {
        const textBlocks = panel.querySelectorAll('.text-block');
        textBlocks.forEach(block => block.remove());
        // 스크롤을 맨 위로 설정 (위에서부터 내려오도록)
        panel.scrollTop = 0;
    });
}

// 번역 데이터 저장
function saveTranslationData() {
    const translationData = {
        subjectId: state.selectedSubject.id,
        subjectName: state.selectedSubject.name,
        subjectCode: state.selectedSubject.code,
        startTime: state.startTime,
        endTime: new Date(),
        duration: new Date() - state.startTime,
        translations: state.translations
    };
    
    // localStorage에 저장 (실제로는 서버에 전송)
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    history.push(translationData);
    localStorage.setItem('translationHistory', JSON.stringify(history));
    
    console.log('번역 데이터 저장됨:', translationData);
    
    // 번역 기록 다시 렌더링
    renderHistory();
}

// Toast 알림 표시
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// 랜덤 Room Code 생성 (4자리 숫자)
function generateRoomCode() {
    const numbers = '0123456789';
    const codeLength = 4;
    let code = '';
    
    // 4자리 숫자 생성
    for (let i = 0; i < codeLength; i++) {
        code += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    return code;
}

// Room Code를 화면에 표시
function displayRoomCode() {
    // localStorage에서 기존 Room Code 확인, 없으면 새로 생성
    let roomCode = localStorage.getItem('currentRoomCode');
    if (!roomCode) {
        roomCode = generateRoomCode();
    }
    
    // 띄어쓰기 제거 (기존 코드에 띄어쓰기가 있을 수 있음)
    roomCode = roomCode.replace(/\s/g, '');
    
    // 띄어쓰기 제거된 코드를 다시 저장
    localStorage.setItem('currentRoomCode', roomCode);
    
    // 상단 헤더의 Room Code 표시
    const roomCodeDisplayHeader = document.getElementById('roomCodeDisplayHeader');
    if (roomCodeDisplayHeader) {
        roomCodeDisplayHeader.textContent = roomCode;
    }
}

// Room Code 모달 표시
function showRoomCodeModal() {
    const modal = document.getElementById('roomCodeModal');
    const codeDisplay = document.getElementById('roomCodeDisplay');
    
    if (modal && codeDisplay) {
        // 새로고침 시마다 새로운 코드 생성
        const roomCode = generateRoomCode();
        codeDisplay.innerHTML = `<p class="code-text">${roomCode}</p>`;
        modal.classList.add('active');
    }
}

// Room Code 모달 닫기
function closeRoomCodeModal() {
    const modal = document.getElementById('roomCodeModal');
    if (modal) {
        modal.classList.remove('active');
    }
}


// Language Settings 모달 관련 함수
function showLanguagePopup() {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.classList.add('active');
        
        // 현재 설정된 값 불러오기 (localStorage 우선, 그 다음 state, 마지막 기본값)
        const speakerSelect = document.getElementById('speakerLanguageCd');
        const inputSelect = document.getElementById('popup_inputLanguageCd');
        if (inputSelect) {
            const savedInputLanguage = localStorage.getItem('inputLanguage');
            // null 값이면 기본값 'ko'로 설정
            const inputLang = savedInputLanguage || state.inputLanguage || (speakerSelect ? speakerSelect.value : 'ko');
            const finalLang = (inputLang === 'null' || inputLang === null) ? 'ko' : inputLang;
            
            // select의 value 설정
            inputSelect.value = finalLang;
            
            // 모든 option의 selected 속성 제거 후 해당 option에 selected 추가
            const options = inputSelect.querySelectorAll('option');
            options.forEach(opt => {
                opt.removeAttribute('selected');
                if (opt.value === finalLang) {
                    opt.setAttribute('selected', 'selected');
                }
            });
            
            // state에도 반영
            state.inputLanguage = finalLang;
            if (savedInputLanguage && savedInputLanguage !== 'null') {
                state.inputLanguage = savedInputLanguage;
            }
            
            // 강제로 change 이벤트 발생시켜 UI 업데이트
            inputSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Output Languages 체크박스 상태 불러오기 (state에 저장된 설정 우선)
        const outputCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]');
        if (state.outputLanguages.length > 0) {
            // state에 저장된 설정 사용
            outputCheckboxes.forEach(cb => {
                cb.checked = state.outputLanguages.includes(cb.value);
            });
        } else {
            // form에서 불러오기 (기존 로직)
            const form = document.getElementById('form-language-update');
            if (form) {
                const checkboxes = form.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const value = checkbox.value;
                    let outputCheckbox = null;
                    
                    if (value === 'LANGUAGE::ENGLISH') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_1');
                    } else if (value === 'LANGUAGE::CHINESE') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_2');
                    } else if (value === 'LANGUAGE::JAPANESE') {
                        outputCheckbox = document.getElementById('popup_speakerLanguageCd_3');
                    }
                    
                    if (outputCheckbox) {
                        outputCheckbox.checked = checkbox.checked;
                    }
                });
            }
        }
    }
}

// 과목만 저장 (과목 선택 모달에서)
function saveSubjectOnly() {
    // 과목 선택 확인
    if (!state.selectedSubject) {
        showToast('과목을 선택해주세요.');
        return;
    }
    
    // localStorage에 과목 저장
    localStorage.setItem('selectedSubject', JSON.stringify(state.selectedSubject));
    
    // 버튼 텍스트 업데이트
    elements.subjectSelectText.textContent = state.selectedSubject.name;
    
    showToast('과목이 저장되었습니다.');
    hideSubjectModal();
    
    // 버튼 상태 업데이트
    updateButtonStates();
}

// 과목 및 언어 설정 저장 (과목 선택 모달에서)
function saveSubjectAndLanguageSettings() {
    // 과목 선택 확인
    if (!state.selectedSubject) {
        showToast('과목을 선택해주세요.');
        showSubjectStep();
        return;
    }
    
    // Input Language 저장
    const inputSelect = document.getElementById('subjectModal_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect && speakerSelect) {
        speakerSelect.value = inputSelect.value;
        // 상태에 저장
        state.inputLanguage = inputSelect.value;
        // localStorage에 저장
        localStorage.setItem('inputLanguage', inputSelect.value);
    }
    
    // Output Languages 저장
    const outputCheckboxes = document.querySelectorAll('input[name="subjectModal_speakerLanguageCd"]:checked');
    const form = document.getElementById('form-language-update');
    
    // 최소 하나의 언어는 선택되어야 함
    if (outputCheckboxes.length === 0) {
        showToast('최소 하나의 출력 언어를 선택해주세요.');
        return;
    }
    
    // 상태에 저장
    state.outputLanguages = [];
    outputCheckboxes.forEach(cb => {
        state.outputLanguages.push(cb.value);
    });
    // localStorage에 저장
    localStorage.setItem('outputLanguages', JSON.stringify(state.outputLanguages));
    
    if (form) {
        // 모든 체크박스 해제
        const formCheckboxes = form.querySelectorAll('input[type="checkbox"]');
        formCheckboxes.forEach(cb => cb.checked = false);
        
        // 선택된 언어에 따라 체크
        outputCheckboxes.forEach(outputCb => {
            const value = outputCb.value;
            let formCheckbox = null;
            
            if (value === 'LANGUAGE::ENGLISH') {
                formCheckbox = document.getElementById('languageCd_1');
            } else if (value === 'LANGUAGE::CHINESE') {
                formCheckbox = document.getElementById('languageCd_2');
            } else if (value === 'LANGUAGE::JAPANESE') {
                formCheckbox = document.getElementById('languageCd_3');
            } else if (value === 'LANGUAGE::VIETNAMESE') {
                formCheckbox = document.getElementById('languageCd_4');
            }
            
            if (formCheckbox) {
                formCheckbox.checked = true;
            }
        });
    }
    
    // Translated 박스 구분 영역 업데이트
    updateTranslatedLayout();
    
    showToast('과목 및 언어 설정이 저장되었습니다.');
    hideSubjectModal();
    
    // 설정이 변경되었으므로 번역 중이면 재시작 알림
    if (state.isTranslating) {
        showToast('설정이 변경되었습니다. 번역을 재시작해주세요.');
    }
}

function closeLanguageModal() {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.classList.remove('active');
    }
}

function saveLanguageSettings() {
    // Input Language 저장
    const inputSelect = document.getElementById('popup_inputLanguageCd');
    const speakerSelect = document.getElementById('speakerLanguageCd');
    if (inputSelect && speakerSelect) {
        speakerSelect.value = inputSelect.value;
        // 상태에 저장
        state.inputLanguage = inputSelect.value;
        // localStorage에 저장
        localStorage.setItem('inputLanguage', inputSelect.value);
    }
    
    // Output Languages 저장
    const outputCheckboxes = document.querySelectorAll('input[name="popup_speakerLanguageCd"]:checked');
    
    // 최소 하나의 언어는 선택되어야 함
    if (outputCheckboxes.length === 0) {
        showToast('최소 하나의 출력 언어를 선택해주세요.');
        return;
    }
    
    // 최대 3개까지 선택 가능
    if (outputCheckboxes.length > 3) {
        showToast('최대 3개까지 선택 가능합니다.');
        return;
    }
    
    // 상태에 저장
    state.outputLanguages = [];
    outputCheckboxes.forEach(cb => {
        state.outputLanguages.push(cb.value);
    });
    // localStorage에 저장
    localStorage.setItem('outputLanguages', JSON.stringify(state.outputLanguages));
    
    // Translated 박스 구분 영역 업데이트
    updateTranslatedLayout();
    
    showToast('언어 설정이 저장되었습니다.');
    closeLanguageModal();
    
    // 설정이 변경되었으므로 번역 중이면 재시작 알림
    if (state.isTranslating) {
        showToast('언어 설정이 변경되었습니다. 번역을 재시작해주세요.');
    }
}

// 모달 외부 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
        languageModal.addEventListener('click', (e) => {
            if (e.target === languageModal) {
                closeLanguageModal();
            }
        });
    }
    
    // 번역 기록 초기화
    initHistorySection();
});

// 번역 기록 섹션 관련 함수
function initHistorySection() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        // 과목 필터 옵션 추가
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = `${subject.name} (${subject.code})`;
            subjectFilter.appendChild(option);
        });
        
        // 필터 변경 이벤트
        subjectFilter.addEventListener('change', renderHistory);
        
        // 초기 렌더링
        renderHistory();
    }
}

function showHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        historySection.style.display = 'block';
        renderHistory();
        // 스크롤을 기록 섹션으로 이동
        setTimeout(() => {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// 현재 번역 기록 항목 생성
function createCurrentHistoryItem() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // 기존 기록들을 먼저 렌더링
    renderHistory();
    
    // 현재 번역 항목 생성
    const currentItem = document.createElement('div');
    currentItem.className = 'history-item current-translation';
    currentItem.id = 'currentHistoryItem';
    
    const startTime = new Date(state.startTime).toLocaleString('ko-KR');
    
    currentItem.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-title">${state.selectedSubject.name} (${state.selectedSubject.code}) - 진행 중</div>
            <div class="history-item-meta">
                시작: ${startTime}
            </div>
        </div>
        <div class="history-item-content" id="currentHistoryContent">
            <!-- 실시간 번역이 여기에 추가됩니다 -->
        </div>
    `;
    
    // 기록 목록 맨 위에 추가
    historyList.insertBefore(currentItem, historyList.firstChild);
    state.currentHistoryItem = currentItem;
}

// 번역 기록에 실시간으로 추가
function addTranslationToHistory(translation) {
    if (!state.currentHistoryItem) {
        // 현재 번역 항목이 없으면 생성
        createCurrentHistoryItem();
    }
    
    const contentArea = document.getElementById('currentHistoryContent');
    if (!contentArea) return;
    
    const translationPair = document.createElement('div');
    translationPair.className = 'translation-pair';
    
    // 여러 언어 번역 표시 (이미지처럼 한 줄씩)
    let translatedHTML = '';
    if (translation.translations && Array.isArray(translation.translations)) {
        const languageNames = {
            'LANGUAGE::ENGLISH': 'English',
            'LANGUAGE::CHINESE': '中文',
            'LANGUAGE::SPANISH': 'Español',
            'LANGUAGE::JAPANESE': '日本語',
            'LANGUAGE::VIETNAMESE': 'Tiếng Việt',
            'LANGUAGE::UZBEK': 'O\'zbek',
            'LANGUAGE::MONGOLIAN': 'Монгол',
            'LANGUAGE::INDONESIAN': 'Bahasa Indonesia',
            'LANGUAGE::NEPALI': 'नेपाली',
            'LANGUAGE::RUSSIAN': 'Русский',
            'LANGUAGE::THAI': 'ไทย',
            'LANGUAGE::KHMER': 'ភាសាខ្មែរ',
            'LANGUAGE::KAZAKH': 'Қазақ',
            'LANGUAGE::KYRGYZ': 'Кыргызча',
            'LANGUAGE::MYANMAR': 'မြန်မာ',
            'LANGUAGE::ARABIC': 'العربية',
            'LANGUAGE::HINDI': 'हिन्दी',
            'LANGUAGE::PASHTO': 'پښتو',
            'LANGUAGE::FILIPINO': 'Filipino',
            'LANGUAGE::FRENCH': 'Français',
            'LANGUAGE::BENGALI': 'বাংলা',
            'default': 'Default'
        };
        
        translatedHTML = translation.translations.map(trans => {
            const langName = languageNames[trans.language] || trans.language;
            return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${trans.text}</span></div>`;
        }).join('');
    } else {
        // 기존 호환성: 문자열을 파싱하여 표시
        if (translation.translated && translation.translated.includes(' | ')) {
            const parts = translation.translated.split(' | ');
            const langNames = ['English', '中文', 'Español', '日本語'];
            translatedHTML = parts.map((text, idx) => {
                const langName = langNames[idx] || `Language ${idx + 1}`;
                return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${text}</span></div>`;
            }).join('');
        } else {
            translatedHTML = `<div class="translation-lang-line"><span class="translation-lang-text">${translation.translated || ''}</span></div>`;
        }
    }
    
    translationPair.innerHTML = `
        <div class="original">${translation.original}</div>
        <div class="translated">${translatedHTML}</div>
    `;
    
    contentArea.appendChild(translationPair);
    
    // 스크롤을 최신 항목으로 이동
    contentArea.scrollTop = contentArea.scrollHeight;
}

// 현재 번역 기록 항목 업데이트
function updateCurrentHistoryItem() {
    if (!state.currentHistoryItem) return;
    
    const endTime = new Date().toLocaleString('ko-KR');
    const duration = formatDuration(new Date() - state.startTime);
    
    const header = state.currentHistoryItem.querySelector('.history-item-header');
    if (header) {
        header.innerHTML = `
            <div class="history-item-title">${state.selectedSubject.name} (${state.selectedSubject.code})</div>
            <div class="history-item-meta">
                ${new Date(state.startTime).toLocaleString('ko-KR')} ~ ${endTime} (${duration})
            </div>
        `;
    }
    
    // 진행 중 클래스 제거
    state.currentHistoryItem.classList.remove('current-translation');
}

function closeHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        historySection.style.display = 'none';
    }
}

function toggleHistorySection() {
    const historySection = document.getElementById('translationHistorySection');
    if (historySection) {
        if (historySection.style.display === 'none' || historySection.style.display === '') {
            showHistorySection();
        } else {
            closeHistorySection();
        }
    }
}

// Real-time Caption 토글 함수 (강의 언어 패널 숨기기/보이기)
function toggleRealtimeCaption() {
    const captionContainer = document.querySelector('.cp_cols_container:first-child');
    const closeBtn = document.getElementById('captionCloseBtn');
    
    if (captionContainer) {
        const isHidden = captionContainer.classList.contains('hidden');
        
        if (isHidden) {
            // 보이기
            captionContainer.classList.remove('hidden');
            if (closeBtn) closeBtn.style.display = 'flex';
        } else {
            // 숨기기
            captionContainer.classList.add('hidden');
            if (closeBtn) closeBtn.style.display = 'none';
        }
    }
}


function goToTranslationHistory() {
    window.location.href = 'translation-history.html';
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const subjectFilter = document.getElementById('subjectFilter');
    
    if (!historyList || !subjectFilter) return;
    
    // 현재 번역 중인 항목 보존
    const currentItem = document.getElementById('currentHistoryItem');
    const currentItemElement = currentItem ? currentItem.cloneNode(true) : null;
    
    const selectedSubjectId = subjectFilter.value;
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    
    // 필터링
    let filteredHistory = history;
    if (selectedSubjectId !== 'all') {
        filteredHistory = history.filter(item => item.subjectId == selectedSubjectId);
    }
    
    // 최신순 정렬
    filteredHistory.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    
    // 렌더링
    historyList.innerHTML = '';
    
    // 현재 번역 중인 항목이 있으면 맨 위에 표시
    if (currentItemElement && state.isTranslating) {
        historyList.appendChild(currentItemElement);
        state.currentHistoryItem = document.getElementById('currentHistoryItem');
    }
    
    // 기존 기록이 없고 현재 번역도 없으면 빈 상태 표시
    if (filteredHistory.length === 0 && !currentItemElement) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">번역 기록이 없습니다.</div>
            </div>
        `;
        return;
    }
    
    // 기존 기록 렌더링
    filteredHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const startTime = new Date(item.startTime).toLocaleString('ko-KR');
        const endTime = new Date(item.endTime).toLocaleString('ko-KR');
        const duration = formatDuration(item.duration);
        const borderColor = getSubjectColor(item.subjectId);
        
        historyItem.style.borderLeftColor = borderColor;
        
        // 번역 내용 HTML 생성 (이미지처럼 한 줄씩)
        const translationsHTML = item.translations.map(trans => {
            // 여러 언어 번역 표시
            let translatedHTML = '';
            if (trans.translations && Array.isArray(trans.translations)) {
                const languageNames = {
                    'LANGUAGE::ENGLISH': 'English',
                    'LANGUAGE::CHINESE': '中文',
                    'LANGUAGE::SPANISH': 'Español',
                    'LANGUAGE::JAPANESE': '日本語',
                    'default': 'Default'
                };
                
                translatedHTML = trans.translations.map(t => {
                    const langName = languageNames[t.language] || t.language;
                    return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${t.text}</span></div>`;
                }).join('');
            } else {
                // 기존 호환성: 문자열을 파싱하여 표시
                if (trans.translated && trans.translated.includes(' | ')) {
                    const parts = trans.translated.split(' | ');
                    const langNames = ['English', '中文', 'Español', '日本語'];
                    translatedHTML = parts.map((text, idx) => {
                        const langName = langNames[idx] || `Language ${idx + 1}`;
                        return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${text}</span></div>`;
                    }).join('');
                } else {
                    translatedHTML = `<div class="translation-lang-line"><span class="translation-lang-text">${trans.translated || ''}</span></div>`;
                }
            }
            
            return `
                <div class="translation-pair">
                    <div class="original">${trans.original}</div>
                    <div class="translated">${translatedHTML}</div>
                </div>
            `;
        }).join('');
        
        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-title">${item.subjectName} (${item.subjectCode})</div>
                <div class="history-item-meta">
                    ${startTime} ~ ${endTime} (${duration})
                </div>
            </div>
            <div class="history-item-content">
                ${translationsHTML}
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// 시간 포맷팅
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds}초`;
    } else {
        return `${seconds}초`;
    }
}

// Q&A 패널 토글 함수
function toggleQAPanel() {
    const qaPanel = document.getElementById('qaSlidePanel');
    const qaOverlay = document.getElementById('qaOverlay');
    if (qaPanel) {
        const isActive = qaPanel.classList.contains('active');
        qaPanel.classList.toggle('active');
        
        // 패널이 열릴 때 알림 배지 리셋
        if (!isActive) {
            resetQANotification();
        }
    }
    if (qaOverlay) {
        qaOverlay.classList.toggle('active');
    }
}

// Q&A 알림 배지 업데이트
function updateQANotification() {
    const badge = document.getElementById('qaNotificationBadge');
    const badgeMobile = document.getElementById('qaNotificationBadgeMobile');
    
    const badges = [badge, badgeMobile].filter(b => b !== null);
    
    badges.forEach(badge => {
        if (state.qaNotificationCount > 0) {
            badge.textContent = state.qaNotificationCount > 99 ? '99+' : state.qaNotificationCount.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// Q&A 알림 배지 리셋
function resetQANotification() {
    state.qaNotificationCount = 0;
    updateQANotification();
}

// Q&A 알림 카운트 증가
function incrementQANotification() {
    state.qaNotificationCount++;
    updateQANotification();
}

// Q&A 채팅 초기화
function initQAChat() {
    const qaInput = document.getElementById('qaInput');
    const qaSendBtn = document.getElementById('qaSendBtn');
    const qaVoiceBtn = document.getElementById('qaVoiceBtn');
    
    // 전송 버튼 클릭
    if (qaSendBtn) {
        qaSendBtn.addEventListener('click', sendQAMessage);
    }
    
    // Enter 키로 전송
    if (qaInput) {
        qaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendQAMessage();
            }
        });
    }
    
    // 음성 인식 초기화
    function initSpeechRecognition() {
        // 브라우저 호환성 확인
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('이 브라우저는 음성 인식을 지원하지 않습니다.');
            if (qaVoiceBtn) {
                qaVoiceBtn.style.opacity = '0.5';
                qaVoiceBtn.style.cursor = 'not-allowed';
                qaVoiceBtn.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
            }
            return;
        }
        
        // 음성 인식 객체 생성
        state.recognition = new SpeechRecognition();
        state.recognition.lang = 'ko-KR'; // 한국어 설정
        state.recognition.continuous = false; // 한 번만 인식
        state.recognition.interimResults = false; // 최종 결과만
        
        // 음성 인식 시작
        state.recognition.onstart = () => {
            state.isListening = true;
            if (qaVoiceBtn) {
                qaVoiceBtn.classList.add('listening');
                qaVoiceBtn.style.background = '#ef4444';
            }
            if (qaInput) {
                qaInput.placeholder = '음성을 인식하는 중...';
            }
        };
        
        // 음성 인식 결과
        state.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (qaInput) {
                qaInput.value = transcript;
            }
        };
        
        // 음성 인식 종료
        state.recognition.onend = () => {
            state.isListening = false;
            if (qaVoiceBtn) {
                qaVoiceBtn.classList.remove('listening');
                qaVoiceBtn.style.background = '';
            }
            if (qaInput) {
                qaInput.placeholder = '답변을 입력하세요...';
            }
        };
        
        // 음성 인식 오류
        state.recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            state.isListening = false;
            if (qaVoiceBtn) {
                qaVoiceBtn.classList.remove('listening');
                qaVoiceBtn.style.background = '';
            }
            if (qaInput) {
                qaInput.placeholder = '답변을 입력하세요...';
            }
            
            // 'not-allowed' 오류는 알림 표시하지 않음
            if (event.error === 'not-allowed') {
                return;
            }
            
            let errorMessage = '음성 인식 중 오류가 발생했습니다.';
            if (event.error === 'no-speech') {
                errorMessage = '음성이 감지되지 않았습니다.';
            } else if (event.error === 'audio-capture') {
                errorMessage = '마이크에 접근할 수 없습니다.';
            }
            
            showToast(errorMessage);
        };
    }
    
    // 음성 인식 초기화 실행
    initSpeechRecognition();
    
    // 음성 버튼 클릭
    if (qaVoiceBtn) {
        qaVoiceBtn.addEventListener('click', () => {
            if (!state.recognition) {
                showToast('이 브라우저는 음성 인식을 지원하지 않습니다.');
                return;
            }
            
            if (state.isListening) {
                // 음성 인식 중지
                state.recognition.stop();
            } else {
                // 음성 인식 시작
                try {
                    state.recognition.start();
                } catch (error) {
                    console.error('음성 인식 시작 오류:', error);
                    if (error.message.includes('already started')) {
                        state.recognition.stop();
                        setTimeout(() => {
                            state.recognition.start();
                        }, 100);
                    }
                }
            }
        });
    }
    
    // 학생 질문 시뮬레이션 (테스트용 - 나중에 실제 학생 질문으로 대체)
    // simulateStudentQuestion('안녕하세요. 오늘 배운 내용에 대해 질문이 있습니다.');
}

// 마이크 넘기기 모드 토글
function toggleMicPassMode() {
    const qaMicToggleBtn = document.getElementById('qaMicToggleBtn');
    const qaInput = document.getElementById('qaInput');
    const qaVoiceBtn = document.getElementById('qaVoiceBtn');
    const qaSendBtn = document.getElementById('qaSendBtn');
    
    state.isMicPassedToStudents = !state.isMicPassedToStudents;
    
    if (qaMicToggleBtn) {
        if (state.isMicPassedToStudents) {
            qaMicToggleBtn.classList.add('active');
        } else {
            qaMicToggleBtn.classList.remove('active');
        }
    }
    
    // 입력 필드 상태 변경
    if (qaInput) {
        if (state.isMicPassedToStudents) {
            // 학생 질문 모드: 입력 필드 비활성화
            qaInput.disabled = true;
            qaInput.placeholder = '학생들이 질문할 수 있습니다.';
            qaInput.style.background = '#f1f5f9';
            qaInput.style.cursor = 'not-allowed';
        } else {
            // 교수자 답변 모드: 입력 필드 활성화
            qaInput.disabled = false;
            qaInput.placeholder = '답변을 입력하세요...';
            qaInput.style.background = '';
            qaInput.style.cursor = 'text';
        }
    }
    
    // 음성 버튼 상태 변경
    if (qaVoiceBtn) {
        if (state.isMicPassedToStudents) {
            qaVoiceBtn.disabled = true;
            qaVoiceBtn.style.opacity = '0.5';
            qaVoiceBtn.style.cursor = 'not-allowed';
        } else {
            qaVoiceBtn.disabled = false;
            qaVoiceBtn.style.opacity = '1';
            qaVoiceBtn.style.cursor = 'pointer';
        }
    }
    
    // 전송 버튼 상태 변경
    if (qaSendBtn) {
        if (state.isMicPassedToStudents) {
            qaSendBtn.disabled = true;
            qaSendBtn.style.opacity = '0.5';
            qaSendBtn.style.cursor = 'not-allowed';
        } else {
            qaSendBtn.disabled = false;
            qaSendBtn.style.opacity = '1';
            qaSendBtn.style.cursor = 'pointer';
        }
    }
}

// Q&A 메시지 전송 (교수자 모드)
function sendQAMessage() {
    // 마이크 넘기기 상태 확인
    if (state.isMicPassedToStudents) {
        showToast('현재 학생 질문 모드입니다. 마이크 넘기기 버튼을 클릭하여 교수자 모드로 전환하세요.');
        return;
    }
    
    const qaInput = document.getElementById('qaInput');
    const messageText = qaInput ? qaInput.value.trim() : '';
    
    if (!messageText) return;
    
    // 교수자 답변을 영어로 번역 (학생 언어로 변환)
    const translatedText = translateToEnglish(messageText);
    
    // 한국어 원문을 메인으로 표시, 영어 번역을 원문보기로 (학생 질문 박스와 동일한 디자인)
    addQAMessage(messageText, 'professor', translatedText);
    
    // 입력 필드 초기화
    if (qaInput) {
        qaInput.value = '';
    }
}

// 한국어를 영어로 번역 (시뮬레이션)
function translateToEnglish(koreanText) {
    // 실제로는 번역 API를 사용해야 하지만, 여기서는 패턴 기반 시뮬레이션
    const translationMap = {
        '좋은 질문입니다': 'That\'s a good question.',
        '설명드리겠습니다': 'Let me explain.',
        '자세히 설명': 'explain in detail',
        '차이점': 'difference',
        '변수 선언': 'variable declaration',
        '반응형 디자인': 'responsive design',
        '구현하는 방법': 'how to implement',
        'DOM 조작': 'DOM manipulation',
        '비동기 프로그래밍': 'asynchronous programming',
        '이해': 'understand',
        '예시': 'example',
        '중요한 개념': 'important concept',
        '웹 페이지': 'web page',
        '프로그래밍 언어': 'programming language',
        '마크업 언어': 'markup language',
        '스타일시트': 'stylesheet',
        'HTML': 'HTML',
        'CSS': 'CSS',
        'JavaScript': 'JavaScript',
        'let': 'let',
        'const': 'const',
        '변수': 'variable',
        '선언': 'declaration',
        '반응형': 'responsive',
        '디자인': 'design',
        '구현': 'implementation',
        '방법': 'method',
        'DOM': 'DOM',
        '조작': 'manipulation',
        '비동기': 'asynchronous',
        '프로그래밍': 'programming'
    };
    
    // 일반적인 문장 패턴 번역
    let translated = koreanText;
    
    // 긴 패턴부터 매칭 (우선순위)
    const sortedPatterns = Object.entries(translationMap).sort((a, b) => b[0].length - a[0].length);
    
    for (const [ko, en] of sortedPatterns) {
        if (translated.includes(ko)) {
            translated = translated.replace(new RegExp(ko.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
        }
    }
    
    // 문장 패턴 번역
    if (translated.includes('에 대해')) {
        translated = translated.replace(/에 대해/g, 'about');
    }
    if (translated.includes('설명해주세요') || translated.includes('설명해주실 수 있나요')) {
        translated = translated.replace(/설명해주세요|설명해주실 수 있나요/g, 'please explain');
    }
    if (translated.includes('알려주세요')) {
        translated = translated.replace(/알려주세요/g, 'please tell me');
    }
    if (translated.includes('무엇인가요')) {
        translated = translated.replace(/무엇인가요/g, 'what is');
    }
    if (translated.includes('입니다') || translated.includes('입니다.')) {
        translated = translated.replace(/입니다\.?/g, 'is');
    }
    if (translated.includes('합니다') || translated.includes('합니다.')) {
        translated = translated.replace(/합니다\.?/g, 'do');
    }
    
    // 번역이 제대로 안 된 경우 기본 메시지
    if (translated === koreanText || translated.length === koreanText.length) {
        // 간단한 번역 시뮬레이션 - 실제로는 번역 API 사용
        translated = `I'll explain that for you.`;
    }
    
    return translated;
}

// Q&A 메시지 추가
function addQAMessage(text, sender, originalText = null, translatedText = null, studentName = null) {
    const chatMessages = document.getElementById('qaChatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `qa-message ${sender}`;
    
    let senderName;
    if (sender === 'student') {
        if (studentName && typeof studentName === 'object') {
            // 학생 객체인 경우
            senderName = `${studentName.name} (${studentName.language})`;
        } else if (studentName) {
            // 문자열인 경우 (기존 호환성)
            senderName = `${studentName} (English)`;
        } else {
            senderName = '학생 (English)';
        }
    } else {
        senderName = '교수자';
    }
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 학생 질문에만 원문보기 버튼 표시 (교수자 답변에는 표시하지 않음)
    // 원문보기 버튼을 버블 안 하단에 배치
    let bubbleContent = text;
    if (sender === 'student' && originalText) {
        const messageId = `qa-message-${Date.now()}-${Math.random()}`;
        let buttonLabel;
        if (studentName && typeof studentName === 'object') {
            buttonLabel = `원문보기 (${studentName.language})`;
        } else {
            buttonLabel = '원문보기 (English)';
        }
        bubbleContent = `
            <div class="qa-bubble-text">${text}</div>
            <button class="qa-original-btn" onclick="toggleOriginalText('${messageId}')">
                ${buttonLabel}
            </button>
            <div class="qa-original-text" id="${messageId}">
                ${originalText}
            </div>
        `;
    } else if (sender === 'professor') {
        // 교수자 답변은 원문보기 없이 텍스트만 표시
        bubbleContent = `
            <div class="qa-bubble-text">${text}</div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="qa-message-sender">${senderName}</div>
        <div class="qa-message-bubble">${bubbleContent}</div>
        <div class="qa-message-time">${timeStr}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 원문보기 토글
function toggleOriginalText(messageId) {
    const originalText = document.getElementById(messageId);
    if (originalText) {
        const isVisible = originalText.classList.contains('show');
        if (isVisible) {
            originalText.classList.remove('show');
        } else {
            originalText.classList.add('show');
        }
    }
}

// 학생 정보 목록 (언어권별)
const students = [
    // 영어권
    { name: 'Alex', language: 'English', langCode: 'en' },
    { name: 'Sarah', language: 'English', langCode: 'en' },
    { name: 'Michael', language: 'English', langCode: 'en' },
    { name: 'Emily', language: 'English', langCode: 'en' },
    { name: 'David', language: 'English', langCode: 'en' },
    { name: 'Jessica', language: 'English', langCode: 'en' },
    // 중국어권
    { name: '李明', language: '中文', langCode: 'zh' },
    { name: '王芳', language: '中文', langCode: 'zh' },
    { name: '张伟', language: '中文', langCode: 'zh' },
    { name: '刘静', language: '中文', langCode: 'zh' },
    { name: '陈强', language: '中文', langCode: 'zh' },
    // 일본어권
    { name: '田中', language: '日本語', langCode: 'ja' },
    { name: '佐藤', language: '日本語', langCode: 'ja' },
    { name: '鈴木', language: '日本語', langCode: 'ja' },
    { name: '山田', language: '日本語', langCode: 'ja' },
    // 스페인어권
    { name: 'Carlos', language: 'Español', langCode: 'es' },
    { name: 'Maria', language: 'Español', langCode: 'es' },
    { name: 'Juan', language: 'Español', langCode: 'es' },
    { name: 'Ana', language: 'Español', langCode: 'es' },
    // 베트남어권
    { name: 'Nguyễn', language: 'Tiếng Việt', langCode: 'vi' },
    { name: 'Trần', language: 'Tiếng Việt', langCode: 'vi' },
    { name: 'Lê', language: 'Tiếng Việt', langCode: 'vi' }
];

// 랜덤 학생 선택 함수
function getRandomStudent() {
    return students[Math.floor(Math.random() * students.length)];
}

// 학생 질문 추가 함수 (외부에서 호출 가능)
function addStudentQuestion(questionText, originalKoreanText = null, student = null) {
    if (questionText && questionText.trim()) {
        // 학생 정보가 제공되지 않으면 랜덤으로 선택
        const selectedStudent = student || getRandomStudent();
        
        // 원본 질문을 한국어로 번역해서 메인으로 표시
        const koreanTranslation = originalKoreanText || translateToKorean(questionText);
        // 한국어 번역을 메인으로, 원본 언어 질문을 원문보기로
        addQAMessage(koreanTranslation, 'student', questionText.trim(), null, selectedStudent);
        
        // 패널이 닫혀있을 때만 알림 표시
        const qaPanel = document.getElementById('qaSlidePanel');
        if (qaPanel && !qaPanel.classList.contains('active')) {
            incrementQANotification();
        }
    }
}

// 영어를 한국어로 번역 (시뮬레이션)
function translateToKorean(englishText) {
    // 실제로는 번역 API를 사용해야 하지만, 여기서는 패턴 기반 시뮬레이션
    const translationMap = {
        'Can you explain': '설명해주실 수 있나요',
        'the difference between': '차이점',
        'in more detail': '더 자세히',
        'What is the difference': '차이점은 무엇인가요',
        'when declaring variables': '변수 선언 시',
        'How can I implement': '구현하는 방법',
        "I don't understand": '이해가 잘 안 됩니다',
        'Can you explain it with an example': '예시를 들어 설명해주실 수 있나요',
        'What is': '무엇인가요',
        'HTML': 'HTML',
        'CSS': 'CSS',
        'JavaScript': 'JavaScript',
        'let': 'let',
        'const': 'const',
        'responsive design': '반응형 디자인',
        'web pages': '웹 페이지',
        'DOM manipulation': 'DOM 조작',
        'asynchronous programming': '비동기 프로그래밍'
    };
    
    // 패턴 매칭으로 번역
    let translated = englishText;
    
    // 긴 패턴부터 매칭
    const sortedPatterns = Object.entries(translationMap).sort((a, b) => b[0].length - a[0].length);
    
    for (const [en, ko] of sortedPatterns) {
        const regex = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(translated)) {
            translated = translated.replace(regex, ko);
        }
    }
    
    // 번역이 제대로 안 된 경우 기본 메시지
    if (translated === englishText || translated.length === englishText.length) {
        // 간단한 번역 시뮬레이션 - 실제로는 번역 API 사용
        translated = `[번역됨] ${englishText}`;
    }
    
    return translated;
}

// Q&A 시뮬레이션 시작
function startQASimulation() {
    // 샘플 학생 질문들 (다양한 언어)
    const sampleQuestions = [
        // 영어 질문
        { 
            text: 'Can you explain the difference between HTML and CSS in more detail?',
            ko: 'HTML과 CSS의 차이점에 대해 더 자세히 설명해주실 수 있나요?',
            lang: 'en'
        },
        { 
            text: 'What is the difference between let and const when declaring variables in JavaScript?',
            ko: 'JavaScript에서 변수 선언 시 let과 const의 차이는 무엇인가요?',
            lang: 'en'
        },
        { 
            text: 'How can I implement responsive design for web pages?',
            ko: '웹 페이지의 반응형 디자인을 구현하는 방법을 알려주세요.',
            lang: 'en'
        },
        { 
            text: 'I don\'t understand what CSS is. Can you explain it with an example?',
            ko: 'CSS가 무엇인지 이해가 잘 안 됩니다. 예시를 들어 설명해주실 수 있나요?',
            lang: 'en'
        },
        { 
            text: 'What is DOM manipulation?',
            ko: 'DOM 조작이 무엇인가요?',
            lang: 'en'
        },
        // 중국어 질문
        { 
            text: '你能详细解释一下HTML和CSS的区别吗？',
            ko: 'HTML과 CSS의 차이점에 대해 더 자세히 설명해주실 수 있나요?',
            lang: 'zh'
        },
        { 
            text: 'JavaScript中变量声明时let和const的区别是什么？',
            ko: 'JavaScript에서 변수 선언 시 let과 const의 차이는 무엇인가요?',
            lang: 'zh'
        },
        { 
            text: '如何实现网页的响应式设计？',
            ko: '웹 페이지의 반응형 디자인을 구현하는 방법을 알려주세요.',
            lang: 'zh'
        },
        { 
            text: '我不太理解CSS是什么。你能举个例子解释一下吗？',
            ko: 'CSS가 무엇인지 이해가 잘 안 됩니다. 예시를 들어 설명해주실 수 있나요?',
            lang: 'zh'
        },
        // 일본어 질문
        { 
            text: 'HTMLとCSSの違いについて、もっと詳しく説明していただけますか？',
            ko: 'HTML과 CSS의 차이점에 대해 더 자세히 설명해주실 수 있나요?',
            lang: 'ja'
        },
        { 
            text: 'JavaScriptで変数を宣言する際のletとconstの違いは何ですか？',
            ko: 'JavaScript에서 변수 선언 시 let과 const의 차이는 무엇인가요?',
            lang: 'ja'
        },
        { 
            text: 'ウェブページのレスポンシブデザインを実装する方法を教えてください。',
            ko: '웹 페이지의 반응형 디자인을 구현하는 방법을 알려주세요.',
            lang: 'ja'
        },
        // 스페인어 질문
        { 
            text: '¿Puedes explicar la diferencia entre HTML y CSS con más detalle?',
            ko: 'HTML과 CSS의 차이점에 대해 더 자세히 설명해주실 수 있나요?',
            lang: 'es'
        },
        { 
            text: '¿Cuál es la diferencia entre let y const al declarar variables en JavaScript?',
            ko: 'JavaScript에서 변수 선언 시 let과 const의 차이는 무엇인가요?',
            lang: 'es'
        },
        { 
            text: '¿Cómo puedo implementar diseño responsivo para páginas web?',
            ko: '웹 페이지의 반응형 디자인을 구현하는 방법을 알려주세요.',
            lang: 'es'
        },
        // 베트남어 질문
        { 
            text: 'Bạn có thể giải thích sự khác biệt giữa HTML và CSS chi tiết hơn không?',
            ko: 'HTML과 CSS의 차이점에 대해 더 자세히 설명해주실 수 있나요?',
            lang: 'vi'
        },
        { 
            text: 'Sự khác biệt giữa let và const khi khai báo biến trong JavaScript là gì?',
            ko: 'JavaScript에서 변수 선언 시 let과 const의 차이는 무엇인가요?',
            lang: 'vi'
        }
    ];
    
    // 랜덤하게 질문 선택 (중복 방지를 위해 사용된 질문 추적)
    if (!state.usedQuestions) {
        state.usedQuestions = [];
    }
    
    // 사용되지 않은 질문만 필터링
    const availableQuestions = sampleQuestions.filter((q, index) => !state.usedQuestions.includes(index));
    
    // 모든 질문이 사용되었으면 리셋
    if (availableQuestions.length === 0) {
        state.usedQuestions = [];
        availableQuestions.push(...sampleQuestions);
    }
    
    // 랜덤하게 질문 선택
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];
    const originalIndex = sampleQuestions.indexOf(selectedQuestion);
    
    // 사용된 질문으로 표시
    state.usedQuestions.push(originalIndex);
    
    // 해당 언어권 학생 랜덤 선택
    const languageStudents = students.filter(s => s.langCode === selectedQuestion.lang);
    const selectedStudent = languageStudents.length > 0 
        ? languageStudents[Math.floor(Math.random() * languageStudents.length)]
        : getRandomStudent();
    
    // 학생 질문 추가 (원본 언어 질문과 한국어 번역)
    addStudentQuestion(selectedQuestion.text, selectedQuestion.ko, selectedStudent);
    
    // 추가 질문 시뮬레이션 (30초마다) - 강의 시작 전후 모두 작동
    setTimeout(() => {
        if (state.qaSimulationActive) {
            startQASimulation();
        }
    }, 30000);
}

