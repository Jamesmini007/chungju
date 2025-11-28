// 번역 기록 페이지

const subjects = [
    { id: 1, name: '웹 프로그래밍', code: 'CS101', color: '#4682B4' },
    { id: 2, name: '데이터베이스 시스템', code: 'CS201', color: '#10b981' },
    { id: 3, name: '인공지능 기초', code: 'CS301', color: '#f59e0b' },
    { id: 4, name: '소프트웨어 공학', code: 'CS401', color: '#ef4444' },
    { id: 5, name: '컴퓨터 네트워크', code: 'CS501', color: '#8b5cf6' }
];

// 과목 ID로 색상 가져오기
function getSubjectColor(subjectId) {
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.color : '#4682B4';
}

const elements = {
    subjectFilter: document.getElementById('subjectFilter'),
    dateFilter: document.getElementById('dateFilter'),
    clearFilterBtn: document.getElementById('clearFilterBtn'),
    historyList: document.getElementById('historyList')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // 과목 필터 옵션 추가
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.name} (${subject.code})`;
        elements.subjectFilter.appendChild(option);
    });

    // URL 파라미터에서 과목 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('subject');
    if (subjectId) {
        elements.subjectFilter.value = subjectId;
    }

    // 필터 변경 이벤트
    elements.subjectFilter.addEventListener('change', renderHistory);
    elements.dateFilter.addEventListener('change', renderHistory);
    elements.clearFilterBtn.addEventListener('click', clearFilters);

    // 기록 렌더링
    renderHistory();
}

// 필터 초기화
function clearFilters() {
    elements.subjectFilter.value = 'all';
    elements.dateFilter.value = '';
    renderHistory();
}

// 번역 기록 렌더링
function renderHistory() {
    const selectedSubjectId = elements.subjectFilter.value;
    const selectedDate = elements.dateFilter.value;
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    
    // 필터링
    let filteredHistory = history;
    
    // 과목 필터링
    if (selectedSubjectId !== 'all') {
        filteredHistory = filteredHistory.filter(item => item.subjectId == selectedSubjectId);
    }
    
    // 날짜 필터링
    if (selectedDate) {
        const filterDate = new Date(selectedDate);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        filteredHistory = filteredHistory.filter(item => {
            const itemDate = new Date(item.startTime);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate >= filterDate && itemDate < nextDay;
        });
    }

    // 최신순 정렬
    filteredHistory.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    // 렌더링
    if (filteredHistory.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">번역 기록이 없습니다.</div>
            </div>
        `;
        return;
    }

    elements.historyList.innerHTML = '';

    filteredHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.onclick = () => showHistoryDetail(item);

        const startTime = new Date(item.startTime).toLocaleString('ko-KR');
        const endTime = new Date(item.endTime).toLocaleString('ko-KR');
        const duration = formatDuration(item.duration);
        const borderColor = getSubjectColor(item.subjectId);

        historyItem.style.borderLeftColor = borderColor;

        historyItem.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-title-wrapper">
                    <div class="history-item-title">${item.subjectName} (${item.subjectCode})</div>
                    <button class="history-item-delete-btn" onclick="event.stopPropagation(); deleteHistoryItem('${item.startTime}')" title="삭제">×</button>
                </div>
                <div class="history-item-meta">
                    <div>${startTime}</div>
                    <div>~ ${endTime}</div>
                    <div>(${duration})</div>
                </div>
            </div>
        `;

        elements.historyList.appendChild(historyItem);
    });
}

// 번역 기록 상세 보기
function showHistoryDetail(item) {
    const modal = document.getElementById('historyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const startTime = new Date(item.startTime).toLocaleString('ko-KR');
    const endTime = new Date(item.endTime).toLocaleString('ko-KR');
    const duration = formatDuration(item.duration);

    modalTitle.textContent = `${item.subjectName} (${item.subjectCode})`;
    
    modalBody.innerHTML = `
        <div class="time-info-container">
            <div class="time-info-box">
                <div class="time-info-label">시작 시간</div>
                <div class="time-info-value">${startTime}</div>
            </div>
            <div class="time-info-box">
                <div class="time-info-label">종료 시간</div>
                <div class="time-info-value">${endTime}</div>
            </div>
            <div class="time-info-box">
                <div class="time-info-label">지속 시간</div>
                <div class="time-info-value">${duration}</div>
            </div>
        </div>
        <div style="margin-top: 30px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 15px;">번역 내용</h3>
            ${item.translations.map(trans => {
                let transTime = '';
                if (trans.timestamp) {
                    try {
                        const date = trans.timestamp instanceof Date 
                            ? trans.timestamp 
                            : new Date(trans.timestamp);
                        if (!isNaN(date.getTime())) {
                            transTime = date.toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }
                    } catch (e) {
                        console.error('시간 파싱 오류:', e);
                    }
                }
                
                // 여러 언어 번역 표시 (이미지처럼 한 줄씩)
                let translatedHTML = '';
                if (trans.translations && Array.isArray(trans.translations)) {
                    // 여러 언어가 배열로 저장된 경우
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
                } else if (trans.translated) {
                    // 기존 호환성: 문자열로 저장된 경우
                    // " | " 구분자로 분리 시도
                    if (trans.translated.includes(' | ')) {
                        const parts = trans.translated.split(' | ');
                        translatedHTML = parts.map((text, idx) => {
                            const langNames = ['English', '中文', 'Español', '日本語'];
                            const langName = langNames[idx] || `Language ${idx + 1}`;
                            return `<div class="translation-lang-line"><span class="translation-lang-label">${langName}:</span> <span class="translation-lang-text">${text}</span></div>`;
                        }).join('');
                    } else {
                        // 단일 번역
                        translatedHTML = `<div class="translation-lang-line"><span class="translation-lang-text">${trans.translated}</span></div>`;
                    }
                }
                
                return `
                <div class="translation-pair">
                    ${transTime ? `<div class="translation-time">${transTime}</div>` : ''}
                    <div class="original">${trans.original}</div>
                    <div class="translated">${translatedHTML}</div>
                </div>
            `;
            }).join('')}
        </div>
    `;

    modal.classList.add('active');
}

// 모달 닫기
function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.remove('active');
}

// 모달 외부 클릭 시 닫기
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHistoryModal();
            }
        });
    }
});

// 기록 삭제
function deleteHistoryItem(startTime) {
    if (confirm('이 번역 기록을 삭제하시겠습니까?')) {
        const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
        const filteredHistory = history.filter(item => item.startTime !== startTime);
        localStorage.setItem('translationHistory', JSON.stringify(filteredHistory));
        renderHistory();
    }
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


