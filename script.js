document.addEventListener("DOMContentLoaded", function() {
    const width = 800, height = 750;
    
    // 1. 初始化 SVG
    const svg = d3.select("#map").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    const tooltip = d3.select("#tooltip");
    const projection = d3.geoMercator().center([121, 24.3]).scale(10000).translate([width/2, height/2]);
    const path = d3.geoPath().projection(projection);

    let rawData = { adult: [], highschool: [], junior: [] };
    let geoData;

    // 清除縣市名稱多餘字元的工具
    const cleanName = (str) => {
        if (!str) return "";
        return str.replace(/.*=/, "").replace("台", "臺").trim();
    };

    // 2. 載入資料 (使用相對路徑確保 GitHub Pages 正常)
    Promise.all([
        d3.json("taiwan.json"),
        d3.csv("15歲以上吸菸者每天平均吸菸支數.csv"),
        d3.csv("高中職生目前吸菸率.csv"),
        d3.csv("國中生目前吸菸率.csv")
    ]).then(([taiwan, adultCsv, highCsv, juniorCsv]) => {
        
        // 取得地形資料
        geoData = topojson.feature(taiwan, taiwan.objects.layer1);
        
        // --- 核心修正：加入安全性檢查 (Optional Chaining & Null Check) ---

        // A. 處理成人數據
        rawData.adult = adultCsv
            .filter(d => d && d.分析項目 && d.分析項目.includes("縣市別"))
            .map(d => ({
                year: d.年度 ? d.年度.replace(/民國|年/g, "") : "",
                name: cleanName(d.分析項目),
                value: +d["整體吸菸者平均吸菸支數之平均值(支)"] || 0
            }));

        // B. 處理學生數據 (共用解析器)
        const parseStudent = (csv, keyword) => {
            let res = [];
            csv.filter(d => d && d.分析項目 && d.分析項目.includes("縣市別")).forEach(d => {
                const name = cleanName(d.分析項目);
                Object.keys(d).forEach(k => {
                    // 只抓取「整體」吸菸率，避開男性/女性欄位
                    if (k.includes(keyword) && !k.includes("男性") && !k.includes("女性")) {
                        const yearMatch = k.match(/\d+/);
                        if (yearMatch) {
                            res.push({
                                year: yearMatch[0],
                                name: name,
                                value: +d[k] || 0
                            });
                        }
                    }
                });
            });
            return res;
        };

        rawData.highschool = parseStudent(highCsv, "高中職學生吸菸率(%)");
        rawData.junior = parseStudent(juniorCsv, "國中學生吸菸率(%)");

        setupControls();
        updateDisplay();

    }).catch(err => {
        console.error("資料載入或解析失敗:", err);
    });

    // 3. 設定選單連動
    function setupControls() {
        // 當切換觀察對象時，重新生成年份選項
        d3.select("#popSelect").on("change", () => {
            renderYearOptions();
            updateDisplay();
        });

        d3.select("#yearSelect").on("change", updateDisplay);

        renderYearOptions();
    }

    function renderYearOptions() {
        const pop = d3.select("#popSelect").property("value");
        const years = [...new Set(rawData[pop].map(d => d.year))].sort((a,b) => b - a);
        
        const yearSelector = d3.select("#yearSelect");
        yearSelector.selectAll("option").remove();
        
        years.forEach(y => {
            yearSelector.append("option").text(`${y} 年`).attr("value", y);
        });
    }

    // 4. 更新地圖與數據
    function updateDisplay() {
        const pop = d3.select("#popSelect").property("value");
        const year = d3.select("#yearSelect").property("value");
        const unit = pop === "adult" ? "支" : "%";

        const currentData = rawData[pop].filter(d => d.year === year);
        const dataMap = new Map(currentData.map(d => [d.name, d.value]));
        
        // 更新平均值顯示
        const avg = d3.mean(currentData, d => d.value);
        d3.select("#avg-value").text(`${avg ? avg.toFixed(2) : '--'} ${unit}`);

        // 顏色比例尺
        const maxVal = d3.max(rawData[pop], d => d.value) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxVal]);

        // 繪製路徑
        const counties = svg.selectAll(".county").data(geoData.features);

        counties.enter().append("path")
            .attr("class", "county")
            .merge(counties)
            .transition().duration(500)
            .attr("d", path)
            .attr("fill", d => {
                const name = cleanName(d.properties.COUNTYNAME);
                const val = dataMap.get(name);
                return val ? colorScale(val) : "#eee";
            });

        // 滑鼠互動
        svg.selectAll(".county")
            .on("mouseover", function() {
                d3.select(this).style("stroke", "#333").style("stroke-width", "1.5");
            })
            .on("mousemove", (event, d) => {
                const name = cleanName(d.properties.COUNTYNAME);
                const val = dataMap.get(name);
                tooltip.style("display", "block")
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .html(`<strong>${name}</strong><br>${year}年: ${val ? val.toFixed(2) + unit : '無資料'}`);
            })
            .on("mouseout", function() {
                d3.select(this).style("stroke", "#fff").style("stroke-width", "0.5");
                tooltip.style("display", "none");
            });
    }
});