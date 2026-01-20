import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";

export default function CategorySalaryOverYearsChart({ 
  filters, 
  onYearSelect, 
  hoveredCategory, 
  setHoveredCategory,
  highlightedCategory,    
  setHighlightedCategory  
}) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();
  const [showInfo, setShowInfo] = useState(false);
  const [isSliderMode, setIsSliderMode] = useState(false);

  const categoryPalette = [
    "#2563eb", 
    "#0891b2", 
    "#7c3aed", 
    "#db2777", 
    "#ea580c", 
    "#16a34a", 
    "#ca8a04", 
    "#4f46e5", 
  ];

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const tooltip = d3.select(tooltipRef.current).style("opacity", 0);

    // --- FILTRAGEM ---
    const effectiveCategories = filters.jobCategory;
    let filtered = data;

    if (effectiveCategories?.length > 0)
      filtered = filtered.filter(d => effectiveCategories.includes(d.category));
    if (Array.isArray(filters.experience) && filters.experience.length > 0)
      filtered = filtered.filter(d => filters.experience.includes(d.experience_level));
    if (Array.isArray(filters.companySize) && filters.companySize.length > 0)
      filtered = filtered.filter(d => filters.companySize.includes(d.company_size));
    if (filters.employmentType !== "ALL")
      filtered = filtered.filter(d => d.employment_type === filters.employmentType);
    
    const [salaryMin, salaryMax] = filters.salaryRange;
    filtered = filtered.filter(d => +d.salary_in_euros >= salaryMin && +d.salary_in_euros <= salaryMax);

    if (filtered.length === 0) return;

    const nested = d3.groups(filtered, d => d.category, d => +d.work_year);
    const formatted = nested.map(([category, yearGroup]) => ({
      category,
      values: yearGroup.map(([year, rows]) => ({
        year,
        salary: d3.mean(rows, d => +d.salary_in_euros)
      })).sort((a,b) => a.year - b.year)
    }));

    const years = [...new Set(filtered.map(d => +d.work_year))].sort();
    const allCategories = Array.from(new Set(data.map(d => d.category))).sort();

    draw(formatted, years, salaryMin, salaryMax, allCategories);
  }, [data, loading, filters, isSliderMode, hoveredCategory, highlightedCategory]);

