// 현재 날짜
let currentDate = new Date(2025, 10, 1); // 2025년 11월

// 달력 렌더링
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 월 표시
    document.getElementById('currentMonth').textContent = `${year}. ${String(month + 1).padStart(2, '0')}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // 이벤트 날짜와 배지 (이미지 기준)
    const specialDates = {
        1: { type: 'today', badge: { num: 1, color: 'red' } },
        2: { type: 'normal', badge: { num: 2, color: 'red' } },
        4: { type: 'normal', badge: { num: 1, color: 'red' } },
        11: { type: 'normal', badge: { num: 1, color: 'blue' } },
        17: { type: 'green', badge: null }
    };
    
    // 빈 칸
    for (let i = 0; i < firstDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-date empty';
        calendarDays.appendChild(empty);
    }
    
    // 날짜
    for (let date = 1; date <= lastDate; date++) {
        const dateEl = document.createElement('div');
        dateEl.className = 'cal-date';
        dateEl.textContent = date;
        
        const dayOfWeek = new Date(year, month, date).getDay();
        if (dayOfWeek === 0) dateEl.classList.add('sun');
        if (dayOfWeek === 6) dateEl.classList.add('sat');
        
        // 특별 날짜 처리
        if (specialDates[date]) {
            const special = specialDates[date];
            
            if (special.type === 'today') {
                dateEl.classList.add('today');
            } else if (special.type === 'green') {
                dateEl.classList.add('green');
            }
            
            // 배지 추가
            if (special.badge) {
                const badge = document.createElement('span');
                badge.className = 'date-badge';
                if (special.badge.color === 'blue') {
                    badge.classList.add('blue');
                }
                badge.textContent = special.badge.num;
                dateEl.appendChild(badge);
            }
        }
        
        calendarDays.appendChild(dateEl);
    }
}

// 이전/다음 달
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// 탭 전환
document.querySelectorAll('.ctab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// TOP 버튼
const topBtn = document.getElementById('topBtn');

topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        topBtn.style.display = 'flex';
    } else {
        topBtn.style.display = 'none';
    }
});

// 탭 전환 (모든 tab-btn)
document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', function() {
        // 같은 부모 내의 탭들만 비활성화
        const parent = this.closest('.section-toolbar, .toolbar-left');
        if (parent) {
            parent.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        }
        this.classList.add('active');
    });
});

// PolyTalk 관련 변수
let selectedStudent = null;
let translationActive = false;
let timerInterval = null;
let startTime = null;
let conversationData = [];

// 모달 제어
const studentModal = document.getElementById('studentSelectModal');
const openPolyTalkBtn = document.getElementById('openPolyTalkBtn');
const closeStudentModalBtn = document.getElementById('closeStudentModal');
const polyTalkPage = document.getElementById('polyTalkPage');
const counselRecordPage = document.getElementById('counselRecordPage');
const mainContent = document.querySelector('.main-content .container');

// PolyTalk 버튼 클릭 - 학생 선택 모달 열기
if (openPolyTalkBtn) {
    openPolyTalkBtn.addEventListener('click', () => {
        studentModal.classList.add('show');
    });
}

// 모달 닫기
if (closeStudentModalBtn) {
    closeStudentModalBtn.addEventListener('click', () => {
        studentModal.classList.remove('show');
    });
}

// 모달 배경 클릭 시 닫기
studentModal?.addEventListener('click', (e) => {
    if (e.target === studentModal) {
        studentModal.classList.remove('show');
    }
});

// 학생 선택 버튼
document.querySelectorAll('.select-student-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const studentName = this.getAttribute('data-student');
        const studentId = this.getAttribute('data-id');
        const studentCountry = this.getAttribute('data-country') || '대한민국';
        
        // 모달 닫기
        studentModal.classList.remove('show');
        
        // PolyTalk 페이지로 이동 (URL 파라미터로 학생 정보 전달)
        window.location.href = `polytalk.html?name=${encodeURIComponent(studentName)}&id=${encodeURIComponent(studentId)}&country=${encodeURIComponent(studentCountry)}`;
    });
});

// PolyTalk 페이지 열기
function openPolyTalkPage() {
    if (!selectedStudent) return;
    
    // 학생 정보 표시
    document.getElementById('selectedStudentName').textContent = selectedStudent.name;
    document.getElementById('selectedStudentId').textContent = selectedStudent.id;
    
    // 현재 시간 표시
    const now = new Date();
    const timeString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('counselStartTime').textContent = timeString;
    
    // 대화 박스 초기화
    document.getElementById('profConversation').innerHTML = '<div class="welcome-message">음성 인식이 시작되거나 채팅 메시지를 입력하면 대화 내용이 여기에 표시됩니다.</div>';
    document.getElementById('studentConversation').innerHTML = '<div class="welcome-message">학생의 발화가 번역되어 여기에 표시됩니다.</div>';
    
    // 채팅 입력 필드 초기화
    document.getElementById('profChatInput').value = '';
    document.getElementById('studentChatInput').value = '';
    
    // 타이머 초기화
    document.getElementById('timerValue').textContent = '00:00:00';
    
    // 버튼 상태 초기화
    document.getElementById('startTranslation').disabled = false;
    document.getElementById('stopTranslation').disabled = true;
    document.getElementById('saveRecord').disabled = true;
    
    // 상태 초기화
    document.getElementById('statusDot').classList.remove('active');
    document.getElementById('statusText').textContent = '대기 중';
    
    // PolyTalk 페이지 표시 (메인 컨텐츠는 그대로 유지)
    polyTalkPage.style.display = 'block';
    
    // PolyTalk 섹션으로 스크롤
    setTimeout(() => {
        polyTalkPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    conversationData = [];
    
    // 채팅 기능 초기화
    initChatFeatures();
}

// PolyTalk 페이지에서 돌아가기
const backToMainBtn = document.getElementById('backToMain');
const backToMainFromRecordBtn = document.getElementById('backToMainFromRecord');

if (backToMainBtn) {
    backToMainBtn.addEventListener('click', () => {
        if (translationActive) {
            if (!confirm('상담이 진행 중입니다. 정말 나가시겠습니까?')) {
                return;
            }
            stopTranslation();
        }
        
        // PolyTalk 페이지 숨기기
        polyTalkPage.style.display = 'none';
        
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        selectedStudent = null;
    });
}

if (backToMainFromRecordBtn) {
    backToMainFromRecordBtn.addEventListener('click', () => {
        counselRecordPage.style.display = 'none';
        document.body.style.overflow = 'auto';
        selectedStudent = null;
    });
}

// 번역 시작
const startTranslationBtn = document.getElementById('startTranslation');
if (startTranslationBtn) {
    startTranslationBtn.addEventListener('click', () => {
        startTranslation();
    });
}

function startTranslation() {
    translationActive = true;
    startTime = Date.now();
    
    // 버튼 상태 변경
    document.getElementById('startTranslation').disabled = true;
    document.getElementById('stopTranslation').disabled = false;
    document.getElementById('saveRecord').disabled = true;
    
    // 상태 변경
    document.getElementById('statusDot').classList.add('active');
    document.getElementById('statusText').textContent = '번역 진행 중';
    
    // 타이머 시작
    timerInterval = setInterval(updateTimer, 1000);
    
    // 시뮬레이션: 3초마다 대화 추가
    simulateConversation();
}

// 번역 중지
const stopTranslationBtn = document.getElementById('stopTranslation');
if (stopTranslationBtn) {
    stopTranslationBtn.addEventListener('click', () => {
        stopTranslation();
    });
}

function stopTranslation() {
    translationActive = false;
    
    // 버튼 상태 변경
    document.getElementById('startTranslation').disabled = true;
    document.getElementById('stopTranslation').disabled = true;
    document.getElementById('saveRecord').disabled = false;
    
    // 상태 변경
    document.getElementById('statusDot').classList.remove('active');
    document.getElementById('statusText').textContent = '번역 종료';
    
    // 타이머 중지
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// 타이머 업데이트
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerValue').textContent = timeString;
}

// 간단한 번역 시뮬레이션 (실제로는 번역 API를 사용해야 함)
function translateText(text, fromLang, toLang) {
    // 실제 환경에서는 번역 API를 사용해야 합니다
    // 여기서는 간단한 시뮬레이션만 제공합니다
    if (fromLang === toLang) return text;
    
    // 간단한 번역 예시 (실제로는 API 호출 필요)
    const translations = {
        '안녕하세요': { en: 'Hello', zh: '你好', ja: 'こんにちは', vi: 'Xin chào' },
        '감사합니다': { en: 'Thank you', zh: '谢谢', ja: 'ありがとう', vi: 'Cảm ơn' },
        '네': { en: 'Yes', zh: '是', ja: 'はい', vi: 'Vâng' }
    };
    
    // 실제로는 Google Translate API나 다른 번역 서비스를 사용해야 합니다
    // 여기서는 원문에 번역 표시만 추가
    return text + ` [번역: ${text}]`;
}

// 메시지 추가
function addMessage(container, text, isProf = true, translatedText = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item';
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    let displayText = text;
    if (translatedText) {
        displayText = `${text}<br><small style="color: #666; font-style: italic;">${translatedText}</small>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-time">${timeString}</div>
        <div class="message-text">${displayText}</div>
    `;
    
    const conversationBox = document.getElementById(container);
    const welcomeMsg = conversationBox.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    conversationBox.appendChild(messageDiv);
    conversationBox.scrollTop = conversationBox.scrollHeight;
    
    // 대화 데이터 저장
    conversationData.push({
        time: timeString,
        speaker: isProf ? 'professor' : 'student',
        text: text,
        translated: translatedText
    });
}

// 채팅 메시지 전송
function sendChatMessage(isProf) {
    const inputId = isProf ? 'profChatInput' : 'studentChatInput';
    const input = document.getElementById(inputId);
    const message = input.value.trim();
    
    if (!message) return;
    
    // 교수자 메시지
    if (isProf) {
        const studentLang = document.getElementById('studentLang').value;
        const translatedText = translateText(message, 'ko', studentLang);
        
        addMessage('profConversation', message, true);
        // 학생 쪽에 번역된 메시지 표시
        addMessage('studentConversation', translatedText, false);
    } else {
        // 학생 메시지
        const profLang = document.getElementById('profLang').value;
        const studentLang = document.getElementById('studentLang').value;
        const translatedText = translateText(message, studentLang, profLang);
        
        addMessage('studentConversation', message, false);
        // 교수자 쪽에 번역된 메시지 표시
        addMessage('profConversation', translatedText, true);
    }
    
    input.value = '';
}

// 채팅 기능 초기화
function initChatFeatures() {
    // 교수자 채팅 전송
    const profChatInput = document.getElementById('profChatInput');
    const profChatSend = document.getElementById('profChatSend');
    
    if (profChatSend) {
        profChatSend.addEventListener('click', () => {
            sendChatMessage(true);
        });
    }
    
    if (profChatInput) {
        profChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage(true);
            }
        });
    }
    
    // 학생 채팅 전송
    const studentChatInput = document.getElementById('studentChatInput');
    const studentChatSend = document.getElementById('studentChatSend');
    
    if (studentChatSend) {
        studentChatSend.addEventListener('click', () => {
            sendChatMessage(false);
        });
    }
    
    if (studentChatInput) {
        studentChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage(false);
            }
        });
    }
}

// 대화 시뮬레이션
function simulateConversation() {
    if (!translationActive) return;
    
    const profMessages = [
        "안녕하세요, 오늘 상담 시간에 와주셔서 감사합니다.",
        "요즘 수업은 잘 따라가고 있나요?",
        "어려운 부분이 있다면 언제든지 질문해주세요.",
        "다음 주 시험 준비는 어떻게 되고 있나요?",
        "학교생활에서 궁금한 점이 있으면 말씀해주세요."
    ];
    
    const studentMessages = [
        "你好，谢谢教授。(안녕하세요, 감사합니다 교수님.)",
        "我正在努力学习，但有些内容很难。(열심히 공부하고 있지만 어려운 내용이 있습니다.)",
        "好的，我会问的。(네, 질문하겠습니다.)",
        "我正在准备考试。(시험 준비하고 있습니다.)",
        "没有特别的问题。(특별한 문제는 없습니다.)"
    ];
    
    let messageIndex = 0;
    
    const conversationInterval = setInterval(() => {
        if (!translationActive || messageIndex >= profMessages.length) {
            clearInterval(conversationInterval);
            return;
        }
        
        // 교수 메시지
        addMessage('profConversation', profMessages[messageIndex], true);
        
        // 1.5초 후 학생 메시지
        setTimeout(() => {
            if (translationActive && messageIndex < studentMessages.length) {
                addMessage('studentConversation', studentMessages[messageIndex], false);
            }
        }, 1500);
        
        messageIndex++;
    }, 4000);
}

// 상담 기록 저장
const saveRecordBtn = document.getElementById('saveRecord');
if (saveRecordBtn) {
    saveRecordBtn.addEventListener('click', () => {
        saveAndShowRecord();
    });
}

function saveAndShowRecord() {
    // 상담 기록 페이지로 데이터 전송
    document.getElementById('recordStudentName').textContent = selectedStudent.name;
    document.getElementById('recordStudentId').textContent = selectedStudent.id;
    
    const now = new Date();
    const dateTimeString = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('recordDateTime').textContent = dateTimeString;
    
    const timerValue = document.getElementById('timerValue').textContent;
    document.getElementById('recordDuration').textContent = timerValue;
    
    // 대화 내용 표시
    let koreanText = '';
    let translatedText = '';
    
    conversationData.forEach(msg => {
        if (msg.speaker === 'professor') {
            koreanText += `[${msg.time}] 교수자: ${msg.text}\n\n`;
            translatedText += `[${msg.time}] Professor: ${msg.text}\n\n`;
        } else {
            const textParts = msg.text.split('(');
            const original = textParts[0].trim();
            const translated = textParts[1] ? textParts[1].replace(')', '').trim() : original;
            
            koreanText += `[${msg.time}] 학생: ${translated}\n\n`;
            translatedText += `[${msg.time}] Student: ${original}\n\n`;
        }
    });
    
    document.getElementById('recordKorean').textContent = koreanText || '대화 내용이 없습니다.';
    document.getElementById('recordTranslated').textContent = translatedText || '번역된 내용이 없습니다.';
    
    // PolyTalk 페이지 숨기고 기록 페이지 표시
    polyTalkPage.style.display = 'none';
    counselRecordPage.style.display = 'block';
}

// 학생 상세보기 페이지
const studentDetailPage = document.getElementById('studentDetailPage');
const backToMainFromDetailBtn = document.getElementById('backToMainFromDetail');
let currentStudentInfo = null;

// 상세보기 버튼 클릭
document.querySelectorAll('.view-student-detail').forEach(btn => {
    btn.addEventListener('click', function() {
        const studentName = this.getAttribute('data-student-name');
        const studentId = this.getAttribute('data-student-id');
        const grade = this.getAttribute('data-grade');
        const major = this.getAttribute('data-major');
        const email = this.getAttribute('data-email');
        const phone = this.getAttribute('data-phone');
        
        // 현재 학생 정보 저장
        currentStudentInfo = {
            name: studentName,
            id: studentId,
            grade: grade,
            major: major,
            email: email,
            phone: phone
        };
        
        // 학생 정보 표시
        document.getElementById('detailStudentName').textContent = studentName;
        document.getElementById('detailStudentId').textContent = studentId;
        document.getElementById('detailGrade').textContent = grade;
        document.getElementById('detailMajor').textContent = major;
        document.getElementById('detailEmail').textContent = email;
        document.getElementById('detailPhone').textContent = phone;
        
        // 학생 프로필 사진 설정 (data 속성이 있으면 사용, 없으면 기본 이미지)
        const studentPhoto = this.getAttribute('data-student-photo') || 'img/학생프로필.png';
        document.getElementById('detailStudentPhoto').src = studentPhoto;
        document.getElementById('detailStudentPhoto').alt = `${studentName} 프로필 사진`;
        
        // 페이지 전환
        document.body.style.overflow = 'hidden';
        studentDetailPage.style.display = 'block';
    });
});

// 상세보기 페이지에서 돌아가기
if (backToMainFromDetailBtn) {
    backToMainFromDetailBtn.addEventListener('click', () => {
        studentDetailPage.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentStudentInfo = null;
    });
}

// 상담 기록 작성 모달
const counselFormModal = document.getElementById('counselFormModal');
const openCounselFormBtn = document.getElementById('openCounselFormBtn');
const closeCounselFormModalBtn = document.getElementById('closeCounselFormModal');
const cancelCounselFormBtn = document.getElementById('cancelCounselForm');
const counselForm = document.getElementById('counselForm');

// 상담 주제 카테고리 선택
document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // 모든 버튼의 active 클래스 제거
        document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
        
        // 현재 버튼에 active 클래스 추가
        this.classList.add('active');
        
        // hidden input에 선택된 주제 저장
        const topic = this.getAttribute('data-topic');
        document.getElementById('counselTopic').value = topic;
        
        // 선택된 주제 표시
        document.getElementById('selectedTopicText').textContent = topic;
        document.querySelector('.topic-selected-msg').style.display = 'block';
    });
});

// 상담 기록 작성 모달 열기
if (openCounselFormBtn) {
    openCounselFormBtn.addEventListener('click', () => {
        // 오늘 날짜 자동 설정
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('counselDate').value = dateString;
        
        // 주제 선택 초기화
        document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.topic-selected-msg').style.display = 'none';
        
        counselFormModal.classList.add('show');
    });
}

// 상담 기록 작성 모달 닫기
if (closeCounselFormModalBtn) {
    closeCounselFormModalBtn.addEventListener('click', () => {
        counselFormModal.classList.remove('show');
        counselForm.reset();
    });
}

if (cancelCounselFormBtn) {
    cancelCounselFormBtn.addEventListener('click', () => {
        counselFormModal.classList.remove('show');
        counselForm.reset();
    });
}

// 모달 배경 클릭 시 닫기
counselFormModal?.addEventListener('click', (e) => {
    if (e.target === counselFormModal) {
        counselFormModal.classList.remove('show');
        counselForm.reset();
    }
});

// 상담 기록 저장
if (counselForm) {
    counselForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 폼 데이터 가져오기
        const counselDate = document.getElementById('counselDate').value;
        const counselStartTime = document.getElementById('counselStartTime').value;
        const counselEndTime = document.getElementById('counselEndTime').value;
        const counselType = document.getElementById('counselType').value;
        const counselTopic = document.getElementById('counselTopic').value;
        const counselSummary = document.getElementById('counselSummary').value;
        const counselResult = document.getElementById('counselResult').value;
        
        // 시간 차이 계산 (분)
        const [startHour, startMin] = counselStartTime.split(':').map(Number);
        const [endHour, endMin] = counselEndTime.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        
        if (durationMinutes <= 0) {
            alert('종료 시간은 시작 시간보다 늦어야 합니다.');
            return;
        }
        
        // 날짜 포맷 변경
        const [year, month, day] = counselDate.split('-');
        const formattedDate = `${year}.${month}.${day}`;
        
        // 상담 유형 텍스트
        const typeText = {
            'face': '대면 상담',
            'online': '온라인 상담',
            'phone': '전화 상담'
        }[counselType];
        
        // 조치사항 리스트 생성
        const resultItems = counselResult
            .split('\n')
            .filter(item => item.trim())
            .map(item => `<li>${item.trim()}</li>`)
            .join('');
        
        // 새 상담 기록 HTML 생성 (data-date 속성 추가)
        const newHistoryItem = `
            <div class="history-item" data-date="${counselDate}">
                <div class="history-header">
                    <div class="history-date">
                        <span class="history-date-badge">${formattedDate}</span>
                        <span class="time-badge">${counselStartTime} - ${counselEndTime}</span>
                        <span class="duration-badge">${durationMinutes}분</span>
                    </div>
                    <span class="counsel-type-badge ${counselType}">${typeText}</span>
                </div>
                <div class="history-content">
                    <div class="content-header">
                        <div class="counsel-topic">
                            <strong>상담 주제:</strong> 
                            <span class="topic-value">${counselTopic}</span>
                            <select class="topic-edit" style="display: none;">
                                <option value="학업 및 학습 관리">학업 및 학습 관리</option>
                                <option value="진로 및 취업 상담">진로 및 취업 상담</option>
                                <option value="대인관계 및 적응">대인관계 및 적응</option>
                                <option value="심리 및 정서 상담">심리 및 정서 상담</option>
                                <option value="수강신청 및 학사관리">수강신청 및 학사관리</option>
                                <option value="장학금 및 재정 지원">장학금 및 재정 지원</option>
                                <option value="휴학 및 복학 상담">휴학 및 복학 상담</option>
                                <option value="기타">기타</option>
                            </select>
                        </div>
                        <button type="button" class="edit-counsel-btn">수정</button>
                    </div>
                    <div class="counsel-summary">
                        <strong>상담 내용:</strong>
                        <p class="summary-text">${counselSummary.replace(/\n/g, '<br>')}</p>
                        <textarea class="summary-edit" style="display: none;">${counselSummary}</textarea>
                    </div>
                    ${resultItems ? `
                    <div class="counsel-result">
                        <strong>조치사항:</strong>
                        <ul class="result-list">
                            ${resultItems}
                        </ul>
                        <textarea class="result-edit" style="display: none;">${counselResult.trim()}</textarea>
                    </div>
                    ` : `
                    <div class="counsel-result">
                        <strong>조치사항:</strong>
                        <ul class="result-list">
                            <li>조치사항이 없습니다.</li>
                        </ul>
                        <textarea class="result-edit" style="display: none;"></textarea>
                    </div>
                    `}
                    <div class="edit-actions" style="display: none;">
                        <button type="button" class="save-edit-btn">저장</button>
                        <button type="button" class="cancel-edit-btn">취소</button>
                    </div>
                    <div class="counsel-status completed">
                        <span class="status-icon">✓</span> 상담 완료
                    </div>
                </div>
            </div>
        `;
        
        // 상담 이력 목록에 추가 (맨 위에)
        const historyList = document.getElementById('counselHistoryList');
        historyList.insertAdjacentHTML('afterbegin', newHistoryItem);
        
        // 새로 추가된 상담 기록에 수정 기능 추가
        const newItem = historyList.querySelector('.history-item[data-date="' + counselDate + '"]');
        if (newItem) {
            addEditFeatureToNewHistoryItem(newItem);
        }
        
        // 메인 페이지 학생 테이블의 최근 상담일 업데이트
        if (currentStudentInfo) {
            updateStudentLastCounselDate(currentStudentInfo.id, formattedDate);
        }
        
        // 모달 닫기 및 폼 초기화
        counselFormModal.classList.remove('show');
        counselForm.reset();
        
        // 성공 메시지
        alert('상담 기록이 저장되었습니다.');
    });
}

// 학생 테이블의 최근 상담일 업데이트
function updateStudentLastCounselDate(studentId, date) {
    // 메인 페이지의 학생 테이블에서 해당 학생 찾기
    const studentRows = document.querySelectorAll('.view-student-detail');
    studentRows.forEach(btn => {
        if (btn.getAttribute('data-student-id') === studentId) {
            const row = btn.closest('tr');
            const dateCell = row.cells[4]; // 최근 상담일 열 (0부터 시작, 5번째 열)
            if (dateCell) {
                dateCell.textContent = date;
                // 새로 업데이트된 것을 표시
                dateCell.style.color = '#3682D7';
                dateCell.style.fontWeight = '600';
            }
        }
    });
}

// 상담 이력 정렬
const sortNewestBtn = document.getElementById('sortNewest');
const sortOldestBtn = document.getElementById('sortOldest');

function sortCounselHistory(order) {
    const historyList = document.getElementById('counselHistoryList');
    const items = Array.from(historyList.querySelectorAll('.history-item'));
    
    // 날짜 기준으로 정렬
    items.sort((a, b) => {
        const dateA = a.getAttribute('data-date') || '0000-00-00';
        const dateB = b.getAttribute('data-date') || '0000-00-00';
        
        if (order === 'newest') {
            return dateB.localeCompare(dateA); // 최신순
        } else {
            return dateA.localeCompare(dateB); // 과거순
        }
    });
    
    // 기존 항목 제거
    items.forEach(item => item.remove());
    
    // 정렬된 순서로 다시 추가
    items.forEach(item => historyList.appendChild(item));
}

// 최신순 버튼
if (sortNewestBtn) {
    sortNewestBtn.addEventListener('click', () => {
        sortNewestBtn.classList.add('active');
        sortOldestBtn.classList.remove('active');
        sortCounselHistory('newest');
    });
}

// 과거순 버튼
if (sortOldestBtn) {
    sortOldestBtn.addEventListener('click', () => {
        sortOldestBtn.classList.add('active');
        sortNewestBtn.classList.remove('active');
        sortCounselHistory('oldest');
    });
}

// 상담 내용 수정 기능
function initEditCounselFeatures() {
    // 모든 상담 기록에 수정 기능 추가
    document.querySelectorAll('.edit-counsel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const historyItem = this.closest('.history-item');
            const content = historyItem.querySelector('.history-content');
            const topicValue = content.querySelector('.topic-value');
            const topicEdit = content.querySelector('.topic-edit');
            const summaryText = content.querySelector('.summary-text');
            const summaryEdit = content.querySelector('.summary-edit');
            const resultList = content.querySelector('.result-list');
            const resultEdit = content.querySelector('.result-edit');
            const editActions = content.querySelector('.edit-actions');
            
            // 편집 모드로 전환
            if (summaryText.style.display !== 'none') {
                // 현재 상담 주제를 select에 설정
                const currentTopic = topicValue.textContent.trim();
                topicEdit.value = currentTopic;
                
                // 현재 값을 textarea에 설정
                summaryEdit.value = summaryText.textContent.trim();
                
                // 조치사항 리스트를 텍스트로 변환
                const resultItems = Array.from(resultList.querySelectorAll('li'))
                    .map(li => li.textContent.trim())
                    .join('\n');
                resultEdit.value = resultItems;
                
                // 표시/숨김 전환
                topicValue.style.display = 'none';
                topicEdit.style.display = 'inline-block';
                summaryText.style.display = 'none';
                resultList.style.display = 'none';
                summaryEdit.style.display = 'block';
                resultEdit.style.display = 'block';
                editActions.style.display = 'flex';
                this.style.display = 'none';
            }
        });
    });
    
    // 저장 버튼
    document.querySelectorAll('.save-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const historyItem = this.closest('.history-item');
            const content = historyItem.querySelector('.history-content');
            const topicValue = content.querySelector('.topic-value');
            const topicEdit = content.querySelector('.topic-edit');
            const summaryText = content.querySelector('.summary-text');
            const summaryEdit = content.querySelector('.summary-edit');
            const resultList = content.querySelector('.result-list');
            const resultEdit = content.querySelector('.result-edit');
            const editActions = content.querySelector('.edit-actions');
            const editBtn = content.querySelector('.edit-counsel-btn');
            
            // 상담 주제 업데이트
            topicValue.textContent = topicEdit.value;
            
            // 상담 내용 업데이트
            summaryText.textContent = summaryEdit.value.trim();
            
            // 조치사항 업데이트
            const resultItems = resultEdit.value.trim()
                .split('\n')
                .filter(item => item.trim())
                .map(item => `<li>${item.trim()}</li>`)
                .join('');
            resultList.innerHTML = resultItems || '<li>조치사항이 없습니다.</li>';
            
            // 보기 모드로 전환
            topicValue.style.display = 'inline';
            topicEdit.style.display = 'none';
            summaryText.style.display = 'block';
            resultList.style.display = 'block';
            summaryEdit.style.display = 'none';
            resultEdit.style.display = 'none';
            editActions.style.display = 'none';
            editBtn.style.display = 'block';
            
            // 성공 메시지
            alert('상담 내용이 저장되었습니다.');
        });
    });
    
    // 취소 버튼
    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const historyItem = this.closest('.history-item');
            const content = historyItem.querySelector('.history-content');
            const topicValue = content.querySelector('.topic-value');
            const topicEdit = content.querySelector('.topic-edit');
            const summaryText = content.querySelector('.summary-text');
            const summaryEdit = content.querySelector('.summary-edit');
            const resultList = content.querySelector('.result-list');
            const resultEdit = content.querySelector('.result-edit');
            const editActions = content.querySelector('.edit-actions');
            const editBtn = content.querySelector('.edit-counsel-btn');
            
            // 보기 모드로 전환 (변경 사항 저장 안 함)
            topicValue.style.display = 'inline';
            topicEdit.style.display = 'none';
            summaryText.style.display = 'block';
            resultList.style.display = 'block';
            summaryEdit.style.display = 'none';
            resultEdit.style.display = 'none';
            editActions.style.display = 'none';
            editBtn.style.display = 'block';
        });
    });
}

// 새로 추가된 상담 기록에도 수정 기능 추가하는 함수
function addEditFeatureToNewHistoryItem(item) {
    const editBtn = item.querySelector('.edit-counsel-btn');
    if (editBtn && !editBtn.hasAttribute('data-edit-initialized')) {
        editBtn.setAttribute('data-edit-initialized', 'true');
        
        editBtn.addEventListener('click', function() {
            const historyItem = this.closest('.history-item');
            const content = historyItem.querySelector('.history-content');
            const topicValue = content.querySelector('.topic-value');
            const topicEdit = content.querySelector('.topic-edit');
            const summaryText = content.querySelector('.summary-text');
            const summaryEdit = content.querySelector('.summary-edit');
            const resultList = content.querySelector('.result-list');
            const resultEdit = content.querySelector('.result-edit');
            const editActions = content.querySelector('.edit-actions');
            
            if (summaryText && summaryText.style.display !== 'none') {
                // 현재 상담 주제를 select에 설정
                const currentTopic = topicValue.textContent.trim();
                if (topicEdit) topicEdit.value = currentTopic;
                
                summaryEdit.value = summaryText.textContent.trim();
                const resultItems = Array.from(resultList.querySelectorAll('li'))
                    .map(li => li.textContent.trim())
                    .join('\n');
                resultEdit.value = resultItems;
                
                if (topicValue) topicValue.style.display = 'none';
                if (topicEdit) topicEdit.style.display = 'inline-block';
                summaryText.style.display = 'none';
                resultList.style.display = 'none';
                summaryEdit.style.display = 'block';
                resultEdit.style.display = 'block';
                editActions.style.display = 'flex';
                this.style.display = 'none';
            }
        });
        
        const saveBtn = item.querySelector('.save-edit-btn');
        const cancelBtn = item.querySelector('.cancel-edit-btn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const historyItem = this.closest('.history-item');
                const content = historyItem.querySelector('.history-content');
                const topicValue = content.querySelector('.topic-value');
                const topicEdit = content.querySelector('.topic-edit');
                const summaryText = content.querySelector('.summary-text');
                const summaryEdit = content.querySelector('.summary-edit');
                const resultList = content.querySelector('.result-list');
                const resultEdit = content.querySelector('.result-edit');
                const editActions = content.querySelector('.edit-actions');
                const editBtn = content.querySelector('.edit-counsel-btn');
                
                // 상담 주제 업데이트
                if (topicValue && topicEdit) {
                    topicValue.textContent = topicEdit.value;
                }
                
                summaryText.textContent = summaryEdit.value.trim();
                const resultItems = resultEdit.value.trim()
                    .split('\n')
                    .filter(item => item.trim())
                    .map(item => `<li>${item.trim()}</li>`)
                    .join('');
                resultList.innerHTML = resultItems || '<li>조치사항이 없습니다.</li>';
                
                if (topicValue) topicValue.style.display = 'inline';
                if (topicEdit) topicEdit.style.display = 'none';
                summaryText.style.display = 'block';
                resultList.style.display = 'block';
                summaryEdit.style.display = 'none';
                resultEdit.style.display = 'none';
                editActions.style.display = 'none';
                editBtn.style.display = 'block';
                
                alert('상담 내용이 저장되었습니다.');
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const historyItem = this.closest('.history-item');
                const content = historyItem.querySelector('.history-content');
                const topicValue = content.querySelector('.topic-value');
                const topicEdit = content.querySelector('.topic-edit');
                const summaryText = content.querySelector('.summary-text');
                const summaryEdit = content.querySelector('.summary-edit');
                const resultList = content.querySelector('.result-list');
                const resultEdit = content.querySelector('.result-edit');
                const editActions = content.querySelector('.edit-actions');
                const editBtn = content.querySelector('.edit-counsel-btn');
                
                if (topicValue) topicValue.style.display = 'inline';
                if (topicEdit) topicEdit.style.display = 'none';
                summaryText.style.display = 'block';
                resultList.style.display = 'block';
                summaryEdit.style.display = 'none';
                resultEdit.style.display = 'none';
                editActions.style.display = 'none';
                editBtn.style.display = 'block';
            });
        }
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    topBtn.style.display = 'none';
    initEditCounselFeatures();
    
    console.log('청주대학교 EDELWEIS 시스템 로드 완료');
    console.log('PolyTalk 다국어 상담 시스템 준비 완료');
});
