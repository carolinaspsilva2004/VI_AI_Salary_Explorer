import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";

export default function CompanySizeChart({
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

  const sizePalette = {
    S: "#f59e0b", 
    M: "#10b981", 
    L: "#6366f1", 
  };

  const sizeLevels = ["S", "M", "L"];

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    const tooltip = d3
      .select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`);

    svg.selectAll("*").remove();


    let filtered = data;

    if (filters.year !== "ALL")
      filtered = filtered.filter((d) => +d.work_year === +filters.year);

    if (filters.experience?.length)
      filtered = filtered.filter((d) =>
        filters.experience.includes(d.experience_level)
      );

    if (filters.companySize?.length)
      filtered = filtered.filter((d) =>
        filters.companySize.includes(d.company_size)
      );

    if (filters.employmentType?.length)
      filtered = filtered.filter((d) =>
        filters.employmentType.includes(d.employment_type)
      );

    if (filters.remoteRatio?.length)
      filtered = filtered.filter((d) =>
        filters.remoteRatio.includes(+d.remote_ratio)
      );

    if (filters.salaryRange?.length === 2) {
      const [min, max] = filters.salaryRange;
      filtered = filtered.filter(
        (d) => +d.salary_in_euros >= min && +d.salary_in_euros <= max
      );
    }

    const grouped = Array.from(
      d3.rollups(
        filtered,
        (v) => d3.mean(v, (d) => +d.salary_in_euros),
        (d) => d.job_title,
        (d) => d.company_size
      ),
      ([job, sizeMap]) => ({
        job,
        values: Array.from(sizeMap, ([size, salary]) => ({
          size,
          salary,
        })),
      })
    );

    const subset = grouped.filter((j) => visibleRoles.includes(j.job));

    if (subset.length === 0) {
      svg.selectAll("*").remove();
      svg
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

    const jobs = subset.map((d) => d.job);

    const abbreviate = (name) =>
      name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    const abbrev = jobs.map((j) => abbreviate(j));

    setRoleMapping(jobs.map((r, i) => [abbrev[i], r]));

    draw(subset, jobs); 


    function draw(rows, jobTitles) {
      const width = ref.current.getBoundingClientRect().width;
      const height = 500;

      const margin = { top: 20, right: 40, bottom: 120, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange =
        (filters.salaryRange?.[1] ??
        d3.max(rows, (r) => d3.max(r.values, (v) => v.salary))) ||
        0;
      const upperBound = Math.max(maxRange, minRange + 1);

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x0 = d3
        .scaleBand()
        .domain(jobTitles)
        .range([0, innerWidth])
        .padding(0.18);

      const x1 = d3
        .scaleBand()
        .domain(sizeLevels)
        .range([0, x0.bandwidth()])
        .padding(0.15);

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
            .tickFormat((d) => d.length > 15 ? d.substring(0, 13) + "..." : d)
        );

      xAxis.select(".domain").remove();
      xAxis
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px") 
        .style("cursor", "pointer")
        .style("fill", "#64748b")
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
          d3
            .axisLeft(y)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat((d) => `€${d / 1000}k`)
        );

      yAxis.select(".domain").remove();
      yAxis
        .selectAll("line")
        .attr("stroke", "#f1f5f9")
        .attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      g.selectAll(".role-group")
        .data(rows)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.job)},0)`) 
        .selectAll("rect")
        .data((d) =>
          d.values.map((v) => ({
            role: d.job,
            size: v.size,
            salary: v.salary,
          }))
        )
        .enter()
        .append("rect")
        .attr("x", (d) => x1(d.size))
        .attr("y", (d) => y(d.salary))
        .attr("width", x1.bandwidth())
        .attr("height", (d) => innerHeight - y(d.salary))
        .attr("fill", (d) => sizePalette[d.size])
        .attr("rx", 3)
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
               <div style="margin-top:4px"><b>${d.size}</b> → €${Math.round(
                d.salary
              ).toLocaleString()}</div>`
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


      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 65}, ${margin.top})`);

      sizeLevels.forEach((lvl, i) => {
        const fullLabel = lvl === 'S' ? 'Small' : lvl === 'M' ? 'Medium' : 'Large';
        legend
          .append("rect")
          .attr("x", 0)
          .attr("y", i * 18)
          .attr("width", 12)
          .attr("height", 12)
          .attr("rx", 2)
          .attr("fill", sizePalette[lvl]);

        legend
          .append("text")
          .attr("x", 20)
          .attr("y", i * 18 + 10)
          .style("font-size", "12px")
          .style("fill", "#475569")
          .text(`${lvl} (${fullLabel})`); 
      });
    }
  }, [
    data,
    loading,
    filters,
    visibleRoles,
    highlightedRole,
    onRoleClick,
  ]);

  return (
    <div className={styles.chartContainer}>
     <div className={styles.headerAligned}>
  
      <div className={styles.yearLeft}>{filters.year}</div>

      <div className={styles.titleCenterSingleLine} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 className={styles.title} style={{ margin: 0 }}>Average Salary by Company Size</h3>

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
            S, M, L correspond to <b>Small</b>, <b>Medium</b>, and{" "}
            <b>Large</b> companies.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Role abbreviations:</strong>
          </p>
          {roleMapping.map(([abbr, full]) => (
            <p key={abbr} style={{ marginBottom: 2 }}>
              <b>{abbr}</b> = {full}
            </p>
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
