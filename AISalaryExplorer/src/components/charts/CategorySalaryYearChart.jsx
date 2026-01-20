import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";
import { Info } from "lucide-react";

export default function CategorySalaryYearChart({ 
  filters, 
  onCategoryClick, 
  onClearCategoryFilter, 
  highlightedCategory 
}) { 
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();
  const [showInfo, setShowInfo] = useState(false);
  const [showAllYears, setShowAllYears] = useState(false);
  const [titleColor, setTitleColor] = useState("#000000"); 

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
    const tooltip = d3.select(tooltipRef.current)
        .style("opacity", 0)
        .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`);

    let filtered = data;
    let effectiveCategories = new Set(filters.jobCategory);
    if (filters.jobRole && filters.jobRole.length > 0) {
      data.filter(d => filters.jobRole.includes(d.job_title))
          .forEach(d => effectiveCategories.add(d.category));
    }
    effectiveCategories = Array.from(effectiveCategories);

    if (!showAllYears) {
  filtered = filtered.filter(d => +d.work_year === +filters.year);
}

    if (filters.employmentType !== "ALL") {
      filtered = filtered.filter(d => d.employment_type === filters.employmentType);
    }
    if (filters.salaryRange?.length === 2) {
      const [min, max] = filters.salaryRange;
      filtered = filtered.filter(d => +d.salary_in_euros >= min && +d.salary_in_euros <= max);
    }
    if (effectiveCategories.length > 0) {
      filtered = filtered.filter(d => effectiveCategories.includes(d.category));
    }

    if (filtered.length === 0) {
      svg.selectAll("*").remove();
      svg
        .attr("width", "100%")
        .attr("height", 200)
        .append("text")
        .attr("x", 20)
        .attr("y", 60)
        .style("fill", "#64748b")
        .style("font-size", "14px")
        .text("No data available");
      return;
    }

    const grouped = Array.from(d3.rollups(filtered, v => d3.mean(v, d => +d.salary_in_euros), d => d.category, d => +d.work_year),
      ([category, yearMap]) => ({
        category,
        values: Array.from(yearMap, ([year, salary]) => ({
          year,
          salary,
          category
        })).sort((a, b) => a.year - b.year),
      })
    );

    const years = [...new Set(filtered.map((d) => +d.work_year))].sort();
    const allCategories = Array.from(new Set(data.map(d => d.category))).sort();

    drawChart(grouped, years, allCategories);

    function drawChart(dataset, years, allCategories) {
      const container = ref.current.getBoundingClientRect();
      const width = container.width;
      const height = 440;
      
      const margin = { top: 40, right: 20, bottom: 150, left: 70 }; 
      
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const categories = dataset.map((d) => d.category);
      const x0 = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.15);
      const x1 = d3.scaleBand().domain(years).range([0, x0.bandwidth()]).padding(0.05);
      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange =
        (filters.salaryRange?.[1] ??
        d3.max(dataset, d => d3.max(d.values, v => v.salary))) ||
        0;
      const upperBound = Math.max(maxRange, minRange + 1);

      const y = d3.scaleLinear()
        .domain([minRange, upperBound])
        .range([innerHeight, 0]);
      const color = d3.scaleOrdinal().domain(allCategories).range(categoryPalette);

      setTitleColor("#000000");

      const minYear = d3.min(years);
      const maxYear = d3.max(years);
      const isSingleYear = minYear === maxYear;
      const opacity = isSingleYear ? () => 1 : d3.scaleLinear().domain([minYear, maxYear]).range([0.4, 1]);

      const xAxisGroup = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x0)
            .tickSize(0)
            .tickPadding(5) 
            .tickFormat(d => d.length > 13 ? d.substring(0, 11) + "..." : d) 
        );

      xAxisGroup.select(".domain").remove();
      
      const xAxisLabels = xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .style("font-size", "10px") 
        .style("font-weight", "500")
        .style("fill", "#64748b")
        .style("cursor", "pointer")

     xAxisLabels
  .attr("transform", "rotate(-45)")
  .style("text-anchor", "end")
  .attr("dx", "-0.2em") 
  .attr("dy", "0.2em")    
  .style("font-size", "10px")
  .style("font-weight", "500")
  .style("fill", "#64748b")
  .style("cursor", "pointer")
  .on("mousemove", function(event, d) {
      const rect = ref.current.getBoundingClientRect();
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight:600; color:${color(d)}; margin-bottom:2px">${d}</div>
          <div style="font-size:0.75em; color:#94a3b8;">Click to filter</div>
        `)
        .style("left", `${event.clientX - rect.left + 15}px`)
        .style("top", `${event.clientY - rect.top - 10}px`);
  })
  .on("mouseleave", function() {
      tooltip.style("opacity", 0);
  })
  .on("click", (event, d) => {
      if (onCategoryClick) onCategoryClick(d);
      tooltip.style("opacity", 0);
  });

      const yAxis = g.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(d => `€${d/1000}k`));
      yAxis.select(".domain").remove();
      yAxis.selectAll("line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      const groups = g.selectAll(".category").data(dataset).enter().append("g").attr("transform", d => `translate(${x0(d.category)},0)`);

      groups.selectAll("rect")
        .data(d => d.values)
        .enter()
        .append("rect")
        .attr("x", d => x1(d.year))
        .attr("y", d => y(d.salary))
        .attr("width", x1.bandwidth())
        .attr("height", d => innerHeight - y(d.salary))
        .attr("fill", d => color(d.category))
        .attr("fill-opacity", d => {
            if (highlightedCategory && d.category !== highlightedCategory) return 0.1;
            return opacity(d.year);
        })
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (onCategoryClick) onCategoryClick(d.category);
        })
        .on("mousemove", function(event, d) {
          const rect = ref.current.getBoundingClientRect();
          d3.select(this).attr("fill-opacity", 0.9);
          tooltip.style("opacity", 1)
  .html(`
    <div style="font-weight:600; color:${color(d.category)}; margin-bottom:2px">
      ${d.category}
    </div>

    <div style="font-size:0.75em; color:#94a3b8; margin-bottom:2px">
      ${d.year}
    </div>

    <div style="font-weight:bold; font-size:1.05em;">
      €${Math.round(d.salary).toLocaleString()}
    </div>

    <div style="font-size:0.7em; color:#94a3b8; margin-top:4px">
      Click to filter
    </div>
  `)

            .style("left", `${event.clientX - rect.left + 15}px`).style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", function(event, d) {
            const isFaded = highlightedCategory && d.category !== highlightedCategory;
            const baseOpacity = isSingleYear ? 1 : opacity(d.year);
            d3.select(this).attr("fill-opacity", isFaded ? 0.1 : baseOpacity);
            tooltip.style("opacity", 0);
        });

      if (!isSingleYear && !highlightedCategory) {
       const legend = svg.append("g")
  .attr("transform", `translate(${width - margin.right - 150}, ${margin.top})`)
  .style("font-family", "sans-serif");

legend.append("text")
  .text("Year Intensity (Opacity):")
  .attr("font-size", "11px")
  .attr("fill", "#64748b")
  .attr("y", 0);

legend.append("rect")
  .attr("x", 0)
  .attr("y", 10)
  .attr("width", 14)
  .attr("height", 14)
  .attr("rx", 2)
  .attr("fill", "#64748b")
  .attr("fill-opacity", 0.4);

legend.append("text")
  .attr("x", 20)
  .attr("y", 22)
  .text(minYear)
  .attr("font-size", "11px")
  .attr("fill", "#64748b");

legend.append("rect")
  .attr("x", 65)
  .attr("y", 10)
  .attr("width", 14)
  .attr("height", 14)
  .attr("rx", 2)
  .attr("fill", "#64748b")
  .attr("fill-opacity", 1);

legend.append("text")
  .attr("x", 85)
  .attr("y", 22)
  .text(maxYear)
  .attr("font-size", "11px")
  .attr("fill", "#64748b");

      } else if (isSingleYear) {
        const legend = svg.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`);

        legend.append("text")
          .text(`Selected Year: ${minYear}`)
          .attr("font-size", "12px")
          .attr("font-weight", "600")
          .attr("fill", "#000000")
          .attr("y", 10)
          .attr("text-anchor", "start");
      }
    }

}, [
  data,
  loading,
  showAllYears,
  highlightedCategory,
  filters.year,
  filters.jobCategory,
  filters.jobRole,
  filters.employmentType,
  filters.salaryRange
]);

 return (
    <div className={styles.chartContainer} style={{ position: 'relative' }}>
      
      <div className={styles.header}>
        <div style={{ textAlign: 'center' }}>
          <h3 className={styles.title} style={{ color: titleColor }}>Annual Salary Distribution</h3>
        </div>

        <button className={styles.infoButton} onClick={() => setShowInfo((s) => !s)}>
          <Info size={16} strokeWidth={2} />
        </button>

        {showInfo && (
          <div className={styles.infoPopup}>
            <p>
              Bars are grouped by Category.<br/>
              <strong>Color:</strong> Represents the Category.<br/>
              <strong>Opacity:</strong> Represents the Year (darker = more recent).<br/>
              <strong>Click</strong> on a bar or category label to filter the dashboard.
            </p>
          </div>
        )}
      </div>

      <svg ref={ref} width="100%" height="420"></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div> 

      <div style={{ 
        position: "absolute",
        bottom: "10px", 
        right: "15px",
        display: "flex",
        gap: "10px", 
        zIndex: 10
      }}>

        {highlightedCategory && onClearCategoryFilter && (
          <button 
            onClick={onClearCategoryFilter} 
            style={{
              background: titleColor,
              border: `1px solid ${titleColor}`, 
              color: "white",
              fontSize: "0.7rem",
              fontWeight: "600",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.opacity = 0.9; }}
            onMouseLeave={(e) => { e.target.style.opacity = 1; }}
          >
            Clear Filter: {highlightedCategory}
          </button>
        )}

       <button 
  onClick={() => setShowAllYears(prev => !prev)} 
  style={{
    background: "white",
    border: `1px solid ${titleColor}`,
    color: titleColor,
    fontSize: "0.7rem",
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.2s",
  }}
  onMouseEnter={(e) => { e.target.style.backgroundColor = titleColor + "10"; }}
  onMouseLeave={(e) => { e.target.style.backgroundColor = "white"; }}
>
  {showAllYears ? "Back to Current Year" : "Compare All Years"}
</button>

      </div>
    </div>
  );
}
