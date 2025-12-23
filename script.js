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

// 3. 樣式函式
function style(feature) {
    const cityName = feature.properties.COUNTYNAME || feature.properties.name;
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugStats[cityName] && drugStats[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 1.5,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

// 4. 初始化
async function init() {
    const statusEl = document.getElementById('status');
    
    // A. 載入 16 個 CSV
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

    // B. 載入地圖 (改用更穩定的連結)
    try {
        const geoUrls = [
            'https://raw.githubusercontent.com/chaoyuezeng/Taiwan_GeoJSON/master/Taiwan_County.json',
            'https://cdn.jsdelivr.net/gh/g0v/twgeojson@master/json/counties.json' // 備用
        ];
        
        let geoRes, geoData;
        for (let url of geoUrls) {
            geoRes = await fetch(url);
            if (geoRes.ok) {
                geoData = await geoRes.json();
                break;
            }
        }

        if (!geoData) throw new Error("無法載入地圖邊界檔案");

        geojsonLayer = L.geoJson(geoData, {
            style: style,
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({ weight: 3, color: '#333' });
                        const cityName = feature.properties.COUNTYNAME || feature.properties.name;
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
        statusEl.innerText = "地圖載入失敗，請檢查網路連接";
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
        // 關鍵修正：跳過雙標頭中的第二行 (中文說明行)
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
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
}

// 監聽選單切換，增加安全性檢查
document.getElementById('drug-select').addEventListener('change', () => {
    if (geojsonLayer) {
        geojsonLayer.setStyle(style);
    } else {
        console.warn("地圖圖層尚未準備好");
    }
});

init();