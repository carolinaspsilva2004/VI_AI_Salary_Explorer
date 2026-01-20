import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";

export default function JobRoleExperienceChart({
  filters,
  visibleRoles,
  highlightedRole,
  onRoleClick,
  onClearRoleFilter,
}) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();
  const [showInfo, setShowInfo] = useState(false);
  const [roleMapping, setRoleMapping] = useState([]);

  const expPalette = {
    EN: "#38bdf8",
    MI: "#2563eb",
    SE: "#7c3aed",
    EX: "#f97316",
  };

  const expLabels = {
    EN: "Entry-level",
    MI: "Mid-level",
    SE: "Senior",
    EX: "Executive",
  };

  const defaultExpLevels = ["EN", "MI", "SE", "EX"];
  const getExpLabel = (code) => expLabels[code] || code;
  const getLegendLabel = (code) => {
    const label = getExpLabel(code);
    return label.length > 12 ? `${label.slice(0, 10)}...` : label;
  };

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    const tooltip = d3
      .select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`);

    svg.selectAll("*").remove();

    const activeExpLevels =
      filters.experience?.length ? filters.experience : defaultExpLevels;

    let filtered = data
      .map((d) => ({
        work_year: +d.work_year,
        job_title: d.job_title?.trim(),
        experience: d.experience_level?.trim(),
        salary: +d.salary_in_euros,
      }))
      .filter((d) => !isNaN(d.salary));

    filtered = filtered.filter((d) => activeExpLevels.includes(d.experience));

    if (filters.year !== "ALL") {
      filtered = filtered.filter((d) => d.work_year === +filters.year);
    }

    const grouped = d3.rollups(
      filtered,
      (v) => d3.mean(v, (d) => d.salary),
      (d) => d.job_title,
      (d) => d.experience
    );

    const formatted = grouped.map(([job_title, expMap]) => {
      const obj = { job_title };
      expMap.forEach(([exp, val]) => (obj[exp] = val));
      return obj;
    });

    const subset = formatted.filter((d) =>
      visibleRoles.includes(d.job_title)
    );

    if (subset.length === 0) {
      const svgEmpty = d3.select(ref.current);
      svgEmpty.selectAll("*").remove();
      svgEmpty
        .attr("width", "100%")
        .attr("height", 200)
        .append("text")
        .attr("x", 20)
        .attr("y", 60)
        .style("fill", "#64748b")
        .style("font-size", "14px")
        .text("No data for the selected filters.");
      return;
    }

    const jobTitles = subset.map((d) => d.job_title);
    
    const abbreviate = (arr) =>
      arr.map((txt) =>
        txt
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
      );
    const abbrev = abbreviate(jobTitles);
    setRoleMapping(jobTitles.map((t, i) => [abbrev[i], t]));


    draw(subset, jobTitles); 

    function draw(rows, jobTitles) {
      const container = ref.current.getBoundingClientRect();
      const width = container.width;
      const height = 500;
      const margin = { top: 20, right: 40, bottom: 120, left: 70 };

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg
        .append("g")
        .attr(
          "transform",
          `translate(${margin.left},${margin.top})`
        );

      const x0 = d3
        .scaleBand()
        .domain(jobTitles)
        .range([0, innerWidth])
        .padding(0.18);

      const x1 = d3
        .scaleBand()
        .domain(activeExpLevels)
        .range([0, x0.bandwidth()])
        .padding(0.15);

      const minRange = filters.salaryRange?.[0] ?? 0;
      const dataMax =
        d3.max(rows, (r) =>
          d3.max(activeExpLevels, (lvl) => r[lvl] || 0)
        ) || 0;
      const maxRangeCandidate = filters.salaryRange?.[1] ?? dataMax;
      const upperBound = Math.max(dataMax, maxRangeCandidate, minRange + 1) * 1.05;

      const y = d3
        .scaleLinear()
        .domain([minRange, upperBound])
        .range([innerHeight, 0]);

      const xAxis = g
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x0)
            .tickPadding(4)
            .tickSize(0)
            .tickFormat(d => d.length > 15 ? d.substring(0, 13) + "..." : d)
        );

      xAxis.select(".domain").remove();
      const xAxisLabels = xAxis
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px") 
        .style("fill", "#64748b")
        .style("cursor", "pointer")
        .attr("dy", "0.2em")
        .attr("dx", "-0.2em")
        .on("click", (_, role) => {
          if (highlightedRole === role) onClearRoleFilter();
          else onRoleClick(role);
        })
        
        .on("mousemove", function(event, d) {
          const rect = ref.current.getBoundingClientRect();
          tooltip
            .style("opacity", 1)
            .html(`
                <div style="font-weight:600; color:#cbd5e1; margin-bottom:2px">
                    ${d}
                </div>
                <div style="font-size:0.75em; color:#94a3b8;">
                    Click to filter
                </div>
            `)
            .style("left", `${event.clientX - rect.left + 15}px`)
            .style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));


      const yAxis = g
        .append("g")
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat((d) => `€${d / 1000}k`)
        );

      yAxis.select(".domain").remove();
      yAxis.selectAll("line")
        .attr("stroke", "#f1f5f9")
        .attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      const groups = g
        .selectAll(".role-group")
        .data(rows)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.job_title)},0)`); 

      groups
      .selectAll("rect")
      .data((d) =>
        activeExpLevels.filter((lvl) => d[lvl]).map((lvl) => ({
          key: lvl,
          role: d.job_title,
          value: d[lvl],
        }))
      )
      .enter()
      .append("rect")
      .attr("x", (d) => x1(d.key))
      .attr("y", (d) => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => innerHeight - y(d.value))
      .attr("rx", 3)
      .attr("fill", (d) => expPalette[d.key])
      .style("cursor", "pointer")
      .style("fill-opacity", (d) =>
        highlightedRole && highlightedRole !== d.role ? 0.15 : 1
      )

      .on("click", (_, d) => {
        if (highlightedRole === d.role) onClearRoleFilter();
        else onRoleClick(d.role);
      })

      .on("mousemove", (event, d) => {
        const rect = ref.current.getBoundingClientRect();

        tooltip
          .style("opacity", 1)
          .html(
            `<div style="font-weight:600">${d.role}</div>
            <div><b>${getExpLabel(d.key)}</b> → €${Math.round(d.value).toLocaleString()}</div>`
          )
          .style("left", `${event.clientX - rect.left + 12}px`)
          .style("top", `${event.clientY - rect.top - 12}px`);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 40)
        .attr("text-anchor", "middle")
        .style("fill", "#64748b")
        .style("font-size", "12px")
        .text("Job Roles");

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", 18)
        .style("fill", "#64748b")
        .style("font-size", "12px")
        .text("Average Salary (€)");

      const legendX = Math.max(margin.left, width - margin.right - 100);
      const legend = svg
        .append("g")
        .attr("transform", `translate(${legendX}, ${margin.top})`);

      const legendItems = legend
        .selectAll(".legend-item")
        .data(activeExpLevels)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (_, i) => `translate(0, ${i * 18})`);

      legendItems
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", (d) => expPalette[d])
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          const rect = ref.current.getBoundingClientRect();
          tooltip
            .style("opacity", 1)
            .html(`<div style="font-weight:600; color:#cbd5e1">${getExpLabel(d)}</div>`)
            .style("left", `${event.clientX - rect.left + 12}px`)
            .style("top", `${event.clientY - rect.top - 12}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));

      legendItems
        .append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("font-size", "12px")
        .style("fill", "#475569")
        .text((d) => getLegendLabel(d))
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          const rect = ref.current.getBoundingClientRect();
          tooltip
            .style("opacity", 1)
            .html(`<div style="font-weight:600; color:#cbd5e1">${getExpLabel(d)}</div>`)
            .style("left", `${event.clientX - rect.left + 12}px`)
            .style("top", `${event.clientY - rect.top - 12}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    }
  }, [data, loading, filters, visibleRoles, highlightedRole]);

  return (
    <div className={styles.chartContainer}>

      <div className={styles.headerAligned}>
        <div className={styles.yearLeft}>{filters.year}</div>

        <div className={styles.titleCenterSingleLine} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 className={styles.title} style={{ margin: 0 }}>Salary by Experience Level per Role</h3>
          
          <Info
            size={16}
            className={styles.infoIcon}
            onClick={() => setShowInfo((s) => !s)}
          />
        </div>

        <div className={styles.placeholderRight}></div>
      </div>

      {showInfo && (
        <div className={styles.infoPopup}>
          <p>
            Shows average salary per job role across experience levels.
          </p>
          {roleMapping.length > 0 && <p style={{ marginTop: "8px" }}><strong>Abbreviations:</strong></p>}
          {roleMapping.map(([a, full]) => (
            <p key={a} style={{ marginBottom: 2 }}><b>{a}</b> = {full}</p>
          ))}
        </div>
      )}

      <svg ref={ref} width="100%" height="500"></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div>

      {highlightedRole && (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "2px",
          }}
        >
          <button
            className={styles.clearButtonBottom}
            onClick={onClearRoleFilter}
          >
            Clear Filter: {highlightedRole}
          </button>
        </div>
      )}

    </div>
  );
}
