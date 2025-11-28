# 다국어 Q&A 자동 번역 기능 설계서

## 1. 기능 개요

외국인 학습자가 자신의 언어로 Q&A 질문을 작성하면 자동으로 한국어로 번역되어 교수자에게 노출되고, 교수자가 한국어로 답변하면 다시 학생의 언어로 자동 번역되어 제공되는 양방향 자동 번역 시스템.

## 2. 전체 기능 동작 흐름도

```
[학생] 질문 작성 (자신의 언어)
    ↓
[시스템] 언어 감지 + 메타데이터 수집
    ↓
[번역 API] 한국어로 번역 (컨텍스트 적용)
    ↓
[DB] 원문 + 번역문 저장
    ↓
[교수자 화면] 한국어 질문 표시
    ↓
[교수자] 한국어 답변 작성
    ↓
[번역 API] 학생 언어로 역번역 (컨텍스트 적용)
    ↓
[DB] 원문 + 번역문 저장
    ↓
[학생 화면] 자신의 언어로 답변 표시
```

## 3. 사용자 화면별 UI/UX 정의

### 3.1 학생 화면
- **질문 작성 화면**
  - 언어 선택 드롭다운 (자동 감지 가능)
  - 질문 입력 텍스트 영역
  - 원문 미리보기
  - "질문 등록" 버튼
  
- **답변 확인 화면**
  - 질문 (원문 + 한국어 번역)
  - 답변 (한국어 원문 + 자신의 언어 번역)
  - 번역 품질 피드백 버튼

### 3.2 교수자 화면
- **질문 리스트 화면**
  - 모든 질문을 한국어로 통일 표시
  - 학생 정보 표시 (이름, 국적, 언어)
  - 원문 보기 토글 버튼
  
- **답변 작성 화면**
  - 한국어 질문 표시
  - 한국어 답변 입력 영역
  - 미리보기 (학생 언어로 번역된 답변)
  - "답변 등록" 버튼

## 4. API 구조

### 4.1 번역 API

#### POST /api/translate/question
```json
{
  "content": "질문 내용",
  "source_lang": "zh",
  "target_lang": "ko",
  "metadata": {
    "student_id": "20210101",
    "course_id": "CS101",
    "course_name": "컴퓨터공학개론",
    "major": "컴퓨터공학",
    "student_nationality": "중국"
  }
}
```

**Response:**
```json
{
  "original": "질문 내용",
  "translated": "번역된 질문",
  "confidence": 0.95,
  "glossary_applied": ["컴퓨터공학", "알고리즘"]
}
```

#### POST /api/translate/answer
```json
{
  "content": "답변 내용",
  "source_lang": "ko",
  "target_lang": "zh",
  "metadata": {
    "student_id": "20210101",
    "course_id": "CS101",
    "question_id": "12345"
  }
}
```

### 4.2 Q&A API

#### POST /api/qa/question
```json
{
  "student_id": "20210101",
  "course_id": "CS101",
  "question_original": "원문 질문",
  "question_translated": "번역된 질문",
  "source_lang": "zh",
  "metadata": {...}
}
```

#### POST /api/qa/answer
```json
{
  "question_id": "12345",
  "answer_original": "한국어 답변",
  "answer_translated": "번역된 답변",
  "target_lang": "zh"
}
```

## 5. DB 테이블 구조

### 5.1 qa_questions 테이블
```sql
CREATE TABLE qa_questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    course_id VARCHAR(50) NOT NULL,
    question_original TEXT NOT NULL,
    question_translated TEXT NOT NULL,
    source_lang VARCHAR(10) NOT NULL,
    target_lang VARCHAR(10) DEFAULT 'ko',
    translation_confidence DECIMAL(3,2),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
    INDEX idx_student (student_id),
    INDEX idx_course (course_id),
    INDEX idx_status (status)
);
```

