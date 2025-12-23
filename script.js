let map, geojsonLayer, drugData;
const geojsonUrl = 'https://raw.githubusercontent.com/g0v/twgeojson/master/json/counties.json';

// 初始化地圖
map = L.map('map').setView([23.6, 121], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// 顏色比例尺 (依案件數由淺到深)
function getColor(d) {
    return d > 500 ? '#800026' :
           d > 200 ? '#BD0026' :
           d > 100 ? '#E31A1C' :
           d > 50  ? '#FC4E2A' :
           d > 20  ? '#FD8D3C' :
           d > 10  ? '#FEB24C' :
           d > 0   ? '#FED976' :
                     '#FFEDA0';
}

// 動態更新樣式
function style(feature) {
    const cityName = feature.properties.COUNTYNAME;
    const selectedDrug = document.getElementById('drug-select').value;
    const count = (drugData.data[cityName] && drugData.data[cityName][selectedDrug]) || 0;
    
    return {
        fillColor: getColor(count),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

// 載入數據
async function init() {
    // 1. 載入毒品統計數據
    const response = await fetch('drug_summary.json');
    drugData = await response.json();

    // 2. 填充下拉選單
    const select = document.getElementById('drug-select');
    drugData.kinds.forEach(kind => {
        const opt = document.createElement('option');
        opt.value = kind;
        opt.innerHTML = kind;
        select.appendChild(opt);
    });

    // 3. 載入台灣縣市邊界 GeoJSON
    const geoRes = await fetch(geojsonUrl);
    const geoData = await geoRes.json();

    geojsonLayer = L.geoJson(geoData, {
        style: style,
        onEachFeature: (feature, layer) => {
            layer.on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 5, color: '#666', dashArray: '' });
                    const cityName = feature.properties.COUNTYNAME;
                    const selectedDrug = document.getElementById('drug-select').value;
                    const count = (drugData.data[cityName] && drugData.data[cityName][selectedDrug]) || 0;
                    l.bindTooltip(`${cityName}<br>${selectedDrug}: ${count} 案`).openTooltip();
                },
                mouseout: (e) => {
                    geojsonLayer.resetStyle(e.target);
                }
            });
        }
    }).addTo(map);

    // 更新圖例
    updateLegend();
}

function updateLegend() {
    const grades = [0, 10, 20, 50, 100, 200, 500];
    const div = document.getElementById('legend-items');
    div.innerHTML = '';
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i class="legend-color" style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
}

// 監聽選單切換
document.getElementById('drug-select').addEventListener('change', () => {
    geojsonLayer.setStyle(style);
});

init();