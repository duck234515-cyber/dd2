let buildingData = null;
let currentZoom = 1;

// 드래그 상태 관리
let isDragging = false;
let startX, startY;
let scrollLeft, scrollTop;

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

    let targetBuilding = null;
    let targetFloor = null;
    let pageId = null;

    // 1. 키워드 검색
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

    // 2. 기본 건물/층 검색
    if (!pageId) {
        const sorted = [...buildingData.buildings].sort((a, b) => b.name.length - a.name.length);
        for (const b of sorted) {
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
            } else targetFloor = "1";

            const fInfo = targetBuilding.floors[targetFloor];
            if (fInfo) pageId = typeof fInfo === 'object' ? fInfo.page : fInfo;
        }
    }

    if (targetBuilding && pageId) {
        displayMap(targetBuilding, targetFloor, pageId);
    } else {
        alert("검색 결과가 없습니다.");
    }
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
        updateZoom();
        centerImage();
    };

    img.onerror = () => {
        if (img.src.includes('.png')) img.src = img.src.replace('.png', '.PNG');
    };
}

// 이미지 중앙 정렬
function centerImage() {
    const wrapper = document.getElementById('imageWrapper');
    const img = document.getElementById('planImage');
    wrapper.scrollLeft = (img.scrollWidth - wrapper.clientWidth) / 2;
    wrapper.scrollTop = (img.scrollHeight - wrapper.clientHeight) / 2;
}

// --- 드래그 로직 ---
const wrapper = document.getElementById('imageWrapper');
const img = document.getElementById('planImage');

img.addEventListener('dragstart', (e) => e.preventDefault());

wrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX - wrapper.offsetLeft;
    startY = e.pageY - wrapper.offsetTop;
    scrollLeft = wrapper.scrollLeft;
    scrollTop = wrapper.scrollTop;
});

window.addEventListener('mouseup', () => { isDragging = false; });

wrapper.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - wrapper.offsetLeft;
    const y = e.pageY - wrapper.offsetTop;
    wrapper.scrollLeft = scrollLeft - (x - startX) * 1.5;
    wrapper.scrollTop = scrollTop - (y - startY) * 1.5;
});

function updateZoom() {
    img.style.transform = `scale(${currentZoom})`;
}

document.getElementById('zoomIn').onclick = () => { currentZoom += 0.3; updateZoom(); };
document.getElementById('zoomOut').onclick = () => { if (currentZoom > 0.4) { currentZoom -= 0.3; updateZoom(); } };
document.getElementById('resetZoom').onclick = () => { currentZoom = 1; updateZoom(); centerImage(); };

document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

loadData();
