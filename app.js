// 글로벌 변수 선언
let markers = [];
let map;
let mapLoaded = false;
let currentInfoWindow = null;  // 현재 열려 있는 인포윈도우
let selectedMarker = null;     // 현재 선택된 마커

let defaultMarkerImage;
let selectedMarkerImage;

console.log("app.js 로드됨");

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM이 로드되었습니다.");
    
    // 디버깅 정보 초기화
    const debugStatus = document.getElementById('debug-status');
    if (debugStatus) {
        debugStatus.innerHTML = "카카오맵 스크립트 로딩 중...";
    }
    
    // API 키 검증
    if (typeof KAKAO_MAP_API_KEY === 'undefined' || KAKAO_MAP_API_KEY === '__KAKAO_MAP_API_KEY__') {
        console.error("카카오맵 API 키가 설정되지 않았습니다");
        updateDebugStatus("API 키 오류: 카카오맵 API 키가 설정되지 않았습니다. config.js 파일을 확인하세요.");
        return;
    }
    
    // API 키 디버그 정보 업데이트 (보안을 위해 일부만 표시)
    const apiKey = KAKAO_MAP_API_KEY;
    const apiKeyDebug = document.getElementById('api-key-debug');
    if (apiKeyDebug) {
        apiKeyDebug.textContent = `API 키: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length}자)`;
    }
    
    // 카카오맵 스크립트 동적 로드
    loadKakaoMapScript(KAKAO_MAP_API_KEY);
});

// 카카오맵 스크립트를 동적으로 로드하는 함수
function loadKakaoMapScript(apiKey) {
    console.log("카카오맵 스크립트 로딩 시작...");
    updateDebugStatus("카카오맵 스크립트 로딩 시작...");
    
    // 이미 로드된 스크립트가 있으면 제거
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
        existingScript.remove();
        console.log("기존 카카오맵 스크립트 제거");
    }
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    
    script.onload = function() {
        console.log("카카오맵 스크립트 파일 로드 완료, 초기화 시작...");
        updateDebugStatus("카카오맵 스크립트 파일 로드 완료, 초기화 중...");
        
        // 카카오맵 API 초기화
        kakao.maps.load(function() {
            console.log("카카오맵 API 초기화 완료!");
            updateDebugStatus("카카오맵 API 초기화 완료. 지도 생성 중...");
            initMap();
        });
    };
    
    script.onerror = function() {
        console.error("카카오맵 스크립트 로드 실패!");
        updateDebugStatus("카카오맵 스크립트 로드 실패!");
    };
    
    document.head.appendChild(script);
}

// 디버그 상태 업데이트 헬퍼 함수
function updateDebugStatus(message) {
    const debugStatus = document.getElementById('debug-status');
    if (debugStatus) {
        debugStatus.innerHTML = message;
    }
}

