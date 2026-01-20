import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Info } from "lucide-react";
import { useData } from "../../context/DataContext";
import styles from "../../css/charts.module.css";
import { COUNTRY_NAMES } from "../../utils/countryNames";

export default function ResidenceSalaryChart({ filters }) {
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
        .attr("class", `${styles.tooltip} ${styles.darkModeTooltip}`)
        .style("position", "fixed")
        .style("pointer-events", "none")
        .style("z-index", 12000);

    let filtered = data;

    if (filters.year !== "ALL")
      filtered = filtered.filter(d => +d.work_year === +filters.year);

    if (filters.salaryRange?.length === 2) {
      const [min, max] = filters.salaryRange;
      filtered = filtered.filter(
        d => +d.salary_in_euros >= min && +d.salary_in_euros <= max
      );
    }

    const grouped = Array.from(
      d3.rollups(
        filtered,
        v => d3.mean(v, d => +d.salary_in_euros),
        d => d.employee_residence
      ),
      ([code, salary]) => ({
        code,
        country: COUNTRY_NAMES[code] ?? code,
        salary
      })
    )
      .sort((a, b) => d3.descending(a.salary, b.salary))
      .slice(0, 7);

    if (grouped.length === 0) {
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

    drawChart(grouped);


    function drawChart(dataset) {
      const container = ref.current.getBoundingClientRect();
      const width = container.width;
      const height = 420;
      const margin = { top: 32, right: 40, bottom: 60, left: 160 };

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const countryColor = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(dataset.map(d => d.code));

      const minRange = filters.salaryRange?.[0] ?? 0;
      const maxRange = filters.salaryRange?.[1] ?? (d3.max(dataset, d => d.salary) || 0);

      const y = d3.scaleBand()
        .domain(dataset.map(d => d.country))
        .range([0, innerHeight])
        .padding(0.35);

      const upperBound = maxRange || minRange + 1;
      const x = d3.scaleLinear()
        .domain([minRange, upperBound])
        .range([0, innerWidth]);
      const yAxis = g.append("g")
        .call(d3.axisLeft(y).tickSize(0));

      yAxis.select(".domain").remove();
      yAxis.selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#334155")
        .style("font-weight", "500");

      const xAxis = g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x)
            .ticks(5) 
            .tickSize(-innerHeight)
            .tickFormat(d => (d === 0 ? "" : "€" + (d / 1000).toFixed(0) + "k")) 
        );

      xAxis.select(".domain").remove();
      xAxis.selectAll("line")
           .attr("stroke", "#e2e8f0")
           .attr("stroke-dasharray", "4 2");
      xAxis.selectAll("text")
           .style("font-size", "11px")
           .style("fill", "#94a3b8");

      g.selectAll("rect")
        .data(dataset)
        .enter()
        .append("rect")
        .attr("y", d => y(d.country))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("fill", (d) => countryColor(d.code))
        .attr("rx", 4)
        .style("cursor", "pointer")
        .attr("width", 0) 
        .transition()
        .duration(700)
        .delay((d, i) => i * 100)
        .attr("width", d => x(d.salary));

      g.selectAll("rect")
        .on("mouseover", function(event, d) {
            const current = countryColor(d.code);
            d3.select(this)
                .attr("fill", d3.color(current).darker(0.4)); 
            
            tooltip
                .style("opacity", 1)
                .html(`
                    <div style="font-weight:700; color:#cbd5e1; margin-bottom:2px; display:flex; align-items:center;">
                      <span style="font-size:1.1em; color:white;">${d.country}</span>
                    </div>

                    <div style="font-weight:600; font-size:1.2em; color:${current};">
                      €${Math.round(d.salary).toLocaleString()}
                    </div>

                    <div style="font-size:0.8em; color:#94a3b8; margin-top:4px">
                      Average Salary
                    </div>
                `)
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY - 32}px`);
        })
        .on("mouseleave", function(event, d) {
            d3.select(this).attr("fill", countryColor(d.code));
            tooltip.style("opacity", 0);
        });
      
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 15)
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .text("Average Salary (€)");
    }

  }, [data, loading, filters.year, filters.salaryRange]);

  return (
    <div className={styles.chartContainer} style={{ paddingTop: "36px" }}>
      <div
        className={styles.yearBadge}
        onMouseMove={(e) => {
          const tooltip = document.getElementById("residenceYearTooltip");
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
          const tooltip = document.getElementById("residenceYearTooltip");
          if (tooltip) {
            tooltip.style.opacity = 0;
            tooltip.style.visibility = "hidden";
          }
        }}
      >
        {filters.year}
      </div>

      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h3 className={styles.title} style={{ color: titleColor, margin: 0 }}>
            Top 7 Average Salary by Residence
          </h3>
          <Info
            size={16}
            className={styles.infoIcon}
            onClick={() => setShowInfo(s => !s)}
          />
        </div>

        {showInfo && (
          <div className={styles.infoPopup}>
            <p>
                This chart shows the top 7 countries based on the average salary (€) of the employees' residence.
                The data reflects the currently applied filters.
            </p>
          </div>
        )}
      </div>

      <svg ref={ref} width="100%" height="420"></svg>
      <div ref={tooltipRef} className={`${styles.tooltip} ${styles.darkModeTooltip}`}></div>
      <div id="residenceYearTooltip" className={styles.yearTooltip}></div>
    </div>
  );
}
