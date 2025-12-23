// 1. 初始化地圖
const map = L.map('map').setView([23.6, 121.0], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allData = [];
let geojsonLayer = null;
let geoJSONCache = null;
let drugSet = new Set();

// 顏色分級函數
function getColor(d) {
    return d > 100 ? '#800026' :
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 5   ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : '#FFEDA0';
}

function fixText(str) {
    if (!str) return "";
    return str.replace(/台/g, '臺').trim();
}

async function init() {
    const statusText = document.getElementById('status-text');
    const fileCount = 16; 

    // A. 載入 CSV 檔案 (使用 PapaParse)
    for (let i = 1; i <= fileCount; i++) {
        const fileName = `drug_data${i}.csv?t=${new Date().getTime()}`;
        if (statusText) statusText.innerText = `正在載入數據: ${i}/${fileCount}`;

        await new Promise(resolve => {
            Papa.parse(fileName, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data) {
                        allData = allData.concat(results.data);
                    }
                    resolve();
                },
                error: (err) => {
                    console.warn(`${fileName} 載入跳過`, err);
                    resolve(); 
                }
            });
        });
    }

    // 更新毒品選單
    allData.forEach(row => {
        const kind = row['kind'] || row['毒品品項'];
        if (kind) drugSet.add(kind.trim());
    });

    const select = document.getElementById('drug-select');
    if (select) {
        Array.from(drugSet).sort().forEach(kind => {
            const opt = document.createElement('option');
            opt.value = kind;
            opt.innerText = kind;
            select.appendChild(opt);
        });
        select.addEventListener('change', renderMap);
    }

    // B. 載入 GeoJSON (這是最容易報 JSON 錯誤的地方)
    if (statusText) statusText.innerText = "正在繪製地圖...";
    try {
        const geoRes = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/twtown20140529.json');
        
        // 檢查回應是否成功，避免解析 404 HTML 導致 JSON 錯誤
        if (!geoRes.ok) throw new Error('無法取得地圖邊界檔案');
        
        geoJSONCache = await geoRes.json();
        renderMap();
        if (statusText) statusText.innerText = "完成";
    } catch (e) {
        console.error("JSON 解析錯誤:", e);
        if (statusText) statusText.innerText = "地圖載入失敗，請重新整理頁面。";
    }
}

function renderMap() {
    const selectedDrug = document.getElementById('drug-select').value;
    const counts = {};

    allData.forEach(item => {
        const itemKind = item['kind'] || item['毒品品項'];
        if (selectedDrug === "全部" || itemKind === selectedDrug) {
            const addr = fixText(item['oc_addr'] || item['發生地點']);
            const region = addr.substring(0, 6); 
            if (region.length >= 5) {
                counts[region] = (counts[region] || 0) + 1;
            }
        }
    });

    if (geojsonLayer) map.removeLayer(geojsonLayer);

    geojsonLayer = L.geoJson(geoJSONCache, {
        style: (feature) => {
            const fullName = fixText(feature.properties.C_Name + feature.properties.T_Name);
            const c = counts[fullName] || 0;
            return { fillColor: getColor(c), weight: 1, color: 'white', fillOpacity: 0.7 };
        },
        onEachFeature: (feature, layer) => {
            const fullName = feature.properties.C_Name + feature.properties.T_Name;
            const c = counts[fixText(fullName)] || 0;
            layer.bindPopup(`<b>${fullName}</b><br>案件數: ${c} 筆`);
        }
    }).addTo(map);
}

init();