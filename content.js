// Content Script - 웹페이지에서 텍스트 선택을 감지하고 팝업을 표시
let currentPopup = null;
let isProcessing = false;

// 영어 텍스트인지 확인하는 함수
function isEnglishText(text) {
  const englishPattern = /^[a-zA-Z\s'-]+$/;
  return englishPattern.test(text.trim());
}

// 단어인지 확인 (공백이나 특수문자가 많이 포함되지 않은)
function isSingleWord(text) {
  const words = text.trim().split(/\s+/);
  return words.length === 1 && words[0].length > 1;
}

// 주변 문맥 추출 함수
function extractContext(selection) {
  try {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // 상위 텍스트 노드나 요소 찾기
    let textElement = container;
    while (textElement && textElement.nodeType !== Node.ELEMENT_NODE) {
      textElement = textElement.parentNode;
    }
    
    // 더 큰 컨텍스트를 위해 상위 요소 탐색
    while (textElement && textElement.textContent.length < 100) {
      textElement = textElement.parentNode;
      if (!textElement || textElement === document.body) break;
    }
    
    if (textElement && textElement.textContent) {
      const fullText = textElement.textContent.trim();
      const selectedText = selection.toString().trim();
      const selectedIndex = fullText.indexOf(selectedText);
      
      if (selectedIndex !== -1) {
        // 선택된 텍스트 앞뒤 50자씩 추출
        const start = Math.max(0, selectedIndex - 50);
        const end = Math.min(fullText.length, selectedIndex + selectedText.length + 50);
        return fullText.substring(start, end);
      }
    }
    
    return selection.toString();
  } catch (error) {
    console.error('Context extraction error:', error);
    return selection.toString();
  }
}

// 팝업 생성 함수
function createPopup(selectedText, x, y) {
  // 기존 팝업 제거
  removePopup();
  
  const popup = document.createElement('div');
  popup.id = 'context-dictionary-popup';
  popup.className = 'context-dict-popup';
  
  popup.innerHTML = `
    <div class="context-dict-header">
      <span class="context-dict-word">${selectedText}</span>
      <button class="context-dict-close">×</button>
    </div>
    <div class="context-dict-content">
      <div class="context-dict-loading">번역 중...</div>
    </div>
  `;
  
  // 위치 계산
  const popupWidth = 300;
  const popupHeight = 150;
  const margin = 10;
  
  // 화면 경계 체크
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;
  
  let left = x + scrollX;
  let top = y + scrollY + 20; // 마우스 포인터 아래쪽에 표시
  
  // 오른쪽 경계 체크
  if (left + popupWidth > viewportWidth + scrollX - margin) {
    left = viewportWidth + scrollX - popupWidth - margin;
  }
  
  // 왼쪽 경계 체크
  if (left < scrollX + margin) {
    left = scrollX + margin;
  }
  
  // 아래쪽 경계 체크
  if (top + popupHeight > viewportHeight + scrollY - margin) {
    top = y + scrollY - popupHeight - 10; // 마우스 포인터 위쪽에 표시
  }
  
  // 위쪽 경계 체크
  if (top < scrollY + margin) {
    top = scrollY + margin;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  document.body.appendChild(popup);
  currentPopup = popup;
  
  // 닫기 버튼 이벤트
  popup.querySelector('.context-dict-close').addEventListener('click', removePopup);
  
  // 팝업 외부 클릭 시 닫기
  setTimeout(() => {
    document.addEventListener('click', outsideClickHandler);
  }, 100);
  
  return popup;
}

// 팝업 외부 클릭 핸들러
function outsideClickHandler(event) {
  if (currentPopup && !currentPopup.contains(event.target)) {
    removePopup();
  }
}

// 팝업 제거 함수
function removePopup() {
  if (currentPopup) {
    document.removeEventListener('click', outsideClickHandler);
    currentPopup.remove();
    currentPopup = null;
  }
}

// 번역 결과 표시 함수
function displayTranslation(popup, result) {
  const contentDiv = popup.querySelector('.context-dict-content');
  
  if (result.error) {
    contentDiv.innerHTML = `
      <div class="context-dict-error">
        <p>오류가 발생했습니다</p>
        <small>${result.error}</small>
      </div>
    `;
  } else {
    contentDiv.innerHTML = `
      <div class="context-dict-translation">
        <div class="context-dict-meaning">
          <strong>의미:</strong> ${result.meaning}
        </div>
        ${result.partOfSpeech ? `<div class="context-dict-pos"><strong>품사:</strong> ${result.partOfSpeech}</div>` : ''}
        ${result.example ? `<div class="context-dict-example"><strong>예문:</strong> ${result.example}</div>` : ''}
      </div>
    `;
  }
}

// 마우스 업 이벤트 핸들러
function handleMouseUp(event) {
  if (isProcessing) return;
  
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // 선택된 텍스트가 있고, 영어이며, 단일 단어인지 확인
  if (selectedText && 
      isEnglishText(selectedText) && 
      isSingleWord(selectedText) &&
      selectedText.length >= 2) {
    
    isProcessing = true;
    
    // 문맥 추출
    const context = extractContext(selection);
    
    // 팝업 생성
    const popup = createPopup(selectedText, event.clientX, event.clientY);
    
    // 백그라운드 스크립트에 번역 요청
    chrome.runtime.sendMessage({
      action: 'translate',
      word: selectedText,
      context: context
    }, (response) => {
      isProcessing = false;
      if (popup === currentPopup) {
        displayTranslation(popup, response);
      }
    });
  }
}

// 키보드 이벤트 핸들러 (ESC 키로 팝업 닫기)
function handleKeyDown(event) {
  if (event.key === 'Escape' && currentPopup) {
    removePopup();
  }
}

// 이벤트 리스너 등록
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('keydown', handleKeyDown);

// 페이지 언로드 시 팝업 제거
window.addEventListener('beforeunload', removePopup);