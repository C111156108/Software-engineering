const width = 800, height = 750;
const svg = d3.select("#map").append("svg").attr("viewBox", `0 0 ${width} ${height}`);
const tooltip = d3.select("#tooltip");

const projection = d3.geoMercator().center([121, 24.3]).scale(10000).translate([width/2, height/2]);
const path = d3.geoPath().projection(projection);

let rawData = {};
let geoData;

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
    
    // 整理成人紙菸 (原本是按年排列)
    rawData.adult_cigarette = adult_c.map(d => ({
        year: d.年度,
        name: d.分析項目.replace("現住地縣市別=", ""),
        overall: +d["整體吸菸者平均吸菸支數之平均值(支)"],
        male: +d["男性吸菸者平均吸菸支數之平均值(支)"],
        female: +d["女性吸菸者平均吸菸支數之平均值(支)"]
    }));

    // 通用處理函數：處理橫向排列的青少年 CSV (紙菸與電子煙)
    const processYouth = (csv, prefix, type) => {
        let results = [];
        let years = type === 'evape' ? ["103", "104", "105", "106"] : ["93", "94", "95", "96", "97", "98", "99", "100", "101", "102", "103", "104", "105", "107", "108", "110"];
        
        csv.forEach(d => {
            let name = (d.分析項目 || d.縣市別 || "").replace("現住地縣市別=", "").replace("縣市別=", "");
            years.forEach(y => {
                let o = d[`${y}年${prefix}目前吸電子煙率(%)`] || d[`${y}年${prefix}吸菸率(%)`];
                let m = d[`${y}年${prefix}男性學生目前吸電子煙率(%)`] || d[`${y}年${prefix}男性學生吸菸率(%)`];
                let f = d[`${y}年${prefix}女性學生目前吸電子煙率(%)`] || d[`${y}年${prefix}女性學生吸菸率(%)`];
                if(o !== undefined) {
                    results.push({ year: `民國${y}年`, name, overall: +o, male: +m, female: +f });
                }
            });
        });
        return results;
    };

    rawData.highschool_cigarette = processYouth(hs_c, "高中職學生");
    rawData.junior_cigarette = processYouth(jr_c, "國中學生");
    rawData.highschool_evape = processYouth(hs_e, "高中職學生", 'evape');
    rawData.junior_evape = processYouth(jr_e, "國中學生", 'evape');

    init();
});

function init() {
    d3.select("#popSelect").on("change", updateUI);
    d3.select("#productSelect").on("change", updateUI);
    d3.select("#genderSelect").on("change", draw);
    d3.select("#yearSelect").on("change", draw);
    updateUI();
}

function updateUI() {
    const pop = d3.select("#popSelect").property("value");
    const prod = d3.select("#productSelect").property("value");
    
    // 成人暫無電子煙數據，做個防呆
    if(pop === 'adult' && prod === 'evape') {
        alert("目前暫無成人電子煙公開細分數據，請選擇青少年族群");
        d3.select("#productSelect").property("value", "cigarette");
        return;
    }

    const key = `${pop}_${prod}`;
    const data = rawData[key];
    const years = Array.from(new Set(data.map(d => d.year))).sort().reverse();
    
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
    
    // 計算平均值
    const avg = d3.mean(currentData.filter(d => d.name !== "整體"), d => d[gender]);
    d3.select("#avg-value").text(`${avg ? avg.toFixed(2) : '--'} ${unit}`);

    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(rawData[key], d => d[gender])]);

    const paths = svg.selectAll(".county").data(geoData.features);

    paths.enter().append("path").attr("class", "county").merge(paths)
        .transition().duration(500)
        .attr("d", path)
        .attr("fill", d => {
            const val = dataMap.get(d.properties.COUNTYNAME) || dataMap.get(d.properties.name);
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