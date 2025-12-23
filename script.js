// 設定地圖大小
const width = 700;
const height = 750;

const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const tooltip = d3.select("#tooltip");

// 1. 設定地圖投影 (針對台灣優化)
const projection = d3.geoMercator()
    .center([121, 24.3]) 
    .scale(10000)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// 2. 載入資料
Promise.all([
    d3.json("taiwan.json"),
    d3.csv("15歲以上吸菸者每天平均吸菸支數.csv")
]).then(([topoData, csvData]) => {
    
    // 預處理 CSV 資料：清洗縣市名稱並轉為數字
    csvData.forEach(d => {
        d.countyName = d.分析項目.replace("現住地縣市別=", "");
        d.overall = +d["整體吸菸者平均吸菸支數之平均值(支)"];
        d.male = +d["男性吸菸者平均吸菸支數之平均值(支)"];
        d.female = +d["女性吸菸者平均吸菸支數之平均值(支)"];
    });

    // 初始化年份選單 (只抓取有縣市數據的年份)
    const years = Array.from(new Set(csvData.filter(d => d.分析項目.includes("=")).map(d => d.年度)));
    const yearSelect = d3.select("#yearSelect");
    years.forEach(y => yearSelect.append("option").text(y).attr("value", y));

    // 轉換 TopoJSON 為 GeoJSON (假設物件名稱為 layer1)
    const geojson = topojson.feature(topoData, topoData.objects.layer1);

    // 繪製函數
    function draw() {
        const selectedYear = d3.select("#yearSelect").property("value");
        const selectedGender = d3.select("#genderSelect").property("value");

        // 過濾當前年份數據
        const currentData = csvData.filter(d => d.年度 === selectedYear);
        const dataMap = new Map(currentData.map(d => [d.countyName, d[selectedGender]]));

        // 設定顏色比例尺 (紅色系)
        const maxVal = d3.max(csvData.filter(d => d.分析項目.includes("=")), d => d[selectedGender]);
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, maxVal]);

        // 綁定數據
        const paths = svg.selectAll(".county").data(geojson.features);

        paths.enter()
            .append("path")
            .attr("class", "county")
            .merge(paths)
            .attr("d", path)
            .attr("fill", d => {
                const name = d.properties.COUNTYNAME || d.properties.name;
                const val = dataMap.get(name);
                return val ? colorScale(val) : "#eee";
            })
            .on("mousemove", (event, d) => {
                const name = d.properties.COUNTYNAME || d.properties.name;
                const val = dataMap.get(name) || "無數據";
                tooltip.style("display", "block")
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px")
                    .html(`<strong>${name}</strong><br>平均吸菸支數: ${val} 支`);
            })
            .on("mouseout", () => tooltip.style("display", "none"));
    }

    // 監聽選單變動
    d3.select("#yearSelect").on("change", draw);
    d3.select("#genderSelect").on("change", draw);

    // 初始執行
    draw();

}).catch(err => {
    console.error("載入檔案失敗，請檢查檔案名稱是否正確：", err);
});