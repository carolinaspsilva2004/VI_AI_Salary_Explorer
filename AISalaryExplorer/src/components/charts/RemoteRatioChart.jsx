import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";

export default function RemoteRatioChart({
  filters,
  visibleRoles,
  highlightedRole,
  onRoleClick,
  onClearRoleFilter,
  onRequestGeoView,
}) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();

  const [showInfo, setShowInfo] = useState(false);
  const [roleMapping, setRoleMapping] = useState([]);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [selectedGeoRole, setSelectedGeoRole] = useState(null);

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = d3
      .select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`);

    let filtered = data.map((d) => ({
      work_year: +d.work_year,
      job_title: d.job_title?.trim(),
      salary_in_euros: +d.salary_in_euros,
      remote_ratio: +d.remote_ratio,
      company_size: d.company_size?.trim(),
      experience_level: d.experience_level?.trim(),
      employment_type: d.employment_type?.trim(),
      employee_residence: d.employee_residence?.trim(),
      company_location: d.company_location?.trim(),
      category: d.category?.trim(),
    }));

    if (filters.year !== "ALL")
      filtered = filtered.filter((d) => d.work_year === +filters.year);

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
        filters.remoteRatio.includes(d.remote_ratio)
      );

    if (filters.salaryRange?.length === 2) {
      filtered = filtered.filter(
        (d) =>
          d.salary_in_euros >= filters.salaryRange[0] &&
          d.salary_in_euros <= filters.salaryRange[1]
      );
    }

    if (filters.country?.length)
      filtered = filtered.filter((d) =>
        filters.country.includes(d.company_location)
      );

    if (filters.employmentResidence?.length)
      filtered = filtered.filter((d) =>
        filters.employmentResidence.includes(d.employee_residence)
      );

    if (filters.jobCategory?.length)
      filtered = filtered.filter((d) =>
        filters.jobCategory.includes(d.category)
      );

   
    const grouped = Array.from(
      d3.rollup(
        filtered,
        (v) => d3.mean(v, (d) => d.salary_in_euros),
        (d) => d.job_title,
        (d) => d.remote_ratio
      ),
      ([job, values]) => ({
        job,
        values: Array.from(values, ([rr, avg]) => ({ rr, avg })),
      })
    );

    const subset = grouped.filter((d) => visibleRoles.includes(d.job));

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

    const jobTitles = subset.map((d) => d.job);
    
    const abbrev = jobTitles.map((l) =>
      l
        .split(" ")
        .map((w) => w[0].toUpperCase())
        .join("")
    );

    setRoleMapping(jobTitles.map((t, i) => [abbrev[i], t]));

    draw(subset, jobTitles);

    function draw(dataFormatted, jobTitles) {
      const width = ref.current.getBoundingClientRect().width;
      const height = 500;

      const margin = { top: 20, right: 50, bottom: 90, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange = filters.salaryRange?.[1] ?? (d3.max(dataFormatted, (d) =>
        d3.max(d.values, (v) => v.avg)
      ) || 0);
      const upperBound = Math.max(maxRange, minRange + 1);

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const remoteLevels = [0, 50, 100];
      const remoteLabels = {
        0: "On-site: 0%",
        50: "Hybrid: 50%",
        100: "Remote: 100%",
      };

      const color = d3
        .scaleOrdinal()
        .domain(remoteLevels)
        .range(["#a370e6ff", "#10b981", "#6366f1"]); 

      const x0 = d3.scaleBand()
        .domain(jobTitles) 
        .range([0, innerWidth])
        .padding(0.1);

      const x1 = d3
        .scaleBand()
        .domain(remoteLevels)
        .range([0, x0.bandwidth()])
        .padding(0.2);

      const y = d3
        .scaleLinear()
        .domain([minRange, upperBound])
        .range([innerHeight, 0]);

      const xAxis = g
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(
            d3.axisBottom(x0).tickSize(0)
            .tickFormat((d) => d.length > 15 ? d.substring(0, 13) + "..." : d) 
        )
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("font-size", "10px") 
        .style("cursor", "pointer")
        .style("fill", "#475569")
        .on("click", (event, d) => {
          if (highlightedRole === d) onClearRoleFilter();
          else onRoleClick(d);
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
          d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat((d) => `€${d / 1000}k`)
        );

      yAxis.select(".domain").remove();
      yAxis.selectAll("line").attr("stroke", "#e2e8f0").attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      g.selectAll(".job-group")
        .data(dataFormatted)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.job)}, 0)`) 
        .selectAll("rect")
        .data((d) =>
          remoteLevels.map((rr) => ({
            job: d.job,
            rr,
            avg: d.values.find((v) => v.rr === rr)?.avg ?? minRange,
          }))
        )
        .enter()
        .append("rect")
        .attr("x", (d) => x1(d.rr))
        .attr("y", (d) => y(d.avg))
        .attr("width", x1.bandwidth())
        .attr("height", (d) => innerHeight - y(d.avg))
        .attr("fill", (d) => color(d.rr))
        .style("cursor", "pointer")
        .style("opacity", (d) =>
          highlightedRole && highlightedRole !== d.job ? 0.15 : 1
        )
        .on("mousemove", (event, d) => {
          const rect = ref.current.getBoundingClientRect();
          tooltip
            .style("opacity", 1)
            .html(
              `<div style="font-weight:600">${d.job}</div>
               <div>${remoteLabels[d.rr]}</div>
               <div style="font-weight:bold; margin-top:4px">€${Math.round(
                 d.avg
               ).toLocaleString()}</div>`
            )
            .style("left", `${event.clientX - rect.left + 10}px`)
            .style("top", `${event.clientY - rect.top - 10}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0))
        .on("click", (_, d) => {
          if (highlightedRole === d.job) onClearRoleFilter();
          else onRoleClick(d.job);
        });

      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 100}, ${margin.top})`);

      remoteLevels.forEach((rr, i) => {
        legend
          .append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 12)
          .attr("height", 12)
          .attr("rx", 2)
          .attr("fill", color(rr));

        legend
          .append("text")
          .attr("x", 20)
          .attr("y", i * 20 + 10)
          .style("font-size", "12px")
          .style("fill", "#475569")
          .text(remoteLabels[rr]);
      });
    }
  }, [
    data,
    loading,
    filters,
    visibleRoles,
    highlightedRole,
    onRoleClick,
    onClearRoleFilter,
  ]);

  return (
    <div className={styles.chartContainer}>
<div className={styles.headerAligned}>
  
  <div className={styles.yearLeft}>{filters.year}</div>

      <div className={styles.titleCenterSingleLine} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h3 className={styles.title} style={{ margin: 0 }}>Salary by Work Arrangement</h3>

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
            Compares the average salary of each role when it is on-site, hybrid, or fully remote.
          </p>
        </div>
      )}

      <svg ref={ref} width="100%" height="500"></svg>
      <div ref={tooltipRef} className={styles.tooltip}></div>

      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
        <button
          className={styles.clearButtonBottom}
          style={{ background: "#0f172a", color: "white", border: "1px solid #1e293b" }}
          onClick={() => {
            const rolesList = filters.jobRole?.length ? filters.jobRole : visibleRoles;
            setSelectedGeoRole(rolesList[0] || null);
            setShowGeoModal(true);
          }}
          disabled={
            !(filters.jobRole?.length || visibleRoles?.length)
          }
        >
          Ver distribuição global
        </button>
      </div>

      {showGeoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255, 255, 255, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setShowGeoModal(false)}
        >
          <div
            style={{
              width: "360px",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "14px",
              padding: "18px 20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 16px 50px rgba(15,23,42,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 12px 0" }}>Ver no mapa</h4>
            <p style={{ margin: "0 0 12px 0", color: "#475569" }}>
              Escolha um dos roles filtrados para ver a distribuição global.
            </p>

            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
              }}
            >
              { (filters.jobRole?.length ? filters.jobRole : visibleRoles)?.map((role) => (
                <label
                  key={role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: selectedGeoRole === role ? "#eef2ff" : "transparent",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <input
                    type="radio"
                    name="geoRole"
                    value={role}
                    checked={selectedGeoRole === role}
                    onChange={() => setSelectedGeoRole(role)}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <button
                className={styles.clearButtonBottom}
                style={{ background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0" }}
                onClick={() => setShowGeoModal(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.clearButtonBottom}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "1px solid #1d4ed8",
                  opacity: selectedGeoRole ? 1 : 0.5,
                  cursor: selectedGeoRole ? "pointer" : "not-allowed",
                }}
                disabled={!selectedGeoRole}
                onClick={() => {
                  if (!selectedGeoRole) return;
                  if (onRequestGeoView) onRequestGeoView(selectedGeoRole);
                  setShowGeoModal(false);
                }}
              >
                Ver no mapa
              </button>
            </div>
          </div>
        </div>
      )}

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
