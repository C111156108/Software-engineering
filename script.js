document.addEventListener("DOMContentLoaded", function() {
    // 建立地圖畫布
    const svg = d3.select("#map").append("svg")
        .attr("viewBox", "0 0 800 800")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    const tooltip = d3.select("#tooltip");
    const projection = d3.geoMercator().center([121, 24.3]).scale(10000).translate([400, 400]);
    const path = d3.geoPath().projection(projection);

    let rawData = {};
    let geoData;

    const cleanName = (str) => {
        if (!str) return "";
        return str.replace(/.*=/, "").replace("台", "臺").trim();
    };

    // 載入資料
    Promise.all([
        d3.json("taiwan.json"),
        d3.csv("15歲以上吸菸者每天平均吸菸支數.csv"),
        d3.csv("高中職生目前吸菸率.csv"),
        d3.csv("國中生目前吸菸率.csv")
    ]).then(([taiwan, adultCsv, highCsv, juniorCsv]) => {
        geoData = topojson.feature(taiwan, taiwan.objects.layer1);
        
        // 處理成人數據 (支數)
        rawData.adult = adultCsv.filter(d => d.分析項目.includes("縣市別")).map(d => ({
            year: d.年度.replace(/民國|年/g, ""),
            name: cleanName(d.分析項目),
            value: +d["整體吸菸者平均吸菸支數之平均值(支)"]
        }));

        // 處理學生數據 (吸菸率)
        const parseStudent = (csv) => {
            let res = [];
            csv.filter(d => d.分析項目.includes("縣市別")).forEach(d => {
                const name = cleanName(d.分析項目);
                Object.keys(d).forEach(k => {
                    if (k.includes("學生吸菸率(%)") && !k.includes("男性") && !k.includes("女性")) {
                        const year = k.match(/\d+/)[0];
                        res.push({ year, name, value: +d[k] });
                    }
                });
            });
            return res;
        };

        rawData.highschool = parseStudent(highCsv);
        rawData.junior = parseStudent(juniorCsv);

        init();
    }).catch(err => console.error("檔案載入錯誤:", err));

    function init() {
        d3.select("#popSelect").on("change", updateYearOptions);
        d3.select("#yearSelect").on("change", updateMap);
        updateYearOptions();
    }

    function updateYearOptions() {
        const pop = d3.select("#popSelect").property("value");
        const years = [...new Set(rawData[pop].map(d => d.year))].sort((a,b) => b-a);
        const sel = d3.select("#yearSelect");
        sel.selectAll("option").remove();
        years.forEach(y => sel.append("option").text(`${y} 年`).attr("value", y));
        updateMap();
    }

    function updateMap() {
        const pop = d3.select("#popSelect").property("value");
        const year = d3.select("#yearSelect").property("value");
        const unit = pop === "adult" ? "支" : "%";
        
        const currentData = rawData[pop].filter(d => d.year === year);
        const dataMap = new Map(currentData.map(d => [d.name, d.value]));
        
        // 更新全台平均
        const avg = d3.mean(currentData, d => d.value);
        d3.select("#avg-value").text(`${avg ? avg.toFixed(2) : '--'} ${unit}`);

        // 設定顏色比例尺
        const maxVal = d3.max(rawData[pop], d => d.value) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxVal]);

        // 繪製地圖
        const counties = svg.selectAll(".county").data(geoData.features);

        counties.enter().append("path")
            .attr("class", "county")
            .merge(counties)
            .transition().duration(400)
            .attr("d", path)
            .attr("fill", d => {
                const val = dataMap.get(cleanName(d.properties.COUNTYNAME));
                return val ? colorScale(val) : "#eee";
            });

        svg.selectAll(".county")
            .on("mouseover", function() { d3.select(this).style("stroke", "#333").style("stroke-width", "1.5"); })
            .on("mousemove", (event, d) => {
                const name = cleanName(d.properties.COUNTYNAME);
                const val = dataMap.get(name);
                tooltip.style("display", "block")
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .html(`<strong>${name}</strong><br>數值: ${val ? val.toFixed(2) + unit : '無資料'}`);
            })
            .on("mouseout", function() {
                d3.select(this).style("stroke", "#fff").style("stroke-width", "0.5");
                tooltip.style("display", "none");
            });
    }
});