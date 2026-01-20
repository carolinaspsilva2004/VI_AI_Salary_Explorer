import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";

export default function JobRoleEvolutionChart({
  filters,
  visibleRoles,
  highlightedRole,
  onRoleClick,
  onClearRoleFilter,
  onYearSelect,
}) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();

  const [showInfo, setShowInfo] = useState(false);
  const [svgHeight, setSvgHeight] = useState(500);

  const [isSliderMode, setIsSliderMode] = useState(false);
  const [internalYear, setInternalYear] = useState(filters.year);
  const allRoles = useMemo(
    () =>
      data && Array.isArray(data)
        ? Array.from(new Set(data.map((d) => d.job_title))).sort()
        : [],
    [data]
  );

  const palette = [
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#6366f1",
    "#0ea5e9",
    "#2563eb",
    "#06b6d4",
    "#8b5cf6",
  ];

  // ------------------------------------------------------------------
  // MAIN EFFECT
  // ------------------------------------------------------------------
  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    d3.select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", styles.tooltip);

    let filtered = data.filter((d) => visibleRoles.includes(d.job_title));

    if (filters.experience.length)
      filtered = filtered.filter((d) =>
        filters.experience.includes(d.experience_level)
      );

    if (filters.companySize.length)
      filtered = filtered.filter((d) =>
        filters.companySize.includes(d.company_size)
      );

    if (filters.employmentType.length)
      filtered = filtered.filter((d) =>
        filters.employmentType.includes(d.employment_type)
      );

    if (filters.remoteRatio.length)
      filtered = filtered.filter((d) =>
        filters.remoteRatio.includes(+d.remote_ratio)
      );

    const [minSal, maxSal] = filters.salaryRange;
    filtered = filtered.filter(
      (d) => +d.salary_in_euros >= minSal && +d.salary_in_euros <= maxSal
    );

    if (filtered.length === 0) {
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

    const grouped = d3.groups(
      filtered,
      (d) => d.job_title,
      (d) => +d.work_year
    );

    const formatted = grouped.map(([job, yearGroup]) => ({
      job,
      values: yearGroup
        .map(([year, rows]) => ({
          year,
          avg: d3.mean(rows, (d) => +d.salary_in_euros),
        }))
        .sort((a, b) => a.year - b.year),
    }));

    draw(formatted);
  }, [
    data,
    loading,
    filters,
    visibleRoles,
    highlightedRole,
    isSliderMode,
  ]);

  // ------------------------------------------------------------------
  // DRAW
  // ------------------------------------------------------------------
  function draw(dataset) {
    const tooltip = d3.select(tooltipRef.current);
    const container = ref.current.getBoundingClientRect();
    const width = container.width;

    const margin = { top: 20, right: 60, bottom: 40, left: 70 };
    const innerHeightTarget = 260;

    const svg = d3.select(ref.current)
      .attr("width", width);

    svg.selectAll("*").remove();

    const innerWidth = width - margin.left - margin.right;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = [...new Set(dataset.flatMap((d) => d.values.map((v) => v.year)))].sort();

    const x = d3.scalePoint().domain(years).range([0, innerWidth]);

    const minRange = filters.salaryRange?.[0] ?? 0;
    const maxRange =
      (filters.salaryRange?.[1] ??
      d3.max(dataset, (d) => d3.max(d.values, (v) => v.avg))) ||
      0;
    const upperBound = Math.max(maxRange, minRange + 1);

    const y = d3.scaleLinear()
      .domain([minRange, upperBound])
      .range([innerHeightTarget, 0]);

    const color = d3.scaleOrdinal().domain(allRoles).range(palette);

    // AXIS
    g.append("g")
      .attr("transform", `translate(0,${innerHeightTarget})`)
      .call(d3.axisBottom(x).tickPadding(10).tickSize(0))
      .select(".domain")
      .remove();

    g.selectAll(".tick text")
      .style("fill", "#64748b")
      .style("font-size", "12px")
      .style("font-weight", "500");

    const yAxis = g
      .append("g")
      .call(
        d3.axisLeft(y)
          .ticks(6)
          .tickSize(-innerWidth)
          .tickFormat((d) => `€${d / 1000}k`)
      );

    yAxis.select(".domain").remove();
    yAxis.selectAll(".tick line")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-dasharray", "4");

    const line = d3.line()
      .x((d) => x(d.year))
      .y((d) => y(d.avg))
      .curve(d3.curveMonotoneX);

    const active = highlightedRole;

    const groups = g
      .selectAll(".line-group")
      .data(dataset)
      .enter()
      .append("g")
      .attr("class", "line-group")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        if (d.job === highlightedRole) onClearRoleFilter();
        else onRoleClick(d.job);
      });

    groups
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.job))
      .attr("stroke-width", (d) => (active === d.job ? 4 : 2.5))
      .attr("opacity", (d) => (active && active !== d.job ? 0.15 : 1))
      .attr("d", (d) => line(d.values));

    
    groups
      .selectAll("circle")
      .data((d) => d.values.map((v) => ({ ...v, job: d.job })))
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.avg))
      .attr("r", 4)
      .attr("fill", "white")
      .attr("stroke", (d) => color(d.job))
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        if (isSliderMode) return;

        const rect = ref.current.getBoundingClientRect();

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="font-weight:600; color:${color(d.job)}">${d.job}</div>
            <div>Year: ${d.year}</div>
            <div style="font-size:1.1em; font-weight:bold">
              €${Math.round(d.avg).toLocaleString()}
            </div>
            <div style="font-size:0.8em; color:#999; margin-top:4px">
              Click to highlight
            </div>
          `)
          .style("left", `${event.clientX - rect.left + 10}px`)
          .style("top", `${event.clientY - rect.top - 10}px`);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

 
    if (isSliderMode) {
      let current = filters.year === "ALL" ? years[years.length - 1] : filters.year;

      const slider = g
        .append("g")
        .attr("class", "slider-year")
        .attr("transform", `translate(${x(current)}, 0)`)
        .style("cursor", "grab");

      slider.append("line")
        .attr("y1", -10)
        .attr("y2", innerHeightTarget)
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4");

      slider.append("rect")
        .attr("x", -22)
        .attr("y", -32)
        .attr("width", 44)
        .attr("height", 22)
        .attr("rx", 6)
        .attr("fill", "#2563eb");

      slider.append("text")
        .attr("x", 0)
        .attr("y", -17)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "12px")
        .text(current);

      slider.append("rect")
        .attr("x", -30)
        .attr("y", 0)
        .attr("width", 60)
        .attr("height", innerHeightTarget)
        .attr("fill", "transparent");

      const drag = d3
        .drag()
        .on("start", () => slider.style("cursor", "grabbing"))
        .on("drag", (event) => {
          const mouseX = event.x - margin.left;
          const closest = years.reduce((p, c) =>
            Math.abs(x(c) - mouseX) < Math.abs(x(p) - mouseX) ? c : p
          );

          slider.attr("transform", `translate(${x(closest)},0)`);
          slider.select("text").text(closest);

          current = closest;
        })
        .on("end", () => {
          slider.style("cursor", "grab");
          if (current !== filters.year) {
            onYearSelect(current);
            setInternalYear(current);
          }
        });

      slider.call(drag);
    }

   
    const legendItemHeight = 26;
    const legendCols = 2;

    const maxLegendTextWidth = d3.max(dataset, (d) => d.job.length * 7.2);
    const maxColWidth = innerWidth * 0.48;
    const neededWidth = maxLegendTextWidth + 30;
    const dynamicLegendColWidth = Math.min(maxColWidth, neededWidth);

    const legendRows = Math.ceil((dataset.length * dynamicLegendColWidth) / innerWidth);

    const LEGEND_TOP_SPACING = 55;
    const legendStartY = margin.top + innerHeightTarget + LEGEND_TOP_SPACING;

    const legendHeight = legendRows * legendItemHeight + 20;

    const BUTTONS_AREA = 70;
    const finalHeight = legendStartY + legendHeight + BUTTONS_AREA;

    svg.attr("height", finalHeight);
    setSvgHeight(finalHeight);

    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${legendStartY})`);

    dataset.forEach((d, i) => {
      const col = i % legendCols;
      const row = Math.floor(i / legendCols);

      const xPos = col * dynamicLegendColWidth;
      const yPos = row * legendItemHeight;

      const item = legend
        .append("g")
        .attr("transform", `translate(${xPos}, ${yPos})`);

      item.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(d.job))
        .attr("rx", 2);

      item.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("font-size", "12px")
        .style("fill", "#475569")
        .text(d.job)
        .attr("alignment-baseline", "middle");
    });
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.headerAligned}>
        <div className={styles.titleCenterSingleLine}>
          <h3 className={styles.title}>AI Job Roles Salary Evolution (2020–2025)</h3>

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
          <p>Tracks how the average salary evolves across the years for each job role.</p>
          <p>Click a line to highlight it.</p>
        </div>
      )}

      <div ref={tooltipRef} className={styles.tooltip}></div>

      <svg ref={ref} width="100%" height={svgHeight}></svg>

      <div
        style={{
          position: "absolute",
          bottom: "18px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "12px",
          zIndex: 10,
        }}
      >
        <button
          onClick={onClearRoleFilter}
          disabled={!highlightedRole}
          className={styles.clearButtonBottom}
          style={{
            width: "150px",
            opacity: highlightedRole ? 1 : 0.5,
            cursor: highlightedRole ? "pointer" : "default",
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          Clear Highlight
        </button>

        <button
          onClick={() => {
            const newMode = !isSliderMode;
            setIsSliderMode(newMode);
            if (!newMode) onYearSelect("ALL");
          }}
          style={{
            width: "150px",
            background: isSliderMode ? "#444b55ff" : "#2563eb",
            color: "white",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {isSliderMode ? "Clear Filter" : "Enable Year Filter"}
        </button>
      </div>
    </div>
  );
}
