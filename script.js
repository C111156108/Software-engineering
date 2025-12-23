let map, geojsonLayer;
let drugStats = {}; 
let allDrugKinds = new Set();

// 1. 初始化地圖
map = L.map('map').setView([23.6, 121], 7);
L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// 2. 定義案件量顏色 (越多越深)
function getColor(d) {
    return d > 300 ? '#800026' :
           d > 100 ? '#BD0026' :
           d > 50  ? '#E31A1C' :
           d > 20  ? '#FC4E2A' :
           d > 10  ? '#FD8D3C' :
           d > 5   ? '#FEB24C' :
           d > 0   ? '#FED976' : '#FFEDA0';
}

// 3. 地圖樣式設定
function style(feature) {
    const cityName = feature.properties.COUNTYNAME;
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugStats[cityName] && drugStats[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 1.5,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.8
    };
}

// 4. 解析數據邏輯
async function init() {
    const statusEl = document.getElementById('status');
    
    // 批次讀取 drug_data1.csv 到 drug_data16.csv
    const filePromises = [];
    for (let i = 1; i <= 16; i++) {
        filePromises.push(fetchCSV(`drug_data${i}.csv`));
    }

    await Promise.all(filePromises);
    
    // 生成下拉選單
    const select = document.getElementById('drug-select');
    Array.from(allDrugKinds).sort().forEach(kind => {
        if(kind && kind !== "毒品品項") { // 過濾掉標頭列
            const opt = document.createElement('option');
            opt.value = kind;
            opt.innerHTML = kind;
            select.appendChild(opt);
        }
    });

    // 載入台灣地圖邊界 (GeoJSON)
    const geoRes = await fetch('https://raw.githubusercontent.com/g0v/twgeojson/master/json/counties.json');
    const geoData = await geoRes.json();

    geojsonLayer = L.geoJson(geoData, {
        style: style,
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 3, color: '#333' });
                    const cityName = feature.properties.COUNTYNAME;
                    const selected = document.getElementById('drug-select').value;
                    const count = (drugStats[cityName] && drugStats[cityName][selected]) || 0;
                    l.bindTooltip(`<b>${cityName}</b><br>${selected}: ${count} 案`).openTooltip();
                },
                mouseout: (e) => { geojsonLayer.resetStyle(e.target); }
            });
        }
    }).addTo(map);

    updateLegend();
    statusEl.innerText = "數據載入完成";
    setTimeout(() => statusEl.style.opacity = '0', 2000);
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
            error: function() { resolve(); } // 忽略找不到檔案的錯誤
        });
    });
}

function processData(data) {
    data.forEach(row => {
        // 抓取 oc_addr (發生地點) 與 kind (毒品品項)
        if (!row.oc_addr || row.oc_addr === "發生地點") return;

        const city = row.oc_addr.substring(0, 3); // 取得 "臺北市" 等前三個字
        const kind = row.kind ? row.kind.trim() : "未知";

        if (!drugStats[city]) drugStats[city] = { "全部": 0 };
        if (!drugStats[city][kind]) drugStats[city][kind] = 0;

        drugStats[city][kind]++;
        drugStats[city]["全部"]++;
        allDrugKinds.add(kind);
    });
}

function updateLegend() {
    const grades = [0, 5, 10, 20, 50, 100, 300];
    const legendDiv = document.getElementById('legend');
    legendDiv.innerHTML = "";
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