import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";
import { Info } from "lucide-react";

export default function CategoryCompanySizeChart({ filters, highlightedCategory, onSizeClick }) {
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

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const tooltip = d3
      .select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`);

    let filtered = data;
    if (filters.jobCategory?.length > 0) {
      filtered = filtered.filter(d => filters.jobCategory.includes(d.category));
    }
    if (filters.year !== "ALL") {
      filtered = filtered.filter(d => +d.work_year === +filters.year);
    }
    if (filters.employmentType !== "ALL") {
      filtered = filtered.filter(d => d.employment_type === filters.employmentType);
    }
    if (filters.salaryRange?.length === 2) {
      filtered = filtered.filter(d => +d.salary_in_euros >= filters.salaryRange[0] && +d.salary_in_euros <= filters.salaryRange[1]);
    }

    const defaultSizes = ["S", "M", "L"];
    const selectedSizes = Array.isArray(filters.companySize) && filters.companySize.length > 0 ? filters.companySize : defaultSizes; 
    filtered = filtered.filter(d => selectedSizes.includes(d.company_size));

    if (filtered.length === 0) {
      svg.append("text").attr("x", 20).attr("y", 40).text("No data for selected filters.");
      return;
    }

    const grouped = Array.from(
      d3.rollups(
        filtered, 
        v => d3.mean(v, d => +d.salary_in_euros), 
        d => d.category, 
        d => d.company_size
      ),
      ([category, sizeMap]) => ({ 
        category, 
        values: selectedSizes.map(size => ({ size, salary: new Map(sizeMap).get(size) ?? 0 })) 
      })
    );

    const categories = grouped.map(d => d.category);
    const allCategories = Array.from(new Set(data.map(d => d.category))).sort();

    drawChart(grouped, allCategories);

    function drawChart(dataset, allCategories) {
      const container = ref.current.getBoundingClientRect();
      const width = container.width;
      const height = 440;
      
      const margin = { top: 40, right: 20, bottom: 110, left: 70 };
      
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr("width", width).attr("height", height);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x0 = d3.scaleBand().domain(categories).range([0, innerWidth]).paddingInner(0.25);
      const x1 = d3.scaleBand().domain(selectedSizes).range([0, x0.bandwidth()]).padding(0.15);
      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange =
        filters.salaryRange?.[1] ??
        (d3.max(dataset, d => d3.max(d.values, v => v.salary)) ||
        0);
      const upperBound = Math.max(maxRange, minRange + 1);

      const y = d3.scaleLinear()
        .domain([minRange, upperBound])
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal().domain(allCategories).range(categoryPalette);

      g.append("g").attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x0)
            .tickSize(0)
            .tickPadding(12)
            .tickFormat(d => d.length > 20 ? d.substring(0, 18) + "..." : d)
        )
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .style("fill", "#64748b")
        .style("cursor", "pointer")
        .on("mousemove", function(event, d) {
          const rect = ref.current.getBoundingClientRect();
          tooltip
            .style("opacity", 1)
            .html(`
              <div style="font-weight:600; color:${color(d)}; margin-bottom:2px">${d}</div>
              <div style="font-size:0.75em; color:#94a3b8;">Click bars to filter by size</div>
            `)
            .style("left", `${event.clientX - rect.left + 15}px`)
            .style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
        
      g.select(".domain").remove();

      const yAxis = g.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(d => `€${d/1000}k`));
      yAxis.select(".domain").remove();
      yAxis.selectAll("line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      const groups = g.selectAll(".cat").data(dataset).enter().append("g").attr("transform", d => `translate(${x0(d.category)},0)`);

      groups.selectAll("rect")
        .data(d => d.values)
        .enter().append("rect")
        .attr("x", d => x1(d.size))
        .attr("y", d => y(d.salary))
        .attr("width", x1.bandwidth())
        .attr("height", d => innerHeight - y(d.salary))
        
        .attr("fill", function(d) { 
             const parentData = d3.select(this.parentNode).datum();
             const baseColor = color(parentData.category);
             if (d.size === 'S') return d3.color(baseColor).brighter(0.6);
             if (d.size === 'L') return d3.color(baseColor).darker(0.4);
             return baseColor;
        })
        .attr("fill-opacity", function(d) { 
            const parentData = d3.select(this.parentNode).datum();
            if (highlightedCategory && parentData.category !== highlightedCategory) return 0.1;
            return 1;
        })
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (onSizeClick) onSizeClick(d.size);
        })
        .on("mousemove", function(event, d) {
          const parentData = d3.select(this.parentNode).datum();
          const rect = ref.current.getBoundingClientRect();
          d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);
          tooltip.style("opacity", 1)
            .html(`
              <div style="font-weight:bold; color:${color(parentData.category)}">${parentData.category}</div>
              <div>Size: ${d.size === "S" ? "Small" : d.size === "M" ? "Medium" : "Large"}</div>
              <div style="font-weight:bold">€${Math.round(d.salary).toLocaleString()}</div>
              <div style="font-size:0.8em; color:#94a3b8; margin-top:4px">Click to filter by Size</div>
            `)
            .style("left", `${event.clientX - rect.left + 10}px`).style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", function(event, d) {
            d3.select(this).attr("stroke", "none");
            tooltip.style("opacity", 0);
        });

      groups.selectAll(".bar-label")
        .data(d => d.values)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => x1(d.size) + x1.bandwidth() / 2)
        .attr("y", d => y(d.salary) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "700")
        .style("fill", "#64748b")
        .style("pointer-events", "none")
        .style("opacity", function(d) { 
             const parentData = d3.select(this.parentNode).datum();
             if (highlightedCategory && parentData.category !== highlightedCategory) return 0.1;
             return d.salary > 0 ? 1 : 0;
        })
        .text(d => d.size);
    }
  }, [data, loading, filters, highlightedCategory, onSizeClick]);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>Company Size Impact</h3>
        
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

        <button className={styles.infoButton} onClick={() => setShowInfo(s => !s)}><Info size={16} /></button>
        {showInfo && <div className={styles.infoPopup}><p>Bars show average salary by company size.<br/><strong>S, M, L</strong> labels indicate size.<br/>Colors match the Category.</p></div>}
      </div>
      <svg ref={ref} width="100%" height="420"></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div>
    </div>
  );
}