### 5.2 qa_answers 테이블
```sql
CREATE TABLE qa_answers (
    answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    teacher_id VARCHAR(20) NOT NULL,
    answer_original TEXT NOT NULL,
    answer_translated TEXT NOT NULL,
    source_lang VARCHAR(10) DEFAULT 'ko',
    target_lang VARCHAR(10) NOT NULL,
    translation_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES qa_questions(question_id),
    INDEX idx_question (question_id)
);
```

### 5.3 translation_glossary 테이블
```sql
CREATE TABLE translation_glossary (
    glossary_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id VARCHAR(50),
    major VARCHAR(100),
    term_ko VARCHAR(200) NOT NULL,
    term_en VARCHAR(200),
    term_zh VARCHAR(200),
    term_vi VARCHAR(200),
    term_ja VARCHAR(200),
    priority INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_course (course_id),
    INDEX idx_major (major)
);
```

### 5.4 translation_logs 테이블
```sql
CREATE TABLE translation_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_type ENUM('question', 'answer'),
    content_id BIGINT,
    original_text TEXT,
    translated_text TEXT,
    source_lang VARCHAR(10),
    target_lang VARCHAR(10),
    translation_service VARCHAR(50),
    confidence DECIMAL(3,2),
    glossary_terms_used JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_content (content_type, content_id)
);
```

## 6. 번역 품질 향상 로직

### 6.1 전공 용어 Priority Dictionary
```javascript
const glossaryPriority = {
  "컴퓨터공학": {
    "ko": "컴퓨터공학",
    "en": "Computer Science",
    "zh": "计算机科学",
    "vi": "Khoa học Máy tính",
    "priority": 10
  },
  "알고리즘": {
    "ko": "알고리즘",
    "en": "Algorithm",
    "zh": "算法",
    "vi": "Thuật toán",
    "priority": 9
  }
};
```

### 6.2 강의 기반 Custom Glossary
- 강의별 용어 사전 자동 생성
- 수업 계획서에서 용어 추출
- 학생 질문 패턴 분석으로 용어 추가

### 6.3 사용자 국적 기반 언어 스타일 최적화
- 중국 학생: 간체/번체 자동 감지
- 베트남 학생: 남부/북부 방언 고려
- 영어권: 영국/미국 영어 스타일 구분

## 7. 에러/예외 처리

### 7.1 번역 실패 시
```javascript
if (translationFailed) {
  return {
    original: originalText,
    translated: originalText, // 원문 제공
    fallback: true,
    error: "Translation service unavailable"
  };
}
```

### 7.2 네트워크 오류 시 재시도 로직
```javascript
async function translateWithRetry(content, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await translateAPI(content);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 지수 백오프
    }
  }
}
```

### 7.3 언어코드 누락 시 Fallback
```javascript
function detectLanguage(text) {
  // GPT 기반 언어 감지
  // 실패 시 사용자 프로필의 기본 언어 사용
  return detectedLang || userProfile.defaultLang || 'en';
}
```

## 8. 시스템 동작 방식

### 8.1 질문 등록 프로세스
1. 학생이 질문 작성
2. 언어 자동 감지 (또는 수동 선택)
3. 메타데이터 수집 (강의 정보, 학생 정보)
4. Glossary 적용하여 컨텍스트 번역
5. 한국어로 번역
6. DB 저장 (원문 + 번역문)
7. 교수자에게 알림

### 8.2 답변 등록 프로세스
1. 교수자가 한국어 답변 작성
2. 질문의 원래 언어 확인
3. Glossary 적용하여 컨텍스트 번역
4. 학생 언어로 역번역
5. DB 저장 (원문 + 번역문)
6. 학생에게 알림

## 9. 번역 품질 개선 전략

### 9.1 컨텍스트 기반 번역
- 강의명, 전공 용어, 커리큘럼 정보 활용
- 학생 국적 기반 언어 스타일 적용
- 이전 대화 맥락 고려

### 9.2 피드백 루프
- 학생/교수자 번역 품질 피드백 수집
- 부정확한 번역 자동 학습
- Glossary 자동 업데이트

### 9.3 A/B 테스팅
- 여러 번역 엔진 비교
- 번역 품질 점수화
- 최적 번역 엔진 자동 선택

