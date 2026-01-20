import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { getCategoryColor } from "../../utils/categoryColors";

export default function CountryDonut({
  data,
  filters,
  selectedCountry,
  selectedName,
  applyFilters,
  tooltipRef,
  onCategoryClick,
}) {
  const donutRef = useRef();

  const activeYearLabel = filters.year;

  useEffect(() => {
    if (!data || !selectedCountry) return;
    draw();
  }, [data, filters, selectedCountry]);

  function draw() {
    const svg = d3.select(donutRef.current);
    svg.selectAll("*").remove();

    const width = donutRef.current.clientWidth || 380;
    const height = 360;
    const radius = Math.min(width, height) / 2 - 16;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2 - 10})`);

    const filtered = data.filter((d) => {
      const sameYear = +d.work_year === +filters.year;
      const categoryMatch =
        !filters.jobCategory?.length || filters.jobCategory.includes(d.category);
      const roleMatch =
        !filters.jobRole?.length || filters.jobRole.includes(d.job_title);
      const remoteMatch =
        !filters.remoteRatio?.length || filters.remoteRatio.includes(+d.remote_ratio);
      const salaryMatch =
        d.salary_in_euros >= filters.salaryRange[0] &&
        d.salary_in_euros <= filters.salaryRange[1];
      const countryMatch =
        d.employee_residence === selectedCountry ||
        d.company_location === selectedCountry;
      return sameYear && categoryMatch && roleMatch && remoteMatch && countryMatch;
    });

    if (filtered.length === 0) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#888")
        .text(`No data for ${selectedName}`);
      return;
    }

    const stats = Array.from(
      d3.rollup(filtered, v => v.length, d => d.category),
      ([category, count]) => {
        const avgSalary = d3.mean(
          filtered.filter(x => x.category === category),
          x => x.salary_in_euros
        );
        return { category, count, avgSalary };
      }
    ).filter(
      (s) =>
        s.avgSalary >= filters.salaryRange[0] &&
        s.avgSalary <= filters.salaryRange[1]
    );

    if (stats.length === 0) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#888")
        .text(`No data in range for ${selectedName}`);
      return;
    }

    const total = d3.sum(stats, d => d.count);

    const pie = d3.pie().value(d => d.count)(stats);

    const arc = d3.arc()
      .innerRadius(radius * 0.58)
      .outerRadius(radius)
      .cornerRadius(5);
    const arcHover = d3.arc()
      .innerRadius(radius * 0.58)
      .outerRadius(radius + 8)
      .cornerRadius(6);

    const tooltip = d3.select(tooltipRef.current);

    g.selectAll("path")
      .data(pie)
      .join("path")
      .attr("fill", d => getCategoryColor(d.data.category))
      .attr("stroke", "white")
      .attr("stroke-width", 1.8)
      .on("mouseover", function () {
        d3.select(this)
          .transition()
          .duration(140)
          .attr("d", arcHover);
      })
      .on("click", (_, d) => {
        if (onCategoryClick) onCategoryClick(d.data.category);
      })
      .on("mousemove", (event, d) => {
        const salary = d.data.avgSalary
          ? `${Math.round(d.data.avgSalary).toLocaleString()} €`
          : "N/A";

        tooltip
          .style("opacity", 1)
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY + 12}px`)

          .html(`
            <div style="font-weight:600; color:${getCategoryColor(d.data.category)}; margin-bottom:4px;">
              ${d.data.category}
            </div>

            <div style="color:#cbd5e1; font-size:13px;">
              Jobs: <strong style="color:white">${d.data.count}</strong>
            </div>

            <div style="color:#cbd5e1; font-size:13px;">
              Average Salary: <strong style="color:white">${salary}</strong>
            </div>

            <div style="color:#cbd5e1; font-size:13px;">
              Share: <strong style="color:white">
                ${(d.data.count / total * 100).toFixed(1)}%
              </strong>
            </div>

            <div style="color:#94a3b8; font-size:12px; margin-top:6px;">
              Click for global comparison
            </div>
          `);
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget)
          .transition()
          .duration(140)
          .attr("d", arc);
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(850)
      .attrTween("d", function (d) {
        const i = d3.interpolate(d.startAngle, d.endAngle);
        return t => (d.endAngle = i(t), arc(d));
      });

    g.append("text")
      .attr("text-anchor", "middle")
      .style("font-size", "34px")
      .style("font-weight", "700")
      .style("fill", "#111")
      .text(total.toLocaleString());

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 26)
      .style("font-size", "15px")
      .style("fill", "#444")
      .text("Total Jobs");
  }

  return (
  <div
    style={{
      width: "100%",
      marginBottom: "1rem",
      marginRight:"1rem",
      background: "white",
      borderRadius: "14px",
      padding: "1rem",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    <h3
      style={{
        textAlign: "center",
        fontSize: "20px",
        fontWeight: 800,
        color: "#1e2a3b",
        marginBottom: "6px",
      }}
    >
      Job Categories in {selectedName} ({activeYearLabel})
    </h3>

    <svg ref={donutRef} style={{ width: "100%" }}></svg>
  </div>
);

}
