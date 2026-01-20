import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useData } from "../../context/DataContext";
import { Info } from "lucide-react";
import styles from "../../css/charts.module.css";

export default function CategoryExperienceHeatmap({ filters, highlightedCategory, onExperienceClick, onCategoryClick }) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();
  const [showInfo, setShowInfo] = useState(false);
  
  const [showYearTooltip, setShowYearTooltip] = useState(false);

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

  const expLabels = {
    EN: "Entry-level",
    MI: "Mid-level",
    SE: "Senior",
    EX: "Executive",
  };

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const tooltip = d3.select(tooltipRef.current).style("opacity", 0);

    const expLevels = ["EN", "MI", "SE", "EX"];
    const shownExpLevels = Array.isArray(filters.experience) ? filters.experience : [];

    let filtered = data;
    if (filters.year !== "ALL") filtered = filtered.filter(d => +d.work_year === +filters.year);
    if (filters.jobCategory?.length > 0) filtered = filtered.filter(d => filters.jobCategory.includes(d.category));
    if (filters.employmentType !== "ALL") filtered = filtered.filter(d => d.employment_type === filters.employmentType);
    if (filters.salaryRange?.length === 2) {
      const [min, max] = filters.salaryRange;
      filtered = filtered.filter(d => +d.salary_in_euros >= min && +d.salary_in_euros <= max);
    }

    if (filtered.length === 0) {
      svg.append("text").attr("x", 20).attr("y", 40).text("No data for selected filters.");
      return;
    }

    const grouped = Array.from(d3.rollups(filtered, v => d3.mean(v, d => +d.salary_in_euros), d => d.category, d => d.experience_level),
      ([category, expMap]) => ({ category, values: shownExpLevels.map(exp => ({ exp, salary: new Map(expMap).get(exp) ?? 0 })) })
    );

    const categories = grouped.map(d => d.category);
    const allCategories = Array.from(new Set(data.map(d => d.category))).sort();
    
    draw(grouped, allCategories);

 function draw(dataset, allCategories) {
  const container = ref.current.getBoundingClientRect();
  const width = container.width;
  const height = 420;
  const margin = { top: 20, right: 80, bottom: 110, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("width", width).attr("height", height);
  svg.selectAll("*").remove();

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.05);
  const y = d3.scaleBand().domain(shownExpLevels).range([0, innerHeight]).padding(0.05);
  const maxSalary = d3.max(dataset, d => d3.max(d.values, v => v.salary)) || 0;
  const minRange = filters.salaryRange?.[0] ?? 0;
  const maxRange = filters.salaryRange?.[1] ?? maxSalary;
  const upperBound = Math.max(maxSalary, maxRange, minRange + 1);

  const colorScale = d3.scaleOrdinal().domain(allCategories).range(categoryPalette);
  const opacityScale = d3.scaleLinear().domain([minRange, upperBound]).range([0.1, 1]);

  dataset.forEach(cat => {
    g.selectAll(`rect-${cat.category}`)
      .data(cat.values)
      .enter().append("rect")
      .attr("x", () => x(cat.category))
      .attr("y", d => y(d.exp))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", colorScale(cat.category))
      .attr("fill-opacity", d => {
          if (highlightedCategory && cat.category !== highlightedCategory) {
              return 0.1; 
          }
          return d.salary ? opacityScale(d.salary) : 0.05;
      })
      .attr("stroke", "white").attr("stroke-width", 2)
      .style("cursor", d => d.salary ? "pointer" : "default")
      .on("click", (event, d) => {
          if (d.salary > 0 && onExperienceClick) {
              onExperienceClick(d.exp);
          }
      })
      .on("mousemove", (event, d) => {
        const box = ref.current.getBoundingClientRect();
        d3.select(event.target).attr("stroke", "#333").attr("stroke-width", 2);
        tooltip.style("opacity", 1)
          .html(`
            <div style="font-family: Inter, sans-serif; text-align: left;">
              <div style="font-weight: 700; font-size: 13px; color:${colorScale(cat.category)}; margin-bottom: 4px;">
                ${cat.category}
              </div>
              <div style="font-size: 12px; color: #e2e8f0; margin-bottom: 2px;">
                Level: <span style="font-weight: 600; color: white;">${d.exp}</span>
              </div>
              <div style="font-weight:bold">€${Math.round(d.salary).toLocaleString()}</div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                Click to filter by Level
              </div>
            </div>
          `)
          .style("left", `${event.clientX - box.left + 15}px`)
          .style("top", `${event.clientY - box.top - 10}px`);
      })
      .on("mouseleave", (event) => {
         d3.select(event.target).attr("stroke", "white").attr("stroke-width", 2);
         tooltip.style("opacity", 0);
      });
  });

  const xAxis = g.append("g").attr("transform", `translate(0,${innerHeight + 10})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(10).tickFormat(d => d.length > 18 ? d.substring(0, 16) + "..." : d));
  xAxis.select(".domain").remove();
  xAxis.selectAll("text")
    .style("font-size", "11px")
    .style("font-weight", "500")
    .style("fill", "#64748b")
    .style("opacity", d => (highlightedCategory && d !== highlightedCategory) ? 0.3 : 1)
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .attr("dx", "-0.5em")
    .attr("dy", "0.5em")
    .style("cursor", "pointer")
    .on("mousemove", function(event, d) {
      const rect = ref.current.getBoundingClientRect();
      tooltip
        .style("opacity", 1)
        .html(`
          <div style="font-weight:600; color:${colorScale(d)}; margin-bottom:2px">${d}</div>
          <div style="font-size:0.75em; color:#94a3b8;">Click to filter</div>
        `)
        .style("left", `${event.clientX - rect.left + 15}px`)
        .style("top", `${event.clientY - rect.top - 10}px`);
    })
    .on("mouseleave", () => tooltip.style("opacity", 0))
    .on("click", (_, d) => {
      if (onCategoryClick) onCategoryClick(d);
    });

  const yAxis = g.append("g").call(
    d3.axisLeft(y)
      .tickSize(0)
      .tickFormat((d) => expLabels[d] || d)
  );
  yAxis.select(".domain").remove();
  yAxis.selectAll("text").style("font-size", "11px").style("fill", "#64748b").style("font-weight", "600");

  if (!highlightedCategory) {
      const legendHeight = 120;
      const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 20})`);
      legend.append("text").text("Salary Intensity").attr("x", 0).attr("y", -10).style("font-size", "10px").style("fill", "#64748b").style("text-anchor", "middle").attr("transform", "translate(10, 0)");
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient").attr("id", "opacityGradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#334155").attr("stop-opacity", 0.1);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#334155").attr("stop-opacity", 1);
      legend.append("rect").attr("width", 12).attr("height", legendHeight).attr("rx", 6).style("fill", "url(#opacityGradient)");
      const legendScale = d3.scaleLinear().domain([0, maxSalary]).range([legendHeight, 0]);
      const legendAxis = d3.axisRight(legendScale).ticks(4).tickFormat(d => "€" + Math.round(d / 1000) + "k").tickSize(0);
      legend.append("g").attr("transform", "translate(15,0)").call(legendAxis).selectAll("text").style("fill", "#94a3b8").style("font-size", "10px");
      legend.select(".domain").remove();
  }
}

  }, [data, loading, filters, highlightedCategory, onExperienceClick]);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Salary vs Experience Level</h3>
        
        {filters.year !== "ALL" && (
          <>
            <div 
              onMouseEnter={() => setShowYearTooltip(true)}
              onMouseLeave={() => setShowYearTooltip(false)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                backgroundColor: "#eff6ff", 
                color: "#2563eb",           
                fontSize: "11px",
                fontWeight: "600",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #dbeafe",
                cursor: "help" 
              }}
            >
              {filters.year}
            </div>

            {showYearTooltip && (
              <div style={{
                position: "absolute",
                left: "0px", 
                top: "30px", 
                background: "rgba(15, 23, 42, 0.95)", 
                color: "white",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid rgba(255,255,255,0.1)",
                zIndex: 50,
                whiteSpace: "nowrap",
                pointerEvents: "none"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "2px", color: "#60a5fa" }}>Filter Active</div>
                Displaying data for year <strong>{filters.year}</strong>
              </div>
            )}
          </>
        )}

        <button className={styles.infoButton} onClick={() => setShowInfo(s => !s)}><Info size={18} strokeWidth={2} /></button>
        {showInfo && <div className={styles.infoPopup}><p>Click any cell to filter the dashboard by Experience Level.</p></div>}
      </div>
      <svg ref={ref} className={styles.chartSvg}></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div>
    </div>
  );
}