// 지도 초기화 함수
function initMap() {
    console.log("initMap 함수 실행 시작...");
    
    try {
        // kakao 객체 존재 확인
        if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
            console.error("kakao.maps 객체가 정의되지 않았습니다.");
            updateDebugStatus("카카오맵 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.");
            return;
        }
        
        // kakao.maps.LatLng가 함수인지 확인
        if (typeof kakao.maps.LatLng !== 'function') {
            console.error("kakao.maps.LatLng가 함수가 아닙니다:", typeof kakao.maps.LatLng);
            updateDebugStatus("카카오맵 API가 완전히 초기화되지 않았습니다. 잠시 후 다시 시도합니다.");
            
            // 1초 후 다시 시도
            setTimeout(initMap, 1000);
            return;
        }
        
        console.log("kakao 객체 확인 완료");
        
        // 지도 컨테이너
        const container = document.getElementById('map');
        if (!container) {
            console.error("map 요소를 찾을 수 없습니다.");
            return;
        }

        // 지도 컨테이너 스타일 확인
        const containerStyle = window.getComputedStyle(container);
        console.log("지도 컨테이너 크기:", containerStyle.width, containerStyle.height);
        
        if (containerStyle.width === '0px' || containerStyle.height === '0px') {
            console.error("지도 컨테이너의 크기가 0입니다. 스타일을 확인해주세요.");
            container.style.width = '100%';
            container.style.height = '600px';
        }

        
        try {
            // 서울 중심 좌표
            console.log("서울 중심 좌표 생성 시도");
            const seoulCenter = new kakao.maps.LatLng(37.5665, 126.9780);
            console.log("좌표 객체 생성 완료:", seoulCenter);
            
            // 지도 옵션 설정
            const options = {
                center: seoulCenter,
                level: 8 // 서울 전체가 보이는 적절한 확대 레벨
            };
            
            // 지도 생성
            console.log("카카오맵 객체 생성 시도...");
            map = new kakao.maps.Map(container, options);
            console.log("카카오맵 객체 생성 완료");
            mapLoaded = true;
            
            // 디버깅 상태 업데이트
            updateDebugStatus("지도 생성 완료, 데이터 로딩 중...");
            
            // 사용자 위치 확인 (위치정보 동의한 경우)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    // 성공 시 콜백
                    function(position) {
                        try {
                            const userPosition = new kakao.maps.LatLng(
                                position.coords.latitude, 
                                position.coords.longitude
                            );
                            
                            // 사용자 위치로 지도 중심 이동
                            map.setCenter(userPosition);
                            map.setLevel(4); // 더 가깝게 확대
                            
                            // 사용자 위치 마커 표시
                            const userMarker = new kakao.maps.Marker({
                                position: userPosition,
                                map: map
                            });
                            
                            // 사용자 위치 인포윈도우
                            const infoWindow = new kakao.maps.InfoWindow({
                                content: '<div style="padding:5px;font-size:12px;">현재 위치</div>'
                            });
                            
                            infoWindow.open(map, userMarker);
                            console.log("사용자 위치 설정 완료");
                        } catch (error) {
                            console.error("사용자 위치 설정 중 오류:", error);
                        }
                    },
                    // 실패 시 콜백 - 서울 중심으로 유지
                    function(error) {
                        console.log("위치 정보를 가져올 수 없습니다:", error.message);
                        // 데모 데이터 로드
                        loadDemoFountains();
                    }
                );
            } else {
                // 위치 정보를 지원하지 않는 브라우저인 경우
                console.log("이 브라우저는 위치 정보를 지원하지 않습니다.");
                loadDemoFountains();
            }
            
            // 위치 정보 확인 여부와 관계없이 음수대 정보 로드 시작
            loadDemoFountains();

            // 지도를 클릭했을 때 인포윈도우 닫기
            kakao.maps.event.addListener(map, 'click', function() {
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                    currentInfoWindow = null;
                }
                
                // 선택된 마커 초기화
                if (selectedMarker) {
                    selectedMarker.setImage(defaultMarkerImage);
                    selectedMarker = null;
                }
            });
            
        } catch (error) {
            console.error("지도 초기화 과정에서 오류 발생:", error);
            updateDebugStatus(`지도 초기화 오류: ${error.message}`);
        }
        
    } catch (error) {
        console.error("지도 초기화 중 예외가 발생했습니다:", error);
        updateDebugStatus(`지도 초기화 오류: ${error.message}`);
    }
}

// 마커 클릭 시 인포윈도우 내용 생성 함수
function createInfoWindowContent(fountain) {
    // what3words 값 처리
    let what3wordsDisplay = '';

    console.log("Fountain w3w value:", fountain.what3words);
    
    if (fountain.what3words && !fountain.what3words.includes(',') && !fountain.what3words.includes('오류')) {
        // what3words 주소가 성공적으로 변환된 경우
        const w3wMapUrl = `https://what3words.com/${fountain.what3words}`;
        
        what3wordsDisplay = `
            <div style="margin:5px 0;">
                <span style="font-weight:bold;">what3words:</span> 
                <a href="${w3wMapUrl}" target="_blank" style="color:#4CAF50; font-weight:bold; text-decoration:none;">
                    ${fountain.what3words}
                </a>
            </div>
        `;
    } else {
        // 변환 실패한 경우 좌표 직접 표시
        const coords = fountain.lat && fountain.lng ? 
            `${fountain.lat.toFixed(6)}, ${fountain.lng.toFixed(6)}` : 
            fountain.what3words || '좌표 없음';
        
        what3wordsDisplay = `
            <div style="margin:5px 0;">
                <span style="font-weight:bold;">위치 좌표:</span> 
                <span style="color:#1976D2;">${coords}</span>
            </div>
        `;
    }
    
    return `
        <div style="padding:10px;width:250px;font-size:12px;line-height:1.5;">
            <div style="font-weight:bold;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:8px;color:#333;">
                음수대 정보
            </div>
            <div style="margin:5px 0;">
                <span style="font-weight:bold;">이름:</span> ${fountain.name || '정보 없음'}
            </div>
            <div style="margin:5px 0;">
                <span style="font-weight:bold;">주소:</span> ${fountain.address || '정보 없음'}
            </div>
            <div style="margin:5px 0;">
                <span style="font-weight:bold;">상세 위치:</span> ${fountain.location || '정보 없음'}
            </div>
            ${what3wordsDisplay}
        </div>
    `;
}

