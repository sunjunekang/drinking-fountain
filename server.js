// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 - 모든 도메인 허용
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// API 키 설정
const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const W3W_API_KEY = process.env.WHAT3WORDS_API_KEY;
const KAKAO_MAP_API_KEY = process.env.KAKAO_MAP_API_KEY;

// index.html 요청 처리 - API 키를 직접 삽입하지 않음
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});

// 정적 파일 제공
app.use(express.static('public'));

// 환경변수를 클라이언트에 제공하기 위한 엔드포인트
app.get('/api/config', (req, res) => {
    console.log("클라이언트가 API 키를 요청했습니다.");
    
    // API 키 가져오기 및 검증
    let kakaoMapApiKey = KAKAO_MAP_API_KEY;
    
    // API 키가 없거나 공백인 경우 확인
    if (!kakaoMapApiKey || kakaoMapApiKey.trim() === '') {
        console.error("카카오맵 API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.");
        return res.status(500).json({ 
            error: "API 키가 설정되지 않았습니다", 
            kakaoMapApiKey: null 
        });
    }
    
    // 따옴표, 공백 제거 (환경 변수에서 따옴표가 포함된 경우를 대비)
    kakaoMapApiKey = kakaoMapApiKey.replace(/["']/g, '').trim();
    
    console.log("카카오맵 API 키 길이:", kakaoMapApiKey.length);
    console.log("카카오맵 API 키(일부):", kakaoMapApiKey.substring(0, 4) + "..." + kakaoMapApiKey.substring(kakaoMapApiKey.length - 4));
    
    res.json({
        kakaoMapApiKey: kakaoMapApiKey
    });
});

// what3words 좌표를 주소로 변환하는 함수
async function convertToWhat3Words(lat, lng) {
    try {
        // API 키 확인
        if (!W3W_API_KEY) {
            console.error("What3Words API 키가 설정되지 않았습니다");
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        
        // 좌표 유효성 검사
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.error("유효하지 않은 좌표:", lat, lng);
            return "좌표 오류";
        }
        
        // 예시와 정확히 동일한 형식으로 API URL 구성
        // 주의: 공백 처리를 위해 coordinates 값에 공백이 있을 경우도 고려
        const coordinates = `${lat}, ${lng}`;
        
        // API 호출
        const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${encodeURIComponent(coordinates)}&language=ko&key=${W3W_API_KEY}`;
        
        console.log("what3words API 요청:", url.replace(W3W_API_KEY, "YOUR-API-KEY"));
        
        const response = await axios.get(url);
        
        // 응답 확인
        if (response.data && response.data.words) {
            console.log("what3words 변환 성공:", response.data.words);
            return response.data.words;
        } else {
            console.error("what3words 응답에 words 필드가 없음:", response.data);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    } catch (error) {
        console.error("what3words API 호출 오류:", error.message);
        if (error.response) {
            console.error("API 응답 상태:", error.response.status);
            console.error("API 응답 데이터:", error.response.data);
        }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// 구나 동으로 필터링하기 위한 지역 데이터 캐싱
let cachedFountains = [];

app.get('/api/water-fountains', async (req, res) => {
    try {
        // 캐싱된 데이터가 있으면 재사용
        if (cachedFountains.length > 0) {
            return res.json(cachedFountains);
        }

        const url = `http://openapi.seoul.go.kr:8088/${SEOUL_API_KEY}/json/TbViewGisArisu/1/1000/`;
        
        // 서울 데이터 API 호출
        let response;
        try {
            response = await axios.get(url, { timeout: 10000 }); // 10초 타임아웃
        } catch (apiError) {
            console.error("서울 데이터 API 오류:", apiError.message);
            return res.status(500).json({ error: '서울 데이터 API 오류: ' + apiError.message });
        }
        
        // 응답 데이터 구조 확인
        if (!response.data || !response.data.TbViewGisArisu || !response.data.TbViewGisArisu.row) {
            console.error("서울 데이터 API 응답 구조 오류:", response.data);
            return res.status(500).json({ error: '서울 데이터 API 응답 형식이 올바르지 않습니다' });
        }
        
        const fountains = response.data.TbViewGisArisu.row;
        console.log(`서울 데이터 API에서 ${fountains.length}개의 음수대 정보를 가져왔습니다.`);
        
        // 모든 음수대 정보 처리 (what3words 변환 포함)
        const processedFountains = await Promise.all(
            fountains.map(async (fountain) => {
                try {
                    // 좌표 데이터 추출 및 유효성 검사
                    const lat = parseFloat(fountain.LAT);
                    const lng = parseFloat(fountain.LNG);
                    
                    // what3words 변환 (유효한 좌표인 경우만)
                    let what3wordsValue = "좌표 정보 없음";
                    if (!isNaN(lat) && !isNaN(lng)) {
                        what3wordsValue = await convertToWhat3Words(lat, lng);
                    }
                    
                    return {
                        id: fountain.COT_CONTS_ID || String(Math.random()).substring(2, 10),
                        name: fountain.COT_CONTS_NAME || "이름 없음",
                        address: fountain.COT_ADDR_FULL_NEW || "주소 정보 없음",
                        location: fountain.COT_VALUE_03 || "상세 위치 정보 없음",
                        lat: !isNaN(lat) ? lat : null,
                        lng: !isNaN(lng) ? lng : null,
                        what3words: what3wordsValue
                    };
                } catch (err) {
                    console.error(`음수대 정보 처리 오류 (${fountain.COT_CONTS_NAME}):`, err);
                    // 오류가 발생해도 기본 정보는 포함
                    return {
                        id: fountain.COT_CONTS_ID || String(Math.random()).substring(2, 10),
                        name: fountain.COT_CONTS_NAME || "이름 없음",
                        address: fountain.COT_ADDR_FULL_NEW || "주소 정보 없음",
                        location: fountain.COT_VALUE_03 || "상세 위치 정보 없음",
                        lat: parseFloat(fountain.LAT) || null,
                        lng: parseFloat(fountain.LNG) || null,
                        what3words: "정보 처리 오류"
                    };
                }
            })
        );
        
        // 유효한 좌표가 있는 음수대만 필터링
        const validFountains = processedFountains.filter(f => f.lat !== null && f.lng !== null);
        console.log(`총 ${processedFountains.length}개 중 ${validFountains.length}개의 유효한 음수대 정보를 처리했습니다.`);
        
        // 캐싱
        cachedFountains = validFountains;
        
        res.json(validFountains);
    } catch (error) {
        console.error("API 요청 처리 중 오류:", error);
        res.status(500).json({ error: '데이터 로딩 중 오류 발생: ' + error.message });
    }
});

// 특정 지역(구, 동)으로 필터링하는 API 추가
app.get('/api/water-fountains/area/:area', (req, res) => {
    const area = req.params.area;
    
    if (!area || cachedFountains.length === 0) {
        return res.status(400).json({ error: '지역 정보가 없거나 데이터가 로드되지 않았습니다.' });
    }
    
    const filteredFountains = cachedFountains.filter(fountain => 
        fountain.address && fountain.address.includes(area)
    );
    
    res.json(filteredFountains);
});


// 서버 측 API 키 테스트 함수
app.get('/api/test-w3w', async (req, res) => {
    try {
        // API 키 확인
        if (!W3W_API_KEY) {
            return res.status(400).json({
                success: false,
                error: "What3Words API 키가 설정되지 않았습니다"
            });
        }
        
        // 테스트 좌표 (예시와 동일하게 사용)
        const lat = 37.598889;
        const lng = 126.911167;
        const coordinates = `${lat}, ${lng}`;
        
        // API 호출 URL
        const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${encodeURIComponent(coordinates)}&language=ko&key=${W3W_API_KEY}`;
        
        console.log("what3words API 테스트 요청:", url.replace(W3W_API_KEY, "YOUR-API-KEY"));
        
        // API 직접 호출
        const response = await axios.get(url);
        
        // 응답 확인
        if (response.data && response.data.words) {
            res.json({
                success: true,
                test_coordinates: coordinates,
                words: response.data.words,
                language: response.data.language,
                country: response.data.country,
                nearestPlace: response.data.nearestPlace,
                full_response: response.data
            });
        } else {
            res.status(500).json({
                success: false,
                error: "API 응답에 words 필드가 없습니다",
                response: response.data
            });
        }
    } catch (error) {
        console.error("API 테스트 오류:", error.message);
        
        const errorDetails = error.response ? {
            status: error.response.status,
            data: error.response.data
        } : {
            message: error.message
        };
        
        res.status(500).json({
            success: false,
            error: "what3words API 테스트 실패",
            details: errorDetails,
            api_key_length: W3W_API_KEY ? W3W_API_KEY.length : 0
        });
    }
});