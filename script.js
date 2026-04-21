let buildingData = null;
let currentZoom = 1;

// Load Data
async function loadData() {
    try {
        const response = await fetch('data.json');
        buildingData = await response.json();
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

// Search Logic
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    let targetBuilding = null;
    let targetFloor = null;

    // 1. Identify Building
    for (const b of buildingData.buildings) {
        if (query.includes(b.name) || query.includes(b.code)) {
            targetBuilding = b;
            break;
        }
    }

    // Default to 본관 if no building mentioned but room/floor is
    if (!targetBuilding && /\d+/.test(query)) {
        targetBuilding = buildingData.buildings[0]; // 본관
    }

    if (!targetBuilding) {
        showError("건물명을 찾을 수 없습니다. (예: 본관, 공학관...)");
        return;
    }

    // 2. Identify Floor/Room
    const roomMatch = query.match(/(\d+)호?(\-\d+)?/);
    const floorMatch = query.match(/(\d+)\s*층/);
    const basementMatch = query.includes('지하') || query.toUpperCase().includes('B');

    if (floorMatch) {
        targetFloor = floorMatch[1];
    } else if (roomMatch) {
        const roomNum = roomMatch[1];
        // Standard room mapping: 1xx -> 1F, 2xx -> 2F, 3xx -> 3F etc.
        if (roomNum.length >= 3) {
            targetFloor = roomNum.substring(0, roomNum.length - 2);
        } else {
            targetFloor = "1"; // Default for small room numbers
        }
    } else if (basementMatch) {
        targetFloor = "B1";
    }

    // 3. Fallback to 1st floor if nothing found
    if (!targetFloor) targetFloor = "1";

    // 4. Resolve Page
    const pageId = targetBuilding.floors[targetFloor];

    if (pageId) {
        displayMap(targetBuilding, targetFloor, pageId);
    } else {
        showError(`${targetBuilding.name}에 ${targetFloor}층 정보가 전산에 없습니다.`);
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
    // Using hypothetical path - user needs to place their images here
    img.src = `assets/plans/page_${pageId}.png`;
    
    // Reset zoom
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

// Zoom Logic
function updateZoom() {
    const img = document.getElementById('planImage');
    img.style.transform = `scale(${currentZoom})`;
}

document.getElementById('zoomIn').onclick = () => {
    currentZoom += 0.2;
    updateZoom();
};

document.getElementById('zoomOut').onclick = () => {
    if (currentZoom > 0.4) {
        currentZoom -= 0.2;
        updateZoom();
    }
};

document.getElementById('resetZoom').onclick = () => {
    currentZoom = 1;
    updateZoom();
};

// Suggestions Logic
function updateSuggestions() {
    const val = document.getElementById('searchInput').value;
    const suggContainer = document.getElementById('suggestions');
    
    if (val.length < 1) {
        suggContainer.style.display = 'none';
        return;
    }

    const matches = buildingData.buildings.filter(b => 
        b.name.includes(val) || b.code.includes(val.toUpperCase())
    ).slice(0, 5);

    if (matches.length > 0) {
        suggContainer.innerHTML = matches.map(m => 
            `<div class="suggestion-item">${m.name}</div>`
        ).join('');
        suggContainer.style.display = 'block';
    } else {
        suggContainer.style.display = 'none';
    }
}

// Event Listeners
document.getElementById('searchBtn').onclick = performSearch;
document.getElementById('searchInput').onkeypress = (e) => {
    if (e.key === 'Enter') performSearch();
};
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

// Initialization
loadData();