// GitHub Pages에서는 샘플 데이터 사용
function loadDemoFountains() {
    console.log("데모 음수대 정보 로드 시작...");
    
    // 지도가 로드되지 않았으면 대기
    if (!mapLoaded) {
        console.log("지도가 아직 로드되지 않았습니다. 음수대 로드를 연기합니다.");
        updateDebugStatus("지도 로드 대기 중... 잠시 후 다시 시도합니다.");
        setTimeout(loadDemoFountains, 1000);
        return;
    }
    
    // 마커 이미지 초기화
    initMarkerImages();
    
    updateDebugStatus("음수대 데이터 로딩 중...");
    
    // 기본 예시 데이터 (서울 주요 공원 몇 곳)
    const demoFountains = [
        {
            id: "1",
            name: "여의도 공원 음수대",
            address: "서울특별시 영등포구 여의동",
            location: "여의도 공원 내",
            lat: 37.5256,
            lng: 126.9249,
            what3words: "리뷰.병실.빈도"
        },
        {
            id: "2",
            name: "올림픽 공원 음수대",
            address: "서울특별시 송파구 방이동",
            location: "올림픽 공원 내",
            lat: 37.5202,
            lng: 127.1247,
            what3words: "다가올.내려왔다.파도"
        },
        {
            id: "3",
            name: "북서울 꿈의 숲 음수대",
            address: "서울특별시 강북구 번동",
            location: "북서울 꿈의 숲 내",
            lat: 37.6202,
            lng: 127.0449,
            what3words: "풍요.정류장.계단"
        },
        {
            id: "4",
            name: "한강 공원 음수대",
            address: "서울특별시 용산구 이촌동",
            location: "이촌 한강공원 내",
            lat: 37.5168,
            lng: 126.9742,
            what3words: "입력.안개.발표"
        },
        {
            id: "5",
            name: "남산 공원 음수대",
            address: "서울특별시 중구 남산동",
            location: "남산 공원 내",
            lat: 37.5512,
            lng: 126.9882,
            what3words: "시골.포함.지역"
        }
    ];
    
    // 기존 마커와 인포윈도우 제거
    clearMarkers();
    currentInfoWindow = null;
    selectedMarker = null;
    
    // 음수대 마커 생성
    demoFountains.forEach(fountain => {
        try {
            const position = new kakao.maps.LatLng(fountain.lat, fountain.lng);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: position,
                map: map,
                title: fountain.name || "음수대"
            });
            
            // 인포윈도우 내용 생성
            const iwContent = createInfoWindowContent(fountain);
            
            // 인포윈도우 생성
            const infoWindow = new kakao.maps.InfoWindow({
                content: iwContent,
                removable: false  // 닫기 버튼 없음 (토글 방식으로 구현)
            });
            
            // 마커 클릭 이벤트 처리 - 토글 방식으로 인포윈도우 표시
            kakao.maps.event.addListener(marker, 'click', function() {
                // 이미 열려있는 인포윈도우가 있으면 닫기
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                }
                
                // 이전에 선택된 마커가 있으면 기본 이미지로 변경
                if (selectedMarker) {
                    selectedMarker.setImage(defaultMarkerImage);
                }
                
                // 현재 클릭한 마커와 이전에 열려있던 인포윈도우가 동일한 경우
                if (currentInfoWindow === infoWindow && selectedMarker === marker) {
                    // 닫힌 상태로 설정
                    currentInfoWindow = null;
                    selectedMarker = null;
                } else {
                    // 새 인포윈도우 열기
                    infoWindow.open(map, marker);
                    currentInfoWindow = infoWindow;
                    
                    // 선택된 마커 표시
                    marker.setImage(selectedMarkerImage);
                    selectedMarker = marker;
                }
            });
            
            // 마커 배열에 추가
            markers.push(marker);
        } catch (error) {
            console.error("마커 생성 중 오류:", error, fountain);
        }
    });
    
    // 지도 확대 레벨에 따라 마커 표시 최적화
    optimizeMarkers();
    
    // 줌 레벨 변경 시 마커 최적화
    kakao.maps.event.addListener(map, 'zoom_changed', optimizeMarkers);
    
    const validMarkers = markers.length;
    console.log(`총 ${demoFountains.length}개 중 ${validMarkers}개의 음수대에 마커를 표시했습니다.`);
    updateDebugStatus(`지도 로딩 완료! ${validMarkers}개의 음수대 표시됨 (데모 데이터)`);
}

