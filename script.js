// 1. 初始化地圖，中心點設在台灣
const map = L.map('map').setView([23.6, 121.0], 7);

// 使用灰階底圖，讓案件分布的顏色更明顯
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allData = [];
let geojsonLayer = null;
let geoJSONCache = null;
let drugSet = new Set();

// 2. 顏色分級設定（案件數越多，顏色越深）
function getColor(d) {
    return d > 100 ? '#800026' : // 極多
           d > 50  ? '#BD0026' :
           d > 20  ? '#E31A1C' :
           d > 10  ? '#FC4E2A' :
           d > 5   ? '#FD8D3C' :
           d > 0   ? '#FEB24C' : // 少數
                     '#FFEDA0';  // 無案件
}

// 修正台灣縣市異體字 (確保 台/臺 統一，避免比對不到地圖邊界)
function fixText(str) {
    if (!str) return "";
    return str.replace(/台/g, '臺').trim();
}

// 3. 初始化與讀取資料
async function init() {
    const statusText = document.getElementById('status-text');
    const progressFill = document.getElementById('progress-fill');
    const fileCount = 16; // 讀取 drug_data1 到 drug_data16

    for (let i = 1; i <= fileCount; i++) {
        // 加入隨機參數 ?t= 防止 GitHub 快取舊檔案
        const fileName = `drug_data${i}.csv?t=${new Date().getTime()}`;
        statusText.innerText = `正在下載: drug_data${i}.csv`;
        
        // 更新進度條
        if (progressFill) {
            progressFill.style.width = `${(i / fileCount) * 100}%`;
        }

        await new Promise(resolve => {
            Papa.parse(fileName, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        console.log(`成功載入 ${fileName}, 筆數: ${results.data.length}`);
                        allData = allData.concat(results.data);
                    }
                    resolve();
                },
                error: (err) => {
                    console.error(`${fileName} 載入失敗，原因：`, err);
                    // 即使單一檔案失敗也繼續下一個，避免畫面卡死
                    resolve();
                }
            });
        });
    }

    if (allData.length === 0) {
        statusText.innerText = "讀取失敗！請檢查 CSV 檔名是否正確。";
        return;
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

    // 載入台灣行政區邊界 (GeoJSON)
    statusText.innerText = "正在繪製地圖圖層...";
    try {
        const geoRes = await fetch('https://raw.githubusercontent.com/g0v/tw-town-geojson/master/twtown20140529.json');
        geoJSONCache = await geoRes.json();
        statusText.innerText = `載入完成！共計 ${allData.length} 筆案件`;
        renderMap();
    } catch (e) {
        console.error("GeoJSON 載入失敗", e);
        statusText.innerText = "地圖圖層載入失敗，請檢查網路。";
    }
}

// 4. 繪製地圖邏輯
function renderMap() {
    const selectedDrug = document.getElementById('drug-select').value;
    const counts = {};
    let totalCount = 0;

    // 統計各行政區數量
    allData.forEach(item => {
        const itemKind = item['kind'] || item['毒品品項'];
        if (selectedDrug === "全部" || itemKind === selectedDrug) {
            const addr = fixText(item['oc_addr'] || item['發生地點']);
            // 抓取前 6 碼，例如 "臺北市萬華區"
            const region = addr.substring(0, 6); 
            if (region.length >= 5) {
                counts[region] = (counts[region] || 0) + 1;
                totalCount++;
            }
        }
    });

    const summary = document.getElementById('summary');
    if (summary) {
        summary.innerText = `目前選取案件總數: ${totalCount} 筆`;
    }

    // 清除舊圖層
    if (geojsonLayer) map.removeLayer(geojsonLayer);

    // 建立新圖層
    geojsonLayer = L.geoJson(geoJSONCache, {
        style: (feature) => {
            // 拼接 GeoJSON 內的縣市與鄉鎮名稱
            const cityName = fixText(feature.properties.C_Name);
            const townName = fixText(feature.properties.T_Name);
            const fullName = cityName + townName;
            
            const c = counts[fullName] || 0;
            return {
                fillColor: getColor(c),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: (feature, layer) => {
            const cityName = feature.properties.C_Name;
            const townName = feature.properties.T_Name;
            const fullName = cityName + townName;
            const c = counts[fixText(fullName)] || 0;
            
            layer.bindPopup(`
                <div style="font-size:14px; font-weight:bold; color:#c0392b;">${fullName}</div>
                案件數量: <b>${c}</b> 筆<br>
                毒品種類: ${selectedDrug}
            `);
        }
    }).addTo(map);
}

// 啟動程式
init();