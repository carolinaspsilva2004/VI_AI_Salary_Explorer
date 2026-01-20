import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { getCategoryColor } from "../../utils/categoryColors";

export default function GlobalDonut({
  data,
  filters,
  applyFilters,
  tooltipRef,
  selectedCategory,
}) {
  const ref = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;
    if (typeof applyFilters !== "function") return;

    drawGlobalDonut();
  }, [data, filters, selectedCategory]);

  function drawGlobalDonut() {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = svg.node().clientWidth;
    const height = 300;
    svg.attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const filtered = applyFilters(data);
    const finalData = selectedCategory
      ? filtered.filter((d) => d.category === selectedCategory)
      : filtered;

    const stats = selectedCategory
      ? Array.from(
          d3.rollup(
            finalData,
            (v) => ({
              count: v.length,
              avg: d3.mean(v, (d) => d.salary_in_euros),
            }),
            (d) => d.employee_residence || d.company_location || "Unknown"
          ),
          ([country, stats]) => ({ country, ...stats })
        )
      : Array.from(
          d3.rollup(
            finalData,
            (v) => ({
              count: v.length,
              avg: d3.mean(v, (d) => d.salary_in_euros),
            }),
            (d) => d.category
          ),
          ([category, stats]) => ({ category, ...stats })
        );

    if (stats.length === 0) {
      g.append("text")
        .text(
          selectedCategory
            ? `No global data for "${selectedCategory}"`
            : "No global data available"
        )
        .attr("text-anchor", "middle")
        .style("fill", "#444");
      return;
    }

    stats.sort((a, b) => d3.descending(a.count, b.count));

    const total = d3.sum(stats, (d) => d.count);

    const outerRadius = Math.min(width, height) / 2 - 30;
    const innerRadius = outerRadius * 0.62;

    const arc = d3.arc()
      .outerRadius(outerRadius)
      .innerRadius(innerRadius);
    
    const arcHover = d3.arc()
      .outerRadius(outerRadius + 8) 
      .innerRadius(innerRadius);

    const pie = d3.pie()
      .sort(null)
      .value((d) => d.count)(stats);

    const countryColor = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(stats.map((d) => d.country || d.category));

    const tooltip = d3.select(tooltipRef.current);

    tooltip.style("position", "fixed")
      .style("pointer-events", "none") 
      .style("background", "rgba(30, 41, 59, 0.95)") 
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.15)")
      .style("color", "white")
      .style("font-family", "sans-serif")
      .style("z-index", 12000);

    g.selectAll("path")
      .data(pie)
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) =>
        selectedCategory
          ? countryColor(d.data.country)
          : getCategoryColor(d.data.category)
      )
      .attr("stroke", "white")
      .attr("stroke-width", 1.6)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arcHover); 
        
        tooltip.style("opacity", 1);
      })
      .on("mousemove", (event, d) => {
        const label = selectedCategory ? d.data.country : d.data.category;
        const percentage = (d.data.count / total * 100).toFixed(1);
        const titleColor = selectedCategory
          ? countryColor(label)
          : getCategoryColor(label);
        const avgSalary = d.data.avg ? `€${Math.round(d.data.avg).toLocaleString()}` : "N/A";
        
        tooltip
          .style("left", `${event.clientX + 14}px`)
          .style("top", `${event.clientY - 40}px`)
          .html(`
            <div style="font-weight:700; color:${titleColor}; margin-bottom:4px; font-size:15px;">
              ${label}
            </div>

            <div style="display:flex; justify-content:space-between; gap:15px;">
              <span style="color:#94a3b8; font-size:13px;">Jobs:</span> 
              <strong style="color:white; font-size:14px;">${d.data.count.toLocaleString()}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; gap:15px;">
              <span style="color:#94a3b8; font-size:13px;">Avg Salary:</span> 
              <strong style="color:white; font-size:14px;">${avgSalary}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; gap:15px;">
              <span style="color:#94a3b8; font-size:13px;">Share:</span> 
              <strong style="color:white; font-size:14px;">${percentage}%</strong>
            </div>
            
            <div style="font-size:10px; margin-top:6px; color:#64748b;">
              ${selectedCategory ? "Global country split" : "Global distribution"}
            </div>
          `);
      })
      .on("mouseleave", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arc);
          
        tooltip.style("opacity", 0);
      });

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -4)
      .style("font-size", "30px")
      .style("font-weight", "700")
      .style("fill", "#1e293b")
      .text(total.toLocaleString());

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 18) 
      .style("font-size", "14px")
      .style("fill", "#475569")
      .text(selectedCategory ? "Global jobs (category)" : "Global Jobs");
  }

  return <svg ref={ref} style={{ width: "100%" }} />;
}
