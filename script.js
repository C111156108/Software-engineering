let map, geojsonLayer;
let drugStats = {}; 
let allDrugKinds = new Set();

// 1. 初始化地圖
map = L.map('map').setView([23.6, 121], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// 2. 顏色級別
function getColor(d) {
    return d > 300 ? '#800026' :
           d > 100 ? '#BD0026' :
           d > 50  ? '#E31A1C' :
           d > 20  ? '#FC4E2A' :
           d > 10  ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : '#FFEDA0';
}

function style(feature) {
    // 兼容不同的 GeoJSON 欄位名 (COUNTYNAME, name, C_Name)
    const props = feature.properties;
    const cityName = props.COUNTYNAME || props.name || props.C_Name || "";
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugStats[cityName] && drugStats[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.7
    };
}

// 3. 主要執行邏輯
async function init() {
    const statusEl = document.getElementById('status');
    
    // A. 載入 CSV 數據
    const filePromises = [];
    for (let i = 1; i <= 16; i++) {
        filePromises.push(fetchCSV(`drug_data${i}.csv`));
    }
    await Promise.all(filePromises);
    
    // 生成選單
    const select = document.getElementById('drug-select');
    Array.from(allDrugKinds).sort().forEach(kind => {
        if (kind) {
            const opt = document.createElement('option');
            opt.value = kind;
            opt.textContent = kind;
            select.appendChild(opt);
        }
    });

    // B. 載入地圖 (讀取你上傳到 repo 的 taiwan.json)
    try {
        const response = await fetch('taiwan.json');
        
        // 檢查回應是否正常 (防止 404 HTML)
        if (!response.ok) throw new Error(`找不到 taiwan.json (HTTP ${response.status})`);
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("收到的內容不是 JSON:", await response.text());
            throw new Error("檔案格式錯誤，請確認 taiwan.json 內容是否正確");
        }

        const geoData = await response.json();

        geojsonLayer = L.geoJson(geoData, {
            style: style,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({ weight: 3, color: '#333' });
                        const props = feature.properties;
                        const cityName = props.COUNTYNAME || props.name || props.C_Name || "未知";
                        const selected = document.getElementById('drug-select').value;
                        const count = (drugStats[cityName] && drugStats[cityName][selected]) || 0;
                        l.bindTooltip(`<b>${cityName}</b><br>${selected}: ${count} 案`).openTooltip();
                    },
                    mouseout: (e) => {
                        if (geojsonLayer) geojsonLayer.resetStyle(e.target);
                    }
                });
            }
        }).addTo(map);

        statusEl.style.display = 'none';
        updateLegend();

    } catch (err) {
        console.error("地圖載入失敗:", err.message);
        statusEl.innerText = `地圖載入失敗: ${err.message}`;
    }
}

function fetchCSV(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processData(results.data);
                resolve();
            },
            error: function() { resolve(); } 
        });
    });
}

function processData(data) {
    data.forEach(row => {
        // 跳過 CSV 標頭行
        if (!row.oc_addr || row.oc_addr === "發生地點" || row.no === "編號") return;

        const city = row.oc_addr.substring(0, 3);
        const kind = row.kind ? row.kind.trim() : "未知";

        if (!drugStats[city]) drugStats[city] = { "全部": 0 };
        if (!drugStats[city][kind]) drugStats[city][kind] = 0;

        drugStats[city][kind]++;
        drugStats[city]["全部"]++;
        allDrugKinds.add(kind);
    });
}

function updateLegend() {
    const grades = [0, 10, 20, 50, 100, 300];
    const legendDiv = document.getElementById('legend');
    legendDiv.innerHTML = "<strong>案件量範圍</strong><br>";
    for (let i = 0; i < grades.length; i++) {
        legendDiv.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '; width:18px; height:18px; display:inline-block; margin-right:5px; vertical-align:middle;"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
}

document.getElementById('drug-select').addEventListener('change', () => {
    if (geojsonLayer) geojsonLayer.setStyle(style);
});

init();