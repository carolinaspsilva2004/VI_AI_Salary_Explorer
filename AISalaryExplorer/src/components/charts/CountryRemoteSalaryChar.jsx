import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useData } from "../../context/DataContext";
import { Info } from "lucide-react";
import styles from "../../css/charts.module.css";
import { COUNTRY_NAMES } from "../../utils/countryNames";

export default function CountryRemoteSalaryChart({ filters }) {
  const { data, loading } = useData();
  const ref = useRef();
  const tooltipRef = useRef();
  const [showInfo, setShowInfo] = useState(false);
  const titleColor = "#000000";

  useEffect(() => {
    if (loading || !data || data.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const tooltip = d3.select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`); // Estilo escuro

    let filtered = data;

    if (filters.year !== "ALL")
      filtered = filtered.filter(d => +d.work_year === +filters.year);

    if (filters.salaryRange?.length === 2) {
      const [min, max] = filters.salaryRange;
      filtered = filtered.filter(
        d => +d.salary_in_euros >= min && +d.salary_in_euros <= max
      );
    }

    if (filters.country && filters.country.length > 0)
      filtered = filtered.filter(d =>
        filters.country.includes(d.company_location)
      );

    const remoteTypes =
      filters.remoteRatio && filters.remoteRatio.length > 0
        ? [...filters.remoteRatio].map(Number).sort((a, b) => a - b)
        : [0, 50, 100];

    if (remoteTypes.length > 0) {
      filtered = filtered.filter(d =>
        remoteTypes.includes(+d.remote_ratio)
      );
    }

    if (filtered.length === 0) {
      svg.append("text").attr("x", 20).attr("y", 40).style("fill", "#64748b").text("No data for selected filters.");
      return;
    }

    const grouped = Array.from(
      d3.rollups(
        filtered,
        v => d3.mean(v, d => +d.salary_in_euros),
        d => d.company_location,
        d => +d.remote_ratio
      ),
      ([countryCode, ratioMap]) => {
        const map = new Map(ratioMap);
        return {
          country: COUNTRY_NAMES[countryCode] ?? countryCode,
          originalCode: countryCode,
          values: remoteTypes.map(r => ({
            type: r,
            salary: map.get(r) ?? 0,
          })),
        };
      }
    );

    const countries = grouped.map(d => d.country);

    drawChart(grouped);

    function drawChart(dataset) {
      const container = ref.current.getBoundingClientRect();
      const width = container.width;
      const height = 420;

      const margin = { top: 20, right: 120, bottom: 100, left: 70 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x0 = d3.scaleBand()
        .domain(countries)
        .range([0, innerWidth])
        .paddingInner(0.25);

      const x1 = d3.scaleBand()
        .domain(remoteTypes)
        .range([0, x0.bandwidth()])
        .padding(0.1);

      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange = (filters.salaryRange?.[1] ?? d3.max(dataset, d => d3.max(d.values, v => v.salary))) || 0;
      const upperBound = maxRange || minRange + 1;

      const y = d3.scaleLinear()
        .domain([minRange, upperBound])
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal()
  .domain([0, 50, 100])
  .range(["#1e3a8a", "#3b82f6", "#10b981"]);

      const xAxisGroup = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0).tickSize(0).tickPadding(8));

      xAxisGroup.select(".domain").remove(); 

      xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.2em")
        .attr("dy", "0.2em")
        .style("font-size", "10px")
        .style("font-weight", "500")
        .style("fill", "#64748b"); 

      const yAxis = g.append("g")
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat(d => `€${d / 1000}k`)
        );

      yAxis.select(".domain").remove();
      yAxis.selectAll("line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4");
      yAxis.selectAll("text").style("fill", "#94a3b8");

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text("Average Salary (EUR)");

      const groups = g.selectAll(".country")
        .data(dataset)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x0(d.country)},0)`);

      groups.selectAll("rect")
        .data(d => d.values)
        .enter()
        .append("rect")
        .attr("x", d => x1(d.type))
        .attr("y", d => y(d.salary))
        .attr("width", x1.bandwidth())
        .attr("height", d => innerHeight - y(d.salary))
        .attr("fill", d => color(d.type))
        .attr("rx", 3) 
        .style("cursor", "help")
        .on("mousemove", function(event, d) {
          const box = ref.current.getBoundingClientRect();
          const parentData = d3.select(this.parentNode).datum();

          d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);

          tooltip
            .style("opacity", 1)
            .html(`
              <div style="font-weight:600; color:${color(d.type)}; margin-bottom:2px">
                ${parentData.country}
              </div>

              <div style="font-size:0.8em; color:#94a3b8; margin-bottom:2px">
                Remote Type: ${
                  d.type === 0 ? "On-site (0%)" :
                  d.type === 50 ? "Hybrid (50%)" :
                  "Remote (100%)"
                }
              </div>

              <div style="font-weight:bold; font-size:1.05em; margin-top:4px;">
                €${Math.round(d.salary).toLocaleString()}
              </div>
            `)
            .style("left", `${event.clientX - box.left + 15}px`)
            .style("top", `${event.clientY - box.top - 10}px`);
        })
        .on("mouseleave", function() {
          d3.select(this).attr("stroke", "none");
          tooltip.style("opacity", 0);
        });

      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 15)
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text("Company Location");


      const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 5})`);

      legend.append("text")
        .text("Remote Ratio:")
        .attr("font-size", "11px")
        .attr("fill", "#64748b")
        .attr("y", 0);

      [
        { t: 100, label: "Remote (100%)" },
        { t: 50, label: "Hybrid (50%)" },
        { t: 0, label: "On-site (0%)" },
      ].forEach((d, i) => {
        if (!remoteTypes.includes(d.t)) return;

        const offset = 20; 

        legend.append("rect")
          .attr("x", 0)
          .attr("y", i * 20 + offset)
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", color(d.t))
          .attr("rx", 3);

        legend.append("text")
          .attr("x", 18)
          .attr("y", i * 20 + 10 + offset)
          .attr("font-size", 12)
          .style("fill", "#64748b")
          .text(d.label);
      });
    }

  }, [data, loading, filters]);

  return (
    <div className={styles.chartContainer} style={{ paddingTop: "48px" }}>
      <div
        className={styles.yearBadge}
        onMouseMove={(e) => {
          const tooltip = document.getElementById("countryRemoteYearTooltip");
          if (!tooltip) return;
          tooltip.style.opacity = 1;
          tooltip.style.visibility = "visible";
          tooltip.style.left = e.clientX + 15 + "px";
          tooltip.style.top = e.clientY + 15 + "px";
          tooltip.innerHTML = `
            <div style="font-weight:600; color:#60a5fa; margin-bottom:4px;">
              Filter Active
            </div>
            <div>Displaying data for year <b>${filters.year}</b></div>
          `;
        }}
        onMouseLeave={() => {
          const tooltip = document.getElementById("countryRemoteYearTooltip");
          if (tooltip) {
            tooltip.style.opacity = 0;
            tooltip.style.visibility = "hidden";
          }
        }}
      >
        {filters.year}
      </div>

      <div className={styles.header}>
        <div style={{ textAlign: 'center' }}>
          <h3 className={styles.title} style={{ color: titleColor }}>
            Average Salary by Remote Ratio and Company Location
          </h3>
        </div>

        <button
          className={styles.infoButton}
          onClick={() => setShowInfo(s => !s)}
        >
          <Info size={16} strokeWidth={2} />
        </button>

        {showInfo && (
          <div className={styles.infoPopup}>
            <p style={{ marginBottom: 6 }}>
              Average salary (€) by company location, split by remote ratio: On-site (0%), Hybrid (50%), and Remote (100%).
            </p>
            <p>
              Bar colors match the remote ratio; hover a bar to see the exact value.
            </p>
          </div>
        )}
      </div>

      <svg ref={ref} height="420" width="100%"></svg>
      <div ref={tooltipRef} className={`${styles.tooltip} ${styles.darkModeTooltip}`}></div>
      <div id="countryRemoteYearTooltip" className={styles.yearTooltip}></div>
    </div>
  );
}
