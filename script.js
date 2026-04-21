let buildingData = null;
let currentZoom = 1;

// 드래그 상태 관리 변수
let isDragging = false;
let startX, startY;
let scrollLeft, scrollTop;

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('data.json');
        buildingData = await response.json();
    } catch (e) {
        console.error("데이터 로딩 실패", e);
    }
}

// 통합 검색 로직 (건물, 층, 키워드 모두 검색)
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim().toUpperCase();
    if (!query || !buildingData) return;

    let targetBuilding = null;
    let targetFloor = null;
    let pageId = null;

    // 1. 키워드 우선 검색 (keywords 배열 내 일치 여부 확인)
    for (const b of buildingData.buildings) {
        for (const fNum in b.floors) {
            const fInfo = b.floors[fNum];
            const keywords = (fInfo && fInfo.keywords) ? fInfo.keywords : [];
            if (keywords.some(k => query.includes(k.toUpperCase()))) {
                targetBuilding = b;
                targetFloor = fNum;
                pageId = typeof fInfo === 'object' ? fInfo.page : fInfo;
                break;
            }
        }
        if (pageId) break;
    }

    // 2. 키워드 매칭이 안 된 경우 건물/층 분석 실행
    if (!pageId) {
        const sortedBuildings = [...buildingData.buildings].sort((a, b) => b.name.length - a.name.length);
        for (const b of sortedBuildings) {
            if (query.includes(b.name.toUpperCase()) || query.includes(b.code.toUpperCase())) {
                targetBuilding = b;
                break;
            }
        }

        if (!targetBuilding && /^\d+/.test(query)) targetBuilding = buildingData.buildings[0];

        if (targetBuilding) {
            const roomMatch = query.match(/(\d{3,4})/);
            const floorMatch = query.match(/(\d+)\s*(층|F)/i);
            const basementMatch = query.includes('지하') || query.includes('B');

            if (basementMatch) targetFloor = "B1";
            else if (floorMatch) targetFloor = floorMatch[1];
            else if (roomMatch) {
                const rNum = roomMatch[1];
                targetFloor = rNum.length === 3 ? rNum[0] : rNum.substring(0, 2);
            } else {
                targetFloor = "1";
            }

            const fInfo = targetBuilding.floors[targetFloor];
            if (fInfo) pageId = typeof fInfo === 'object' ? fInfo.page : fInfo;
        }
    }

    if (targetBuilding && pageId) {
        displayMap(targetBuilding, targetFloor, pageId);
    } else {
        alert("검색 결과가 없습니다. 건물명이나 주요 시설명을 입력해 주세요.");
    }
}

// 지도 표시 및 중앙 정렬 로직
function displayMap(building, floor, pageId) {
    document.getElementById('placeholder').classList.add('hidden');
    document.getElementById('viewer').classList.remove('hidden');
    document.getElementById('resultInfo').classList.remove('hidden');
    
    document.getElementById('buildingTitle').innerText = building.name;
    document.getElementById('floorInfo').innerText = `${floor}층 (도면 번호: ${pageId})`;
    
    const img = document.getElementById('planImage');
    img.src = `assets/plans/page_${pageId}.png`;
    
    img.onload = () => {
        currentZoom = 1;
        updateZoom();
        centerImage(); // 이미지가 로드된 후 중앙 정렬 호출
    };

    img.onerror = () => {
        if (img.src.includes('.png')) img.src = img.src.replace('.png', '.PNG');
    };
}

// 뷰어 내에서 이미지 정중앙 배치
function centerImage() {
    const wrapper = document.getElementById('imageWrapper');
    const img = document.getElementById('planImage');
    wrapper.scrollLeft = (img.scrollWidth - wrapper.clientWidth) / 2;
    wrapper.scrollTop = (img.scrollHeight - wrapper.clientHeight) / 2;
}

// --- 드래그 이동 로직 ---
const wrapper = document.getElementById('imageWrapper');
const imgElement = document.getElementById('planImage');

// 이미지 자체 드래그 방지 (브라우저 기본 기능 차단)
imgElement.addEventListener('dragstart', (e) => e.preventDefault());

wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    wrapper.style.cursor = 'grabbing';
    // 클릭 시 마우스 좌표와 현재 스크롤 위치 기록
    startX = e.pageX - wrapper.offsetLeft;
    startY = e.pageY - wrapper.offsetTop;
    scrollLeft = wrapper.scrollLeft;
    scrollTop = wrapper.scrollTop;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    wrapper.style.cursor = 'grab';
});

wrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    // 마우스 이동 거리 계산
    const x = e.pageX - wrapper.offsetLeft;
    const y = e.pageY - wrapper.offsetTop;
    
    // 이동 민감도 설정 (1.5 ~ 2.0 권장)
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    
    wrapper.scrollLeft = scrollLeft - walkX;
    wrapper.scrollTop = scrollTop - walkY;
});

function updateZoom() {
    const img = document.getElementById('planImage');
    img.style.transform = `scale(${currentZoom})`;
}

// 줌 컨트롤 이벤트 바인딩
document.getElementById('zoomIn').onclick = () => { 
    currentZoom += 0.3; 
    updateZoom(); 
};
document.getElementById('zoomOut').onclick = () => { 
    if (currentZoom > 0.4) { 
        currentZoom -= 0.3; 
        updateZoom(); 
    } 
};
document.getElementById('resetZoom').onclick = () => { 
    currentZoom = 1; 
    updateZoom(); 
    centerImage(); 
};

// 검색 이벤트 바인딩
document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

// 데이터 로드 시작
loadData();
