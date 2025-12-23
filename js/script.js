document.addEventListener("DOMContentLoaded", function() {
    const svg = d3.select("#map").append("svg")
        .attr("viewBox", "0 0 800 750").attr("preserveAspectRatio", "xMidYMid meet");
    
    const tooltip = d3.select("#tooltip");
    const projection = d3.geoMercator().center([121, 24.3]).scale(10000).translate([400, 375]);
    const path = d3.geoPath().projection(projection);

    let rawData, geoData;

    // 指向新的 JSON 位置
    Promise.all([
        d3.json("taiwan.json"),
        d3.json("data/data.json") 
    ]).then(([taiwan, data]) => {
        geoData = topojson.feature(taiwan, taiwan.objects.layer1);
        rawData = data;
        
        d3.select("#popSelect").on("change", renderOptions);
        d3.select("#yearSelect").on("change", updateMap);
        renderOptions();
    }).catch(err => alert("資料載入失敗，請確認 data/data.json 是否存在"));

    function renderOptions() {
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
        
        const avg = d3.mean(currentData, d => d.value);
        d3.select("#avg-value").text(`${avg ? avg.toFixed(2) : '--'} ${unit}`);

        const colorScale = d3.scaleSequential(d3.interpolateReds)
                             .domain([0, d3.max(rawData[pop], d => d.value) || 1]);

        const counties = svg.selectAll(".county").data(geoData.features);
        counties.enter().append("path").attr("class", "county")
            .merge(counties).transition().duration(400)
            .attr("d", path)
            .attr("fill", d => {
                const name = d.properties.COUNTYNAME.replace("台", "臺");
                return dataMap.has(name) ? colorScale(dataMap.get(name)) : "#eee";
            });

        svg.selectAll(".county")
            .on("mousemove", (event, d) => {
                const name = d.properties.COUNTYNAME.replace("台", "臺");
                const val = dataMap.get(name);
                tooltip.style("display", "block").style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px")
                       .html(`<strong>${name}</strong><br>數值: ${val ? val.toFixed(2) + unit : '無資料'}`);
            })
            .on("mouseout", () => tooltip.style("display", "none"));
    }
});