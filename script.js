// 1. 初始化地圖
const map = L.map('map').setView([23.6, 121.0], 7);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allData = [];
let geojsonLayer = null;
let geoJSONCache = null;
let drugSet = new Set();

// 2. 設定顏色分級 (案件越多，顏色越深紅)
function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 5   ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : '#FFEDA0';
}

// 修正台灣縣市異體字 (台 vs 臺)
function fixText(str) {
    return str ? str.replace(/台/g, '臺') : "";
}

async function init() {
    const statusText = document.getElementById('status-text');
    const progressFill = document.getElementById('progress-fill');
    const fileCount = 16;

    // 載入 16 個 CSV 檔案
    for (let i = 1; i <= fileCount; i++) {
        const fileName = `drug_data${i}.csv`;
        statusText.innerText = `讀取資料檔: ${fileName}`;
        progressFill.style.width = `${(i / fileCount) * 100}%`;

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
                    console.error(`檔案 ${fileName} 載入失敗`, err);
                    resolve();
                }
            });
        });
    }

    // 提取毒品種類選單
    allData.forEach(row => {
        const kind = row['kind'] || row['毒品品項'];
        if (kind) drugSet.add(kind.trim());
    });

    const select = document.getElementById('drug-select');
    Array.from(drugSet).sort().forEach(kind => {
        const opt = document.createElement('option');
        opt.value = kind;
        opt.innerText = kind;
        select.appendChild(opt);
    });

    select.addEventListener('change', renderMap);

    // 載入台灣行政區邊界資料 (GeoJSON)
    statusText.innerText = "正在載入地圖圖層...";
    const geoRes = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/twtown20140529.json');
    geoJSONCache = await geoRes.json();

    statusText.innerText = "資料載入完成！";
    renderMap();
}

function renderMap() {
    const selectedDrug = document.getElementById('drug-select').value;
    const counts = {};
    let totalCount = 0;

    // 統計各區數量
    allData.forEach(item => {
        const itemKind = item['kind'] || item['毒品品項'];
        if (selectedDrug === "全部" || itemKind === selectedDrug) {
            const addr = fixText(item['oc_addr'] || item['發生地點']);
            const region = addr.substring(0, 6); // 取出 "臺北市萬華區"
            if (region.length >= 5) {
                counts[region] = (counts[region] || 0) + 1;
                totalCount++;
            }
        }
    });

    document.getElementById('summary').innerText = `目前篩選案件總數: ${totalCount} 筆`;

    if (geojsonLayer) map.removeLayer(geojsonLayer);

    geojsonLayer = L.geoJson(geoJSONCache, {
        style: (feature) => {
            const name = fixText(feature.properties.C_Name + feature.properties.T_Name);
            const c = counts[name] || 0;
            return {
                fillColor: getColor(c),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: (feature, layer) => {
            const name = fixText(feature.properties.C_Name + feature.properties.T_Name);
            const c = counts[name] || 0;
            layer.bindPopup(`
                <div class="popup-title">${name}</div>
                案件數量: <b>${c}</b> 筆<br>
                目前篩選: ${selectedDrug}
            `);
        }
    }).addTo(map);
}

// 執行初始化
init();