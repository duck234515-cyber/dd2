let buildingData = null;

// 이미지 이동 및 확대 상태
let currentZoom = 1;
let translateX = 0;
let translateY = 0;

// 드래그 관련 변수
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
    
    // 이미지가 로드될 때 모든 설정 초기화 (정중앙 위치)
    img.onload = () => {
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    };
    
    img.onerror = () => { if (img.src.includes('.png')) img.src = img.src.replace('.png', '.PNG'); };
}

function updateTransform() {
    const img = document.getElementById('planImage');
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
}

// --- 완벽한 드래그 로직 ---
const wrapper = document.getElementById('imageWrapper');
const img = document.getElementById('planImage');

img.addEventListener('dragstart', (e) => e.preventDefault());

wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    wrapper.style.cursor = 'grabbing';
    // 드래그할 때는 부드러운 애니메이션 효과를 꺼서 마우스에 즉각 반응하게 함
    img.style.transition = 'none'; 
    
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        wrapper.style.cursor = 'grab';
        // 드래그 끝나면 확대/축소를 위해 애니메이션 다시 켬
        img.style.transition = 'transform 0.2s ease-out';
    }
});

wrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

// 확대/축소
document.getElementById('zoomIn').onclick = () => { 
    currentZoom += 0.3; 
    updateTransform(); 
};
document.getElementById('zoomOut').onclick = () => { 
    if (currentZoom > 0.4) { 
        currentZoom -= 0.3; 
        updateTransform(); 
    } 
};
document.getElementById('resetZoom').onclick = () => { 
    currentZoom = 1; 
    translateX = 0; 
    translateY = 0; 
    updateTransform(); 
};

document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

loadData();
