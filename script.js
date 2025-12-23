document.addEventListener("DOMContentLoaded", function() {
    const width = 800, height = 750;
    const mapDiv = d3.select("#map");
    
    // 防錯檢查：確保 #map 存在
    if (mapDiv.empty()) {
        console.error("錯誤：找不到 #map 元素。");
        return;
    }

    const svg = mapDiv.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%");

    const tooltip = d3.select("#tooltip");
    const projection = d3.geoMercator().center([121, 24.3]).scale(10000).translate([width/2, height/2]);
    const path = d3.geoPath().projection(projection);

    let rawData = {};
    let geoData;

    const cleanName = (str) => {
        if (!str) return "";
        return str.replace("現住地縣市別=", "").replace("縣市別=", "").trim();
    };

    // 載入所有資料
    Promise.all([
        d3.json("taiwan.json"),
        d3.csv("15歲以上吸菸者每天平均吸菸支數.csv"),
        d3.csv("高中職生目前吸菸率.csv"),
        d3.csv("國中生目前吸菸率.csv"),
        d3.csv("高中職生電子煙吸食率.csv"),
        d3.csv("國中生電子煙吸食率.csv")
    ]).then(([topo, adult_c, hs_c, jr_c, hs_e, jr_e]) => {
        
        geoData = topojson.feature(topo, topo.objects.layer1);
        
        // 1. 成人數據處理
        rawData.adult_cigarette = adult_c.map(d => ({
            year: d.年度,
            name: cleanName(d.分析項目),
            overall: +d["整體吸菸者平均吸菸支數之平均值(支)"],
            male: +d["男性吸菸者平均吸菸支數之平均值(支)"],
            female: +d["女性吸菸者平均吸菸支數之平均值(支)"]
        })).filter(d => d.name !== "整體" && d.name !== "");

        // 2. 青少年數據通用處理函數 (寬表轉長表)
        const processYouth = (csv, typeKey) => {
            let results = [];
            const columns = Object.keys(csv[0]);
            const years = [...new Set(columns.map(c => c.match(/\d+/)).filter(m => m).map(m => m[0]))];

            csv.forEach(d => {
                const name = cleanName(d.分析項目 || d.縣市別);
                if (!name || name === "整體" || name.includes("年級")) return;

                years.forEach(y => {
                    const findCol = (gender) => columns.find(c => c.includes(y) && c.includes(gender) && c.includes(typeKey));
                    
                    let o = d[findCol("學生")];
                    let m = d[findCol("男性")];
                    let f = d[findCol("女性")];

                    if (o !== undefined) {
                        results.push({ year: `民國${y}年`, name, overall: +o, male: +m, female: +f });
                    }
                });
            });
            return results;
        };

        rawData.highschool_cigarette = processYouth(hs_c, "吸菸率");
        rawData.junior_cigarette = processYouth(jr_c, "吸菸率");
        rawData.highschool_evape = processYouth(hs_e, "電子煙率");
        rawData.junior_evape = processYouth(jr_e, "電子煙率");

        // 初始化
        d3.select("#popSelect").on("change", updateUI);
        d3.select("#productSelect").on("change", updateUI);
        d3.select("#genderSelect").on("change", draw);
        d3.select("#yearSelect").on("change", draw);
        
        updateUI();
    }).catch(err => {
        console.error("資料載入出錯，請檢查檔案名稱是否一致：", err);
    });

    function updateUI() {
        const pop = d3.select("#popSelect").property("value");
        const prod = d3.select("#productSelect").property("value");
        
        if (pop === 'adult' && prod === 'evape') {
            alert("目前資料中暫無成人電子煙數據。");
            d3.select("#productSelect").property("value", "cigarette");
            updateUI();
            return;
        }

        const key = `${pop}_${prod}`;
        const data = rawData[key];
        const years = [...new Set(data.map(d => d.year))].sort().reverse();
        
        const yrSel = d3.select("#yearSelect");
        yrSel.selectAll("option").remove();
        years.forEach(y => yrSel.append("option").text(y).attr("value", y));
        
        draw();
    }

    function draw() {
        const pop = d3.select("#popSelect").property("value");
        const prod = d3.select("#productSelect").property("value");
        const year = d3.select("#yearSelect").property("value");
        const gender = d3.select("#genderSelect").property("value");
        const key = `${pop}_${prod}`;
        const unit = pop === 'adult' ? '支' : '%';

        const currentData = rawData[key].filter(d => d.year === year);
        const dataMap = new Map(currentData.map(d => [d.name, d[gender]]));
        
        const avg = d3.mean(currentData, d => d[gender]);
        d3.select("#avg-value").text(`${avg ? avg.toFixed(2) : '--'} ${unit}`);

        const maxVal = d3.max(rawData[key], d => d[gender]) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxVal]);

        const paths = svg.selectAll(".county").data(geoData.features);

        paths.enter().append("path").attr("class", "county").merge(paths)
            .transition().duration(400)
            .attr("d", path)
            .attr("fill", d => {
                const name = d.properties.COUNTYNAME || d.properties.name;
                const val = dataMap.get(name);
                return val ? colorScale(val) : "#eee";
            });

        svg.selectAll(".county")
            .on("mousemove", (event, d) => {
                const name = d.properties.COUNTYNAME || d.properties.name;
                const val = dataMap.get(name) || "無數據";
                tooltip.style("display", "block")
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px")
                    .html(`<strong>${name}</strong><br>${year}<br>數值: <strong>${val} ${unit}</strong>`);
            })
            .on("mouseout", () => tooltip.style("display", "none"));
    }
});