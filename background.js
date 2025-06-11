// Background Service Worker - OpenAI API와 통신하여 번역 처리

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.word, request.context)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
});

// 번역 처리 함수
async function handleTranslation(word, context) {
  try {
    // 저장된 API 키 가져오기
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다. 확장 프로그램 설정에서 API 키를 입력해주세요.');
    }
    
    // DictionaryAPI.dev에서 기본 뜻 가져오기
    const dictInfo = await callDictionaryAPI(word);

    // OpenAI API 호출
    const translation = await callOpenAI(apiKey, word, context, dictInfo);
    
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return { error: error.message };
  }
}

// API 키 가져오기 함수
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openai_api_key'], (result) => {
      resolve(result.openai_api_key);
    });
  });
}

// DictionaryAPI.dev에서 기본 의미 조회
async function callDictionaryAPI(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data[0] && data[0].meanings && data[0].meanings[0]) {
      const meaning = data[0].meanings[0];
      const def = meaning.definitions && meaning.definitions[0] ? meaning.definitions[0] : {};
      return {
        definition: def.definition || '',
        partOfSpeech: meaning.partOfSpeech || '',
        example: def.example || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Dictionary API error:', error);
    return null;
  }
}

// OpenAI API 호출 함수
async function callOpenAI(apiKey, word, context, dictInfo) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const dictSection = dictInfo && dictInfo.definition ? `사전 정의: ${dictInfo.definition}\n품사: ${dictInfo.partOfSpeech}\n예문: ${dictInfo.example}` : '';

  const prompt = `다음 영어 단어를 주어진 문맥에서 가장 적절한 하나의 의미로 한국어로 번역해주세요. 여러 의미 중 문맥에 가장 맞는 하나만 선택해주세요. 사전 정의가 제공되면 참고하세요.

단어: "${word}"
문맥: "${context}"
${dictSection}

다음 JSON 형식으로만 응답해주세요:
{
  "meaning": "문맥에 맞는 한국어 의미",
  "partOfSpeech": "품사 (명사, 동사, 형용사 등)",
  "example": "해당 의미로 사용된 간단한 영어 예문"
}`;

  const requestBody = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "당신은 영어-한국어 번역 전문가입니다. 주어진 문맥에서 가장 적절한 의미만을 선택하여 번역해주세요."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 300
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      if (response.status === 401) {
        throw new Error('API 키가 유효하지 않습니다. 설정에서 올바른 OpenAI API 키를 입력해주세요.');
      } else if (response.status === 429) {
        throw new Error('API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
      } else if (response.status === 500) {
        throw new Error('OpenAI 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        throw new Error(`API 오류 (${response.status}): ${errorData?.error?.message || '알 수 없는 오류'}`);
      }
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('올바르지 않은 API 응답입니다.');
    }

    const content = data.choices[0].message.content.trim();
    
    // JSON 파싱 시도
    try {
      const result = JSON.parse(content);
      
      // 필수 필드 검증
      if (!result.meaning) {
        throw new Error('번역 결과에 의미가 포함되지 않았습니다.');
      }
      
      return {
        meaning: result.meaning,
        partOfSpeech: result.partOfSpeech || '',
        example: result.example || ''
      };
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      
      // JSON 파싱 실패 시 텍스트에서 정보 추출 시도
      return extractFromText(content, word);
    }
    
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

// 텍스트에서 번역 정보 추출 함수 (JSON 파싱 실패 시 대안)
function extractFromText(content, word) {
  // 간단한 텍스트 파싱으로 의미 추출
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  let meaning = '';
  let partOfSpeech = '';
  let example = '';
  
  for (const line of lines) {
    if (line.includes('의미') || line.includes('뜻') || line.includes('meaning')) {
      meaning = line.replace(/.*[:：]\s*/, '').replace(/["\{\}]/g, '').trim();
    } else if (line.includes('품사') || line.includes('part')) {
      partOfSpeech = line.replace(/.*[:：]\s*/, '').replace(/["\{\}]/g, '').trim();
    } else if (line.includes('예문') || line.includes('example')) {
      example = line.replace(/.*[:：]\s*/, '').replace(/["\{\}]/g, '').trim();
    }
  }
  
  // 의미를 찾지 못한 경우 첫 번째 줄 사용
  if (!meaning && lines.length > 0) {
    meaning = lines[0].replace(/["\{\}]/g, '').trim();
  }
  
  return {
    meaning: meaning || `"${word}"에 대한 번역을 찾을 수 없습니다.`,
    partOfSpeech: partOfSpeech,
    example: example
  };
}

// 확장 프로그램 설치 시 초기 설정
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 첫 설치 시 설정 페이지 열기
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});

// 컨텍스트 메뉴 생성 (선택 사항)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '선택한 단어 번역',
    contexts: ['selection']
  });
});

// 컨텍스트 메뉴 클릭 핸들러
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    
    // 영어 단어인지 확인
    const englishPattern = /^[a-zA-Z\s'-]+$/;
    if (englishPattern.test(selectedText)) {
      // Content script에 메시지 전송
      chrome.tabs.sendMessage(tab.id, {
        action: 'translateSelection',
        text: selectedText
      });
    }
  }
});