// 마커 이미지 초기화 함수
function initMarkerImages() {
    // 기본 마커 이미지 설정 (기본 마커 사용)
    defaultMarkerImage = null;  // null은 기본 마커를 의미
    
    // 선택된 마커 이미지 설정 (빨간색 마커)
    const selectedSize = new kakao.maps.Size(24, 35);
    const selectedOption = { 
        offset: new kakao.maps.Point(12, 35)
    };
    
    // 선택된 마커는 빨간색 아이콘 사용
    selectedMarkerImage = new kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        selectedSize,
        selectedOption
    );
}

// 마커 최적화 함수
function optimizeMarkers() {
    if (!map) return;
    
    try {
        const currentLevel = map.getLevel();
        
        // 줌 레벨에 따라 마커 표시 조절
        if (currentLevel > 7) {
            // 확대 레벨이 낮을 때(넓은 지역)는 마커 숨기기
            markers.forEach(marker => {
                marker.setMap(null);
            });
        } else {
            // 확대 레벨이 높을 때는 마커 표시
            markers.forEach(marker => {
                marker.setMap(map);
            });
        }
    } catch (error) {
        console.error("마커 최적화 중 오류:", error);
    }
}

// 마커 초기화 함수
function clearMarkers() {
    try {
        markers.forEach(marker => {
            marker.setMap(null);
        });
        markers = [];
    } catch (error) {
        console.error("마커 초기화 중 오류:", error);
    }
}

// 지역별 검색 기능
function searchFountain() {
    const searchText = document.getElementById('search-input').value.trim();
    if (!searchText) return;
    
    console.log("검색 시작: " + searchText);
    updateDebugStatus("검색 중: " + searchText);

    // 이미 열려있는 인포윈도우와 선택된 마커 초기화
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
    
    if (selectedMarker) {
        selectedMarker.setImage(defaultMarkerImage);
        selectedMarker = null;
    }

    // 기본 예시 데이터 (서울 주요 공원 몇 곳)
    const demoFountains = [
        {
            id: "1",
            name: "여의도 공원 음수대",
            address: "서울특별시 영등포구 여의동",
            location: "여의도 공원 내",
            lat: 37.5256,
            lng: 126.9249,
            what3words: "리뷰.병실.빈도"
        },
        {
            id: "2",
            name: "올림픽 공원 음수대",
            address: "서울특별시 송파구 방이동",
            location: "올림픽 공원 내",
            lat: 37.5202,
            lng: 127.1247,
            what3words: "다가올.내려왔다.파도"
        },
        {
            id: "3",
            name: "북서울 꿈의 숲 음수대",
            address: "서울특별시 강북구 번동",
            location: "북서울 꿈의 숲 내",
            lat: 37.6202,
            lng: 127.0449,
            what3words: "풍요.정류장.계단"
        },
        {
            id: "4",
            name: "한강 공원 음수대",
            address: "서울특별시 용산구 이촌동",
            location: "이촌 한강공원 내",
            lat: 37.5168,
            lng: 126.9742,
            what3words: "입력.안개.발표"
        },
        {
            id: "5",
            name: "남산 공원 음수대",
            address: "서울특별시 중구 남산동",
            location: "남산 공원 내",
            lat: 37.5512,
            lng: 126.9882,
            what3words: "시골.포함.지역"
        }
    ];

    // 검색어로 필터링 (지역명, 주소, 이름, what3words 등)
    const results = demoFountains.filter(fountain => 
        (fountain.name && fountain.name.includes(searchText)) || 
        (fountain.address && fountain.address.includes(searchText)) ||
        (fountain.location && fountain.location.includes(searchText)) ||
        (fountain.what3words && fountain.what3words.includes(searchText))
    );

    if (results.length > 0) {
        // 검색 결과 마커만 표시
        clearMarkers();
        
        // 검색 결과의 중심점 계산
        let sumLat = 0;
        let sumLng = 0;
        
        results.forEach(fountain => {
            sumLat += fountain.lat;
            sumLng += fountain.lng;
            
            try {
                const position = new kakao.maps.LatLng(fountain.lat, fountain.lng);
                
                // 마커 생성
                const marker = new kakao.maps.Marker({
                    position: position,
                    map: map,
                    title: fountain.name || "음수대"
                });
                
                // 인포윈도우 내용 생성
                const iwContent = createInfoWindowContent(fountain);
                
                // 인포윈도우 생성
                const infoWindow = new kakao.maps.InfoWindow({
                    content: iwContent,
                    removable: false  // 닫기 버튼 없음 (토글 방식으로 구현)
                });
                
                // 마커 클릭 이벤트 처리 - 토글 방식으로 인포윈도우 표시
                kakao.maps.event.addListener(marker, 'click', function() {
                    // 이미 열려있는 인포윈도우가 있으면 닫기
                    if (currentInfoWindow) {
                        currentInfoWindow.close();
                    }
                    
                    // 이전에 선택된 마커가 있으면 기본 이미지로 변경
                    if (selectedMarker) {
                        selectedMarker.setImage(defaultMarkerImage);
                    }
                    
                    // 현재 클릭한 마커와 이전에 열려있던 인포윈도우가 동일한 경우
                    if (currentInfoWindow === infoWindow && selectedMarker === marker) {
                        // 닫힌 상태로 설정
                        currentInfoWindow = null;
                        selectedMarker = null;
                    } else {
                        // 새 인포윈도우 열기
                        infoWindow.open(map, marker);
                        currentInfoWindow = infoWindow;
                        
                        // 선택된 마커 표시
                        marker.setImage(selectedMarkerImage);
                        selectedMarker = marker;
                    }
                });
                
                markers.push(marker);
            } catch (error) {
                console.error("검색 결과 마커 생성 중 오류:", error);
            }
        });
        
        // 검색 결과의 중심으로 지도 이동
        try {
            const centerLat = sumLat / results.length;
            const centerLng = sumLng / results.length;
            const center = new kakao.maps.LatLng(centerLat, centerLng);
            
            map.setCenter(center);
            
            // 검색 결과 수에 따라 줌 레벨 조정
            if (results.length === 1) {
                map.setLevel(3);
            } else if (results.length <= 5) {
                map.setLevel(5);
            } else {
                map.setLevel(7);
            }
        } catch (error) {
            console.error("지도 중심 이동 중 오류:", error);
        }
        
        // 검색 결과 갯수 표시
        document.getElementById('search-result-count').textContent = `검색 결과: ${results.length}개`;
        document.getElementById('search-result-count').style.display = 'block';
        updateDebugStatus(`검색 완료: ${results.length}개의 결과 발견`);
    } else {
        alert("검색 결과가 없습니다.");
        document.getElementById('search-result-count').style.display = 'none';
        updateDebugStatus("검색 결과 없음: " + searchText);
    }
}

