const map = L.map('map').setView([23.6, 121.0], 7);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allData = [];
let geojsonLayer = null;
let drugSet = new Set();
let geoJSONCache = null;

function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 5   ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : '#FFEDA0';
}

// 標準化縣市名稱
function normalizeAddr(addr) {
    if (!addr) return "";
    return addr.replace(/台/g, '臺');
}

async function init() {
    const status = document.getElementById('status');
    const fileCount = 16;
    
    // 1. 載入 CSV (確保 CSV 與 index.html 在同一個 Repo 資料夾)
    for (let i = 1; i <= fileCount; i++) {
        const fileName = `drug_data${i}.csv`;
        status.innerText = `讀取資料中 (${i}/${fileCount})...`;
        
        await new Promise(resolve => {
            Papa.parse(fileName, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    allData = allData.concat(results.data);
                    resolve();
                },
                error: (err) => {
                    console.log(`跳過或找不到: ${fileName}`);
                    resolve();
                }
            });
        });
    }

    // 2. 處理下拉選單
    allData.forEach(row => { if(row.kind) drugSet.add(row.kind.trim()); });
    const select = document.getElementById('drug-select');
    Array.from(drugSet).sort().forEach(kind => {
        let opt = document.createElement('option');
        opt.value = kind; opt.innerHTML = kind;
        select.appendChild(opt);
    });
    select.addEventListener('change', renderMap);

    // 3. 載入地圖
    status.innerText = "載入地圖邊界...";
    const res = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/twtown20140529.json');
    geoJSONCache = await res.json();
    
    status.innerText = "完成！可開始篩選";
    renderMap();
}

function renderMap() {
    const selectedDrug = document.getElementById('drug-select').value;
    const counts = {};

    allData.forEach(item => {
        if (selectedDrug === "全部" || item.kind === selectedDrug) {
            const addr = normalizeAddr(item.oc_addr || "");
            const region = addr.substring(0, 6); 
            if(region) counts[region] = (counts[region] || 0) + 1;
        }
    });

    if (geojsonLayer) map.removeLayer(geojsonLayer);

    geojsonLayer = L.geoJson(geoJSONCache, {
        style: (feature) => {
            const name = normalizeAddr(feature.properties.C_Name + feature.properties.T_Name);
            const c = counts[name] || 0;
            return { fillColor: getColor(c), weight: 1, color: 'white', fillOpacity: 0.7 };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.C_Name + feature.properties.T_Name;
            layer.bindPopup(`<b>${name}</b><br>案件數：${counts[name] || 0} 筆`);
        }
    }).addTo(map);
}

init();