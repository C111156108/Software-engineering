let map, geojsonLayer;
let drugStats = {}; // 格式: { "臺北市": { "安非他命": 10, "全部": 100 }, ... }
let allDrugKinds = new Set();

// 1. 初始化地圖
map = L.map('map').setView([23.6, 121], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 2. 顏色分級函數
function getColor(d) {
    return d > 500 ? '#800026' :
           d > 200 ? '#BD0026' :
           d > 100 ? '#E31A1C' :
           d > 50  ? '#FC4E2A' :
           d > 20  ? '#FD8D3C' :
           d > 10  ? '#FEB24C' :
           d > 0   ? '#FED976' : '#FFEDA0';
}

// 3. 處理樣式
function style(feature) {
    const cityName = feature.properties.COUNTYNAME;
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugStats[cityName] && drugStats[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// 4. 主要執行邏輯
async function init() {
    const statusEl = document.getElementById('status');
    
    // A. 載入 16 個 CSV (這裡使用迴圈嘗試抓取)
    const filePromises = [];
    for (let i = 1; i <= 16; i++) {
        filePromises.push(fetchCSV(`drug_data${i}.csv`));
    }

    statusEl.innerText = "正在解析數據...";
    await Promise.all(filePromises);
    
    // B. 更新選單
    const select = document.getElementById('drug-select');
    Array.from(allDrugKinds).sort().forEach(kind => {
        const opt = document.createElement('option');
        opt.value = kind;
        opt.innerHTML = kind;
        select.appendChild(opt);
    });

    // C. 載入地圖邊界 (GeoJSON)
    const geoRes = await fetch('https://raw.githubusercontent.com/g0v/twgeojson/master/json/counties.json');
    const geoData = await geoRes.json();

    statusEl.innerText = "地圖繪製中...";
    
    geojsonLayer = L.geoJson(geoData, {
        style: style,
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 5, color: '#666', dashArray: '' });
                    const cityName = feature.properties.COUNTYNAME;
                    const selected = document.getElementById('drug-select').value;
                    const count = (drugStats[cityName] && drugStats[cityName][selected]) || 0;
                    l.bindTooltip(`${cityName}<br>${selected}: ${count} 案`).openTooltip();
                },
                mouseout: (e) => { geojsonLayer.resetStyle(e.target); }
            });
        }
    }).addTo(map);

    statusEl.innerText = "完成";
    setTimeout(() => statusEl.style.display = 'none', 3000);
}

// 解析單個 CSV 檔案
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
            error: function() {
                console.log(`跳過不存在或錯誤的檔案: ${url}`);
                resolve();
            }
        });
    });
}

// 彙整數據到 drugStats
function processData(data) {
    data.forEach(row => {
        // 跳過 CSV 的第二行中文欄位描述 (如果 PapaParse 沒濾掉的話)
        if (row['案類'] === '案類' || !row['發生地點']) return;

        const city = row['發生地點'].substring(0, 3);
        const kind = row['毒品品項'] ? row['毒品品項'].trim() : "未知";

        if (!drugStats[city]) drugStats[city] = { "全部": 0 };
        if (!drugStats[city][kind]) drugStats[city][kind] = 0;

        drugStats[city][kind]++;
        drugStats[city]["全部"]++;
        allDrugKinds.add(kind);
    });
}

// 監聽選單切換
document.getElementById('drug-select').addEventListener('change', () => {
    if (geojsonLayer) geojsonLayer.setStyle(style);
});

init();