// 검색 초기화 함수
function resetSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-result-count').style.display = 'none';
    loadDemoFountains(); // 원래 상태로 복원
    updateDebugStatus("검색 초기화됨, 모든 음수대 표시 중...");
}

// 엔터키 처리
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        searchFountain();
    }
}

// 디버깅 정보 표시 토글
function toggleDebugInfo() {
    const debugElement = document.getElementById('debug-info');
    const debugButton = document.getElementById('debug-toggle');
    
    if (debugElement.style.display === 'none') {
        debugElement.style.display = 'block';
        debugButton.textContent = '디버깅 숨기기';
    } else {
        debugElement.style.display = 'none';
        debugButton.textContent = '디버깅';
    }
}

// 카카오맵 직접 로드 테스트 함수
function testKakaoMapLoad() {
    const testResult = document.getElementById('test-result');
    testResult.textContent = "테스트 중...";
    testResult.style.color = "blue";
    
    // kakao 객체 확인
    if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
        testResult.textContent = "카카오맵 API가 로드되지 않았습니다.";
        testResult.style.color = "red";
    } else {
        testResult.textContent = "카카오맵 API가 로드되어 있습니다.";
        testResult.style.color = "green";
        
        // kakao.maps.load가 있는지 확인
        if (typeof kakao.maps.load === 'function') {
            testResult.textContent += " kakao.maps.load 함수가 존재합니다.";
            
            kakao.maps.load(function() {
                try {
                    // LatLng 생성 테스트
                    const testCoords = new kakao.maps.LatLng(37.5665, 126.9780);
                    testResult.textContent += " 좌표 생성 성공!";
                    
                    if (!mapLoaded) {
                        // 지도 초기화
                        initMap();
                    } else {
                        testResult.textContent += " 지도가 이미 초기화되어 있습니다.";
                    }
                } catch (e) {
                    testResult.textContent += " 좌표 생성 실패: " + e.message;
                    testResult.style.color = "red";
                }
            });
        } else {
            try {
                // LatLng 생성 테스트
                const testCoords = new kakao.maps.LatLng(37.5665, 126.9780);
                testResult.textContent += " 좌표 생성 성공!";
                
                if (!mapLoaded) {
                    // 지도 초기화
                    initMap();
                } else {
                    testResult.textContent += " 지도가 이미 초기화되어 있습니다.";
                }
            } catch (e) {
                testResult.textContent += " 좌표 생성 실패: " + e.message;
                testResult.style.color = "red";
            }
        }
    }
}