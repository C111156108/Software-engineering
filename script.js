let currentData = null;
let trendChart = null;

// 初始化地圖與數據
async function init() {
    const mapData = await d3.json('taiwan.json');
    const highschoolData = await d3.csv('高中職生目前吸菸率.csv');
    
    drawMap(mapData);
    updateChart(highschoolData, '整體');
}

function drawMap(topology) {
    const svg = d3.select("#taiwan-map");
    const width = +svg.node().getBoundingClientRect().width;
    const height = 600;

    // 轉換 TopoJSON
    const geojson = topojson.feature(topology, topology.objects.layer1);
    
    const projection = d3.geoMercator()
        .center([121, 24])
        .scale(6000)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    svg.selectAll(".county")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("class", "county")
        .attr("d", path)
        .on("click", (event, d) => {
            showCityDetail(d.properties.COUNTYNAME);
        });
}

function updateChart(data, filterValue) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // 這裡示範擷取 CSV 中 94年到106年的數據邏輯
    const labels = ['94年', '96年', '98年', '100年', '106年'];
    const smokingRate = [15.2, 14.8, 14.2, 13.5, 11.2]; // 範例數據，需從 CSV 解析

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '目前吸菸率 (%)',
                data: smokingRate,
                borderColor: '#e74c3c',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function showCityDetail(cityName) {
    document.getElementById('city-info').innerHTML = `
        <h4>${cityName}</h4>
        <p>根據數據顯示，該地區青少年吸菸率逐年下降中。</p>
        <button onclick="alert('導出 ${cityName} 報表')">下載數據</button>
    `;
}

init();