function draw(dataset, years, salaryMin, salaryMax, allCategories) {
  const svg = d3.select(ref.current);
  const tooltip = d3.select(tooltipRef.current);

  const container = ref.current.getBoundingClientRect();
  const width = container.width || 600;
  const height = 420;

  const margin = { top: 20, right: 30, bottom: 90, left: 60 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("width", width).attr("height", height);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(years).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([salaryMin, salaryMax]).nice().range([innerHeight, 0]);

  const color = d3.scaleOrdinal().domain(allCategories).range(categoryPalette);


  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(15))
    .select(".domain").remove();

  g.selectAll(".tick text")
    .style("font-size", "12px")
    .style("fill", "#64748b")
    .style("font-weight", "500");

  const yAxis = g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(d => `€${d / 1000}k`));

  yAxis.select(".domain").remove();
  yAxis.selectAll(".tick line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4");
  yAxis.selectAll("text").style("fill", "#94a3b8");


  const activeCategory =
    highlightedCategory ||
    (filters.jobCategory?.length === 1 ? filters.jobCategory[0] : null);
  const handleSelectCategory = (cat) => {
    if (!setHighlightedCategory) return;
    setHighlightedCategory(cat === highlightedCategory ? null : cat);
  };

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.salary))
    .curve(d3.curveMonotoneX);

  const lines = g.selectAll(".line-group")
    .data(dataset)
    .enter()
    .append("g")
    .attr("class", "line-group")
    .style("cursor", "pointer")
    .on("click", (_, d) => handleSelectCategory(d.category))
    .on("mousemove", (event, d) => {
      if (isSliderMode) return;
      const rect = ref.current.getBoundingClientRect();
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight:600; color:${color(d.category)}">${d.category}</div>
          <div style="font-size:0.8em; color:#999; margin-top:4px">Click to focus this line</div>
        `)
        .style("left", `${event.clientX - rect.left + 10}px`)
        .style("top", `${event.clientY - rect.top - 10}px`);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  lines.append("path")
    .attr("fill", "none")
    .attr("stroke", d => color(d.category))
    .attr("stroke-width", d => (activeCategory === d.category ? 4 : 3))
    .attr("opacity", d => (activeCategory && activeCategory !== d.category ? 0.25 : 1))
    .attr("d", d => line(d.values))
    .style("filter", "drop-shadow(0px 2px 2px rgba(0,0,0,0.1))");

  lines.selectAll("circle")
    .data(d => d.values.map(v => ({ ...v, category: d.category })))
    .enter()
    .append("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.salary))
    .attr("r", 4)
    .attr("fill", "white")
    .attr("stroke", d => color(d.category))
    .attr("stroke-width", 2)
    .attr("opacity", d => (activeCategory && activeCategory !== d.category ? 0.25 : 1))
      .style("cursor", "pointer")
      .on("click", (_, d) => handleSelectCategory(d.category))
      .on("mousemove", (event, d) => {
        if (isSliderMode) return;

        const rect = ref.current.getBoundingClientRect();
      tooltip.style("opacity", 1)
        .html(`
          <div style="font-weight:600; color:${color(d.category)}">${d.category}</div>
          <div>Year: ${d.year}</div>
          <div style="font-size:1.1em; font-weight:bold">€${Math.round(d.salary).toLocaleString()}</div>
          <div style="font-size:0.8em; color:#999; margin-top:4px">Hover to preview</div>
        `)
        .style("left", `${event.clientX - rect.left + 10}px`)
        .style("top", `${event.clientY - rect.top - 10}px`);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));


const legendMaxHeight = 85;   

const legendWrapper = g.append("foreignObject")
  .attr("x", innerWidth - 180)
  .attr("y", 0)
  .attr("width", 170)
  .attr("height", legendMaxHeight)
  .style("overflow", "visible");

const legendDiv = legendWrapper
  .append("xhtml:div")
  .style("max-height", `${legendMaxHeight}px`)
  .style("overflow-y", "auto")
  .style("background", "rgba(255,255,255,0.85)")
  .style("backdrop-filter", "blur(4px)")
  .style("border", "1px solid #e2e8f0")
  .style("border-radius", "10px")
  .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)")
  .style("padding", "8px 12px")
  .style("font-family", "sans-serif");

dataset.forEach((d, i) => {
  
  const item = legendDiv.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "8px")
    .style("margin-bottom", "6px")
    .style("cursor", "pointer")
    .on("click", () => handleSelectCategory(d.category))
    .on("mousemove", (event) => {
      if (isSliderMode) return;
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight:600; color:${color(d.category)}">${d.category}</div>
          <div style="font-size:0.8em; color:#999; margin-top:4px">Click to focus this line</div>
        `)
        .style("left", `${event.clientX - 80}px`)
        .style("top", `${event.clientY - 20}px`);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  item.append("div")
    .style("width", "14px")
    .style("height", "14px")
    .style("border-radius", "4px")
    .style("background", color(d.category))
    .style("opacity", activeCategory && activeCategory !== d.category ? 0.25 : 1);

  item.append("span")
    .style("font-size", "12px")
    .style("font-weight", activeCategory === d.category ? "700" : "500")
    .style("color", activeCategory === d.category ? "#111" : "#475569")
    .text(d.category);
});


  if (isSliderMode) {
    let currentDragYear = filters.year === "ALL" ? years[years.length - 1] : filters.year;

    const sliderGroup = g.append("g")
      .attr("class", "slider-group")
      .attr("cursor", "grab")
      .attr("transform", `translate(${x(currentDragYear)}, 0)`);

    sliderGroup.append("line")
      .attr("y1", -30)
      .attr("y2", innerHeight)
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4");

    sliderGroup.append("rect")
      .attr("x", -24)
      .attr("y", -34)
      .attr("width", 48)
      .attr("height", 24)
      .attr("rx", 6)
      .attr("fill", "#2563eb")
      .style("filter", "drop-shadow(0px 2px 2px rgba(0,0,0,0.2))");

    sliderGroup.append("text")
      .attr("class", "slider-year-text")
      .attr("x", 0)
      .attr("y", -18)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(currentDragYear);

    sliderGroup.append("rect")
      .attr("x", -30)
      .attr("y", 0)
      .attr("width", 60)
      .attr("height", innerHeight)
      .attr("fill", "transparent");

    const dragBehavior = d3.drag()
      .on("start", () => sliderGroup.attr("cursor", "grabbing"))
      .on("drag", (event) => {
        const mouseX = event.x;
        const closestYear = years.reduce((p, c) => (
          Math.abs(x(c) - mouseX) < Math.abs(x(p) - mouseX) ? c : p
        ), years[0]);

        sliderGroup.attr("transform", `translate(${x(closestYear)}, 0)`);
        sliderGroup.select(".slider-year-text").text(closestYear);
        currentDragYear = closestYear;
      })
      .on("end", () => {
        sliderGroup.attr("cursor", "grab");
        if (currentDragYear !== filters.year) onYearSelect(currentDragYear);
      });

    sliderGroup.call(dragBehavior);
  }
}



  return (
    <div className={styles.chartContainer} style={{ position: 'relative' }}>
      <div className={styles.header}>
        <h3 className={styles.title}>Historical Salary Trends</h3>
        <button className={styles.infoButton} onClick={() => setShowInfo((s) => !s)}>
          <Info size={16} strokeWidth={2} />
        </button>
        {showInfo && <div className={styles.infoPopup}><p>Click a line to highlight that category in the bar chart. Use the slider to filter years.</p></div>}
      </div>

      <svg ref={ref} className={styles.chartSvg}></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div>

      <div style={{ 
          position: "absolute", 
          bottom: "0px", 
          right: "15px", 
          display: "flex", 
          gap: "10px",
          zIndex: 10 
      }}>
        
        <button
          onClick={() => {
               const newMode = !isSliderMode;
               setIsSliderMode(newMode);
               if(!newMode) onYearSelect(2025); 
          }}
          style={{
            background: isSliderMode ? "#ef4444" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "0.85rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            transition: "background 0.2s"
          }}
        >
          {isSliderMode ? "Clear Filter" : "Enable Year Filter"}
        </button>
      </div>
    </div>
  );
}
