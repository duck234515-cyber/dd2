let buildingData = null;
let currentZoom = 1;

// 구글 지도식 좌표 변수
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;

async function loadData() {
    try {
        const response = await fetch('data.json');
        buildingData = await response.json();
    } catch (e) {
        console.error("데이터 로딩 실패", e);
    }
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toUpperCase();
    if (!query || !buildingData) return;

    let targetBuilding = null, targetFloor = null, pageId = null;

    for (const b of buildingData.buildings) {
        for (const fNum in b.floors) {
            const fInfo = b.floors[fNum];
            const keywords = (fInfo && fInfo.keywords) ? fInfo.keywords : [];
            if (keywords.some(k => query.includes(k.toUpperCase()))) {
                targetBuilding = b; targetFloor = fNum;
                pageId = typeof fInfo === 'object' ? fInfo.page : fInfo;
                break;
            }
        }
        if (pageId) break;
    }

    if (!pageId) {
        const sorted = [...buildingData.buildings].sort((a, b) => b.name.length - a.name.length);
        for (const b of sorted) {
            if (query.includes(b.name.toUpperCase()) || query.includes(b.code.toUpperCase())) {
                targetBuilding = b; break;
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
            } else targetFloor = "1";
            const fInfo = targetBuilding.floors[targetFloor];
            if (fInfo) pageId = typeof fInfo === 'object' ? fInfo.page : fInfo;
        }
    }

    if (targetBuilding && pageId) displayMap(targetBuilding, targetFloor, pageId);
    else alert("검색 결과가 없습니다.");
}

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
        centerImage(); // 이미지 뜨면 화면 정중앙으로 좌표 계산
    };
    img.onerror = () => { if (img.src.includes('.png')) img.src = img.src.replace('.png', '.PNG'); };
}

// 화면 한가운데로 이미지 좌표 강제 이동
function centerImage() {
    const wrapper = document.getElementById('imageWrapper');
    const img = document.getElementById('planImage');
    
    translateX = (wrapper.clientWidth - (img.clientWidth * currentZoom)) / 2;
    translateY = (wrapper.clientHeight - (img.clientHeight * currentZoom)) / 2;
    
    updateTransform();
}

// 실제 화면에 좌표와 확대 배율 적용
function updateTransform() {
    const img = document.getElementById('planImage');
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
}

// --- 드래그 이벤트 (좌표계 방식) ---
const wrapper = document.getElementById('imageWrapper');

wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    wrapper.style.cursor = 'grabbing';
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    wrapper.style.cursor = 'grab';
});

wrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    // 마우스가 이동한 만큼 좌표 최신화
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

// 확대/축소 시 화면 중앙을 유지하며 커지도록 계산
function zoom(delta) {
    const wrapper = document.getElementById('imageWrapper');
    const newZoom = Math.max(0.2, currentZoom + delta);

    const centerX = wrapper.clientWidth / 2;
    const centerY = wrapper.clientHeight / 2;

    translateX = centerX - ((centerX - translateX) * (newZoom / currentZoom));
    translateY = centerY - ((centerY - translateY) * (newZoom / currentZoom));

    currentZoom = newZoom;
    updateTransform();
}

document.getElementById('zoomIn').onclick = () => zoom(0.3);
document.getElementById('zoomOut').onclick = () => zoom(-0.3);
document.getElementById('resetZoom').onclick = () => { currentZoom = 1; centerImage(); };

document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

loadData();
