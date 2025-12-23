const geoJsonUrl = "https://raw.githubusercontent.com/g0v/twgeojson/master/twCounty2010.geo.json";
const dataUrl = "drug_stats.json";

let drugData = {};
let geoData = null;

// 初始化 SVG
const svg = d3.select("#map");
const width = window.innerWidth;
const height = window.innerHeight;

const projection = d3.geoMercator()
    .center([121, 24])
    .scale(8000)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// 顏色比例尺 (紅色系，越多越深)
const colorScale = d3.scaleSequential(d3.interpolateReds);

async function init() {
    try {
        // 載入資料
        const [geoRes, statsRes] = await Promise.all([
            d3.json(geoJsonUrl),
            d3.json(dataUrl)
        ]);

        geoData = geoRes;
        drugData = statsRes.data;

        // 設定下拉選單
        const select = d3.select("#drug-select");
        statsRes.options.forEach(opt => {
            select.append("option").text(opt).attr("value", opt);
        });

        select.on("change", function() {
            updateMap(this.value);
        });

        // 首次繪製
        drawBaseMap();
        updateMap("全部");

    } catch (err) {
        console.error("載入失敗:", err);
    }
}

function drawBaseMap() {
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "county")
        .attr("d", path)
        .on("mousemove", function(event, d) {
            const cityName = d.properties.COUNTYNAME;
            const currentDrug = d3.select("#drug-select").property("value");
            const count = (drugData[cityName] && drugData[cityName][currentDrug]) || 0;

            d3.select("#tooltip")
                .classed("hidden", false)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
            
            d3.select("#city-name").text(cityName);
            d3.select("#case-count").text(count);
        })
        .on("mouseout", function() {
            d3.select("#tooltip").classed("hidden", true);
        });
}

function updateMap(drugName) {
    // 找出目前選取毒品的最高案件數以設定顏色範圍
    let maxVal = 0;
    Object.values(drugData).forEach(cityObj => {
        if (cityObj[drugName]) maxVal = Math.max(maxVal, cityObj[drugName]);
    });

    colorScale.domain([0, maxVal || 1]);

    svg.selectAll(".county")
        .transition()
        .duration(500)
        .attr("fill", d => {
            const cityName = d.properties.COUNTYNAME;
            const count = (drugData[cityName] && drugData[cityName][drugName]) || 0;
            return count === 0 ? "#eee" : colorScale(count);
        });

    updateLegend(maxVal);
}

function updateLegend(maxVal) {
    const legend = d3.select("#legend");
    legend.html("<strong>案件量圖例</strong><br>");
    
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const val = Math.round((maxVal / steps) * i);
        const color = colorScale(val);
        legend.append("div")
            .attr("class", "legend-item")
            .html(`<div class="legend-color" style="background:${color}"></div> <span>${val}</span>`);
    }
}

window.addEventListener("resize", () => {
    // 簡單的重繪邏輯或更新 viewBox
    location.reload(); 
});

init();