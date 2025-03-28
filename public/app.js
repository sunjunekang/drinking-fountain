async function initMap() {
    // 서울 중심 좌표
    const seoulCenter = [37.5665, 126.9780];

    // 지도 초기화
    const map = L.map('map').setView(seoulCenter, 11);

    // OpenStreetMap 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    try {
        // 서버에서 음수대 데이터 불러오기
        const response = await fetch('/api/water-fountains');
        const data = await response.json();
        
        // 음수대 마커 표시
        data.row.forEach(fountain => {
            if (fountain.LAT && fountain.LNG) {
                const marker = L.marker([fountain.LAT, fountain.LNG]).addTo(map);
                marker.bindPopup(`
                    <b>음수대 정보</b><br>
                    이름: ${fountain.COT_CONTS_NAME}<br>
                    주소: ${fountain.COT_ADDR_FULL_NEW}<br>
                    상세 위치: ${fountain.COT_VALUE_03 || '정보 없음'}
                `);
            }
        });

        console.log(`총 ${data.row.length}개의 음수대 정보를 불러왔습니다.`);
    } catch (error) {
        console.error("음수대 정보 로딩 중 오류:", error);
    }
}

// 페이지 로드 시 지도 초기화
document.addEventListener('DOMContentLoaded', initMap);