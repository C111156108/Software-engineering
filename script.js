// 1. 初始化地圖
const map = L.map('map').setView([23.6, 121.0], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allData = [];
let geojsonLayer = null;
let geoJSONCache = null;
let drugSet = new Set();

// 顏色分級
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

    // A. 載入 CSV 檔案 (確保不使用 fetch.json() 避免錯誤)
    for (let i = 1; i <= fileCount; i++) {
        const fileName = `drug_data${i}.csv?t=${new Date().getTime()}`;
        if (statusText) statusText.innerText = `正在讀取資料檔: ${i}/${fileCount}`;

        await new Promise(resolve => {
            Papa.parse(fileName, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        allData = allData.concat(results.data);
                    }
                    resolve();
                },
                error: (err) => {
                    console.warn(`跳過檔案 drug_data${i}.csv，可能不存在或路徑錯誤。`);
                    resolve(); 
                }
            });
        });
    }

    // 建立毒品種類下拉選單
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

    // B. 載入 GeoJSON (加入嚴格檢查防止解析 HTML 錯誤頁面)
    if (statusText) statusText.innerText = "正在繪製地圖圖層...";
    try {
        const geoRes = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/twtown20140529.json');
        
        // 如果回應不正常（如 404），不要執行 .json()
        if (!geoRes.ok) throw new Error('地圖邊界檔案下載失敗');

        const contentType = geoRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error('收到的內容不是 JSON 格式');
        }

        geoJSONCache = await geoRes.json();
        renderMap();
        if (statusText) statusText.innerText = `完成！共載入 ${allData.length} 筆資料`;
    } catch (e) {
        console.error("地圖載入錯誤:", e.message);
        if (statusText) statusText.innerText = "地圖圖層載入失敗，請檢查網路。";
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