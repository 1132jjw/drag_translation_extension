// Popup JavaScript - 설정 페이지 동작 처리

document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  const form = document.getElementById('settingsForm');
  
  // 저장된 API 키 로드
  loadSavedApiKey();
  
  // 폼 제출 이벤트
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveApiKey();
  });
  
  // 테스트 버튼 이벤트
  testBtn.addEventListener('click', function() {
    testApiConnection();
  });
  
  // API 키 입력 이벤트 (상태 메시지 초기화)
  apiKeyInput.addEventListener('input', function() {
    clearStatus();
  });
  
  // 저장된 API 키 로드 함수
  function loadSavedApiKey() {
    chrome.storage.sync.get(['openai_api_key'], function(result) {
      if (result.openai_api_key) {
        apiKeyInput.value = result.openai_api_key;
        showStatus('API 키가 설정되어 있습니다.', 'success');
      } else {
        showStatus('API 키를 입력해주세요.', 'info');
      }
    });
  }
  
  // API 키 저장 함수
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('API 키를 입력해주세요.', 'error');
      return;
    }
    
    if (!validateApiKey(apiKey)) {
      showStatus('올바른 OpenAI API 키 형식이 아닙니다. (sk-로 시작해야 합니다)', 'error');
      return;
    }
    
    // 저장 버튼 비활성화
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    
    chrome.storage.sync.set({
      'openai_api_key': apiKey
    }, function() {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
      
      if (chrome.runtime.lastError) {
        showStatus('저장 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('API 키가 성공적으로 저장되었습니다.', 'success');
      }
    });
  }
  
  // API 연결 테스트 함수
  async function testApiConnection() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('테스트할 API 키를 입력해주세요.', 'error');
      return;
    }
    
    if (!validateApiKey(apiKey)) {
      showStatus('올바른 OpenAI API 키 형식이 아닙니다.', 'error');
      return;
    }
    
    // UI 상태 변경
    testBtn.disabled = true;
    testBtn.textContent = '테스트 중...';
    loadingDiv.style.display = 'block';
    clearStatus();
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message.'
            }
          ],
          max_tokens: 10,
          temperature: 0
        })
      });
      
      if (response.ok) {
        showStatus('✅ API 연결이 성공했습니다! 이제 확장 프로그램을 사용할 수 있습니다.', 'success');
      } else {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'API 연결에 실패했습니다.';
        
        if (response.status === 401) {
          errorMessage = '❌ API 키가 유효하지 않습니다.';
        } else if (response.status === 429) {
          errorMessage = '❌ API 사용량 한도에 도달했습니다.';
        } else if (response.status === 403) {
          errorMessage = '❌ API 키에 필요한 권한이 없습니다.';
        } else if (errorData?.error?.message) {
          errorMessage = `❌ ${errorData.error.message}`;
        }
        
        showStatus(errorMessage, 'error');
      }
      
    } catch (error) {
      console.error('Test error:', error);
      showStatus('❌ 네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.', 'error');
    } finally {
      // UI 상태 복원
      testBtn.disabled = false;
      testBtn.textContent = '연결 테스트';
      loadingDiv.style.display = 'none';
    }
  }
  
  // API 키 형식 검증 함수
 async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (response.status === 401) {
      return false; // 잘못된 키
    }
    return response.ok; // 200이면 정상
  } catch (e) {
    return false;
  }
}
  
  // 상태 메시지 표시 함수
  function showStatus(message, type) {
    statusDiv.innerHTML = `<div class="status status-${type}">${message}</div>`;
  }
  
  // 상태 메시지 초기화 함수
  function clearStatus() {
    statusDiv.innerHTML = '';
  }
  
  // 단축키 안내
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      saveApiKey();
    }
  });
  
  // 툴팁이나 추가 도움말 표시
  const helpLinks = document.querySelectorAll('.help-text a');
  helpLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // 외부 링크는 새 탭에서 열기
      if (this.hostname !== window.location.hostname) {
        e.preventDefault();
        chrome.tabs.create({ url: this.href });
      }
    });
  });
  
  // 개발자 모드에서 추가 정보 표시
  if (chrome.runtime && chrome.runtime.getManifest().key) {
    console.log('Extension running in development mode');
  }
});

// 확장 프로그램 설치 시 환영 메시지
chrome.runtime.onInstalled && chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    const welcomeMessage = `
      Context Dictionary 확장 프로그램을 설치해주셔서 감사합니다!
      
      사용하려면:
      1. OpenAI API 키를 입력하세요
      2. 웹페이지에서 영어 단어를 드래그하세요
      3. 문맥에 맞는 번역을 확인하세요
    `;
    console.log(welcomeMessage);
  }
});