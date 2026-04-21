let buildingData = null;
let currentZoom = 1;

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('data.json');
        buildingData = await response.json();
    } catch (e) {
        console.error("데이터 로딩 실패", e);
    }
}

// 개선된 검색 로직
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim().toUpperCase();
    if (!query) return;

    let targetBuilding = null;
    let targetFloor = null;

    // 1. 건물 식별 (이름이 긴 건물부터 우선 매칭하여 오차 방지)
    const sortedBuildings = [...buildingData.buildings].sort((a, b) => b.name.length - a.name.length);
    
    for (const b of sortedBuildings) {
        if (query.includes(b.name.toUpperCase()) || query.includes(b.code.toUpperCase())) {
            targetBuilding = b;
            break;
        }
    }

    // 건물명 없이 숫자만 친 경우 (예: "201") 기본값으로 '본관' 설정
    if (!targetBuilding && /^\d+/.test(query)) {
        targetBuilding = buildingData.buildings[0]; 
    }

    if (!targetBuilding) {
        showError("건물명을 찾을 수 없습니다. (예: 본관, 공학관...)");
        return;
    }

    // 2. 층/호실 식별 (정규표현식 보강)
    const roomMatch = query.match(/(\d{3,4})/); // 201, 1205 등 3~4자리 숫자
    const floorMatch = query.match(/(\d+)\s*(층|F)/i); // 2층, 3F 등
    const basementMatch = query.includes('지하') || query.includes('B');

    if (basementMatch) {
        targetFloor = "B1";
    } else if (floorMatch) {
        targetFloor = floorMatch[1];
    } else if (roomMatch) {
        const roomNum = roomMatch[1];
        // 3자리면 첫 번째 숫자(201->2), 4자리면 앞의 두 숫자(1201->12)를 층으로 인식
        targetFloor = roomNum.length === 3 ? roomNum[0] : roomNum.substring(0, 2);
    }

    // 층 정보가 없으면 기본 1층 표시
    if (!targetFloor) targetFloor = "1";

    // 3. 도면 페이지 매칭
    const pageId = targetBuilding.floors[targetFloor];

    if (pageId) {
        displayMap(targetBuilding, targetFloor, pageId);
    } else {
        showError(`${targetBuilding.name}에 ${targetFloor}층 정보가 없습니다.`);
    }
}

function displayMap(building, floor, pageId) {
    document.getElementById('placeholder').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    
    const viewer = document.getElementById('viewer');
    viewer.classList.remove('hidden');
    
    document.getElementById('resultInfo').classList.remove('hidden');
    document.getElementById('buildingTitle').innerText = building.name;
    document.getElementById('floorInfo').innerText = `${floor}층 (Page ${pageId})`;
    
    const img = document.getElementById('planImage');
    img.src = `assets/plans/page_${pageId}.png`; // 이미지 경로
    
    currentZoom = 1;
    updateZoom();
}

function showError(msg) {
    document.getElementById('placeholder').classList.add('hidden');
    document.getElementById('viewer').classList.add('hidden');
    document.getElementById('resultInfo').classList.add('hidden');
    
    const errorDiv = document.getElementById('error');
    errorDiv.classList.remove('hidden');
    document.getElementById('errorText').innerText = msg;
}

function updateZoom() {
    const img = document.getElementById('planImage');
    img.style.transform = `scale(${currentZoom})`;
}

document.getElementById('zoomIn').onclick = () => { currentZoom += 0.2; updateZoom(); };
document.getElementById('zoomOut').onclick = () => { if (currentZoom > 0.4) { currentZoom -= 0.2; updateZoom(); } };
document.getElementById('resetZoom').onclick = () => { currentZoom = 1; updateZoom(); };

function updateSuggestions() {
    const val = document.getElementById('searchInput').value;
    const suggContainer = document.getElementById('suggestions');
    if (val.length < 1) { suggContainer.style.display = 'none'; return; }
    const matches = buildingData.buildings.filter(b => b.name.includes(val) || b.code.includes(val.toUpperCase())).slice(0, 5);
    if (matches.length > 0) {
        suggContainer.innerHTML = matches.map(m => `<div class="suggestion-item">${m.name}</div>`).join('');
        suggContainer.style.display = 'block';
    } else { suggContainer.style.display = 'none'; }
}

document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };
document.getElementById('searchInput').oninput = updateSuggestions;
document.addEventListener('click', (e) => {
    if (e.target.className === 'suggestion-item') {
        document.getElementById('searchInput').value = e.target.innerText;
        document.getElementById('suggestions').style.display = 'none';
        performSearch();
    } else if (e.target.id !== 'searchInput') {
        document.getElementById('suggestions').style.display = 'none';
    }
});

loadData();
