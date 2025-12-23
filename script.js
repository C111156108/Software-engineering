let map, geojsonLayer;
let drugStats = {}; 
let allDrugKinds = new Set();

// 1. 初始化地圖
map = L.map('map').setView([23.6, 121], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// 2. 顏色分級
function getColor(d) {
    return d > 300 ? '#800026' :
           d > 100 ? '#BD0026' :
           d > 50  ? '#E31A1C' :
           d > 20  ? '#FC4E2A' :
           d > 10  ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : '#FFEDA0';
}

function style(feature) {
    const cityName = feature.properties.COUNTYNAME || feature.properties.name || "";
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugStats[cityName] && drugStats[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.7
    };
}

// 3. 主要邏輯
async function init() {
    const statusEl = document.getElementById('status');
    
    // A. 載入 CSV (1-16)
    const filePromises = [];
    for (let i = 1; i <= 16; i++) {
        filePromises.push(fetchCSV(`drug_data${i}.csv`));
    }
    await Promise.all(filePromises);
    
    // 更新下拉選單
    const select = document.getElementById('drug-select');
    Array.from(allDrugKinds).sort().forEach(kind => {
        if (kind) {
            const opt = document.createElement('option');
            opt.value = kind;
            opt.textContent = kind;
            select.appendChild(opt);
        }
    });

    // B. 載入並轉換 TopoJSON
    try {
        const response = await fetch('taiwan.json');
        if (!response.ok) throw new Error("找不到檔案");
        const topoData = await response.json();

        // 【核心修正】將 TopoJSON 轉換為 GeoJSON，指定讀取 layer1
        const geoData = topojson.feature(topoData, topoData.objects.layer1);

        geojsonLayer = L.geoJson(geoData, {
            style: style,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({ weight: 3, color: '#333' });
                        const cityName = feature.properties.COUNTYNAME || feature.properties.name || "";
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
        console.error(err);
        statusEl.innerText = "載入失敗: " + err.message;
    }
}

function fetchCSV(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true, header: true, skipEmptyLines: true,
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
        // 跳過標頭與空行
        if (!row.oc_addr || row.oc_addr === "發生地點" || row.no === "編號") return;

        // 【重要】統一將「臺」轉為「台」，以匹配你的 taiwan.json 屬性
        const city = row.oc_addr.substring(0, 3).replace('臺', '台');
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
    const div = document.getElementById('legend-items');
    div.innerHTML = "";
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i class="legend-i" style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
}

document.getElementById('drug-select').addEventListener('change', () => {
    if (geojsonLayer) geojsonLayer.setStyle(style);
});

init();