# Context-Aware English Dictionary Chrome Extension

LLM을 활용하여 웹페이지에서 드래그한 영어 단어의 문맥에 맞는 정확한 한국어 번역을 제공하는 크롬 익스텐션입니다.

## 주요 기능

- **문맥 인식 번역**: HuggingFace의 phi-2 모델을 사용하여 단어의 여러 의미 중 문맥에 가장 적합한 하나만 선택
- **즉시 팝업**: 단어를 드래그하면 마우스 근처에 번역 팝업이 즉시 표시
- **품사 및 예문 제공**: 의미와 함께 품사와 예문도 함께 제공
- **반응형 UI**: 화면 경계를 고려한 스마트 팝업 위치 조정
- **다크 모드 지원**: 시스템 설정에 따른 자동 테마 적용

## 설치 방법

### 1. 개발자 모드 설치

1. Chrome 브라우저에서 `chrome://extensions/` 페이지 열기
2. 우측 상단의 "개발자 모드" 토글 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 이 프로젝트 폴더 선택

### 2. 필요한 파일 구조

```
extension/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup.html
├── popup.js
├── README.md
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### 3. 아이콘 준비

`icons/` 폴더에 다음 크기의 아이콘 파일들을 준비해주세요:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

## 설정 방법

### 1. HuggingFace API 토큰 발급

1. [HuggingFace](https://huggingface.co/)에서 계정 생성
2. 개인 액세스 토큰 생성
3. 생성된 토큰 복사

### 2. 확장 프로그램 설정

1. 확장 프로그램 아이콘 클릭
2. 설정 팝업에서 HuggingFace API 토큰 입력
3. "연결 테스트" 버튼으로 토큰 유효성 확인
4. "저장" 버튼으로 설정 완료

## 사용 방법

1. 웹페이지에서 영어 단어를 마우스로 드래그하여 선택
2. 선택한 단어 근처에 번역 팝업이 자동으로 표시
3. 문맥에 맞는 의미, 품사, 예문 확인
4. ESC 키 또는 팝업 외부 클릭으로 닫기

## 개발 정보

### 기술 스택

- **Manifest Version**: V3
- **Content Scripts**: 웹페이지 텍스트 선택 감지
- **Background Service Worker**: HuggingFace API 통신
- **Chrome Storage API**: 설정 데이터 저장
- **phi-2 모델**: 문맥 기반 번역

### 주요 API

- `chrome.storage.sync`: API 토큰 안전 저장
- `chrome.runtime.sendMessage`: Content Script ↔ Background 통신
- `window.getSelection()`: 텍스트 선택 감지
- `getBoundingClientRect()`: 팝업 위치 계산

### 보안 고려사항

- API 토큰은 `chrome.storage.sync`에 암호화 저장
- HTTPS를 통한 HuggingFace API 통신
- 필요 최소한의 권한만 요청
- 사용자 데이터 수집 없음

## 개발 및 디버깅

### 로컬 개발

1. 코드 수정 후 `chrome://extensions/`에서 새로고침
2. Content Script 디버깅: 웹페이지에서 F12 → Console
3. Background Script 디버깅: 확장 프로그램 페이지 → "service worker" 링크
4. Popup 디버깅: 팝업 우클릭 → "검사"

### 성능 최적화

- API 호출 결과 캐싱 고려
- 중복 요청 방지 로직
- 팝업 애니메이션 최적화
- 메모리 누수 방지

### 모델 추론 시간 테스트

`phi2_inference_test.py` 스크립트를 실행하면 phi-2 모델을 로드하여 한 번의
추론에 소요되는 시간을 측정할 수 있습니다.

```bash
python phi2_inference_test.py
```

## 문제 해결

### 일반적인 문제

1. **팝업이 나타나지 않음**
   - API 토큰이 올바르게 설정되었는지 확인
   - 영어 단어를 정확히 선택했는지 확인
   - 브라우저 콘솔에서 오류 메시지 확인

2. **번역이 안됨**
   - 인터넷 연결 상태 확인
   - HuggingFace API 사용량 한도 확인
   - API 토큰 유효성 재확인

3. **팝업 위치가 이상함**
   - 브라우저 줌 레벨 확인
   - 페이지 스크롤 상태 확인

### 오류 로그 확인

```javascript
// Content Script 오류 확인 (웹페이지 콘솔)
console.log('Content script errors');

// Background Script 오류 확인 (확장 프로그램 service worker)
console.log('Background script errors');
```

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능
phi-2 모델 역시 [MIT 라이선스](https://github.com/microsoft/phi-2)로 제공됩니다.

## 기여하기

1. Fork 후 Pull Request
2. 이슈 리포트 및 기능 제안 환영
3. 코드 리뷰 및 테스트 협조

## 향후 개발 계획

- [ ] 번역 결과 캐싱
- [ ] 사용자 사전 기능
- [ ] 음성 발음 재생
- [ ] 다른 언어 조합 지원
- [ ] 키보드 단축키 지원
- [ ] 통계 및 학습 기록

## 연락처

버그 리포트나 기능 제안이 있으시면 이슈를 등록해주세요.