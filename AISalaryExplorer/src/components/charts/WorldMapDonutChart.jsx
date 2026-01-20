import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useData } from "../../context/DataContext";
import styles from "../../css/WorldMapDonutChart.module.css";
import { Info } from "lucide-react";
import { getCategoryColor } from "../../utils/categoryColors";

import GlobalDonut from "./GlobalDonut";
import CountryDonut from "./CountryDonut";

export default function WorldMapDonutChart({ filters }) {
  const { data, loading } = useData();

  const mapRef = useRef();
  const legendRef = useRef();
  const tooltipRef = useRef();
  const zoomRef = useRef();
const [modalCategory, setModalCategory] = useState(null);

  const [world, setWorld] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedName, setSelectedName] = useState(null);

  const [showMainInfo, setShowMainInfo] = useState(false);

  const iso3to2 = {
    USA: "US", CAN: "CA", GBR: "GB", FRA: "FR", DEU: "DE",
    NLD: "NL", LTU: "LT", SGP: "SG", AUS: "AU", IND: "IN",
    BRA: "BR", ESP: "ES", ITA: "IT", MEX: "MX"
  };

  useEffect(() => {
    d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    ).then(setWorld);
  }, []);

  useEffect(() => {
    if (!loading && world && data.length > 0) {
      drawMap();
      drawLegend();
    }
  }, [loading, world, data, filters, selectedCountry]);

function applyFilters(dataset) {
  let filtered = [...dataset];

  filtered = filtered.filter(d => +d.work_year === +filters.year);

  if (filters.jobCategory.length > 0)
    filtered = filtered.filter(d =>
      filters.jobCategory.includes(d.category)
    );

  if (filters.jobRole.length > 0)
    filtered = filtered.filter(d =>
      filters.jobRole.includes(d.job_title)
    );

  if (filters.remoteRatio.length > 0)
    filtered = filtered.filter(d =>
      filters.remoteRatio.includes(+d.remote_ratio)
    );

  filtered = filtered.filter(
    d =>
      d.salary_in_euros >= filters.salaryRange[0] &&
      d.salary_in_euros <= filters.salaryRange[1]
  );

  return filtered;
}

  function drawMap() {
    const svg = d3.select(mapRef.current);
    svg.selectAll("*").remove();

    const width = svg.node().clientWidth;
    const height = 650;
    svg.attr("height", height);

    const g = svg.append("g").attr("class", "mapGroup");

    const projection = d3.geoMercator()
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const filtered = applyFilters(data);

    const employeeCount = d3.rollup(
      filtered, (v) => v.length, (d) => d.employee_residence
    );

    const remoteAvg = d3.rollup(
      filtered,
      (v) => d3.mean(v, (d) => d.remote_ratio),
      (d) => d.employee_residence
    );

   const colorScale = d3.scaleLinear()
  .domain([0, 50, 100])
  .range(["#1e3a8a", "#3b82f6", "#10b981"]);



    const tooltip = d3.select(tooltipRef.current);

    const iso3Auto = new Map(world.features.map(f => [f.id, f.properties.iso_a2]));

    g.selectAll("path")
      .data(world.features)
      .join("path")
      .attr("d", path)
      .attr("class", (d) => {
        const iso2 = iso3to2[d.id] || iso3Auto.get(d.id);
        return selectedCountry === iso2
          ? `${styles.country} ${styles.selected}`
          : styles.country;
      })
      .attr("fill", (d) => {
        const iso2 = iso3to2[d.id] || iso3Auto.get(d.id);
        if (!employeeCount.has(iso2)) return "#EEF3FA";
        return colorScale(remoteAvg.get(iso2));
      })
      .attr("stroke", "#C2D3EA")
      .attr("stroke-width", 0.6)
      .style("cursor", "pointer")
      .on("mousemove", (event, d) => {
        const iso2 = iso3to2[d.id] || iso3Auto.get(d.id);

        tooltip.style("opacity", 1)
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY + 12}px`)

          .html(`
            <b>${d.properties.name}</b><br/>
            Employees: ${employeeCount.get(iso2) || 0}<br/>
            Avg Remote: ${(remoteAvg.get(iso2) || 0).toFixed(1)}%
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => {
        const iso2 = iso3to2[d.id] || iso3Auto.get(d.id);
        setSelectedCountry(iso2);
        setSelectedName(d.properties.name);
      });

    if (selectedCountry) {
      const selectedFeature = world.features.find((f) => {
        const iso2 = iso3to2[f.id] || iso3Auto.get(f.id);
        return iso2 === selectedCountry;
      });

      if (selectedFeature) {
        const [x, y] = projection(d3.geoCentroid(selectedFeature));

        const pinLayer = g.append("g")
          .attr("class", "pinLayer")
          .attr("transform", `translate(${x}, ${y})`);

        pinLayer.append("path")
          .attr(
            "d",
            "M0,-12 C6,-12 10,-7 10,0 C10,7 0,16 0,16 C0,16 -10,7 -10,0 C-10,-7 -6,-12 0,-12 Z"
          )
          .attr("fill", "#0078D4")
          .attr("stroke", "white")
          .attr("stroke-width", 2);

        const labelGroup = pinLayer.append("g")
          .attr("transform", "translate(0, -22)");

        const labelText = labelGroup.append("text")
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("font-weight", "700")
          .style("fill", "#111")
          .text(selectedName);

        const bbox = labelText.node().getBBox();

        labelGroup.insert("rect", "text")
          .attr("x", bbox.x - 6)
          .attr("y", bbox.y - 4)
          .attr("width", bbox.width + 12)
          .attr("height", bbox.height + 8)
          .attr("fill", "#fff")
          .attr("stroke", "#CBD5E1")
          .attr("stroke-width", 1)
          .attr("rx", 6)
          .attr("ry", 6);
      }
    }

    const bounds = g.node().getBBox();
    const dx = bounds.width;
    const dy = bounds.height;
    const x = bounds.x;
    const y = bounds.y;

    const zoom = d3.zoom()
      .scaleExtent([1, 5])
      .translateExtent([
        [x - dx * 0.2, y - dy * 0.2],
        [x + dx * 1.2, y + dy * 1.2]
      ])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;

    svg.call(zoom);
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2 - (x + dx / 2), height / 2 - (y + dy / 2))
        .scale(1)
    );

    d3.select(tooltipRef.current)
      .style("position", "fixed")
      .style("z-index", 12000)
      .style("pointer-events", "none");
  }

  function drawLegend() {
    const wrap = d3.select(legendRef.current);
    wrap.selectAll("*").remove();

    const svg = wrap.append("svg").attr("width", 220).attr("height", 55);

    const grad = svg.append("defs")
      .append("linearGradient")
      .attr("id", "remoteGrad")
      .attr("x1", "0%")
      .attr("x2", "100%");

    grad.selectAll("stop")
      .data([
  { offset: "0%", color: "#1e3a8a" },
  { offset: "50%", color: "#3b82f6" },
  { offset: "100%", color: "#10b981" },
]

)
      .join("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    svg.append("rect")
      .attr("x", 15)
      .attr("y", 15)
      .attr("width", 160)
      .attr("height", 12)
      .style("fill", "url(#remoteGrad)");

    svg.append("text").attr("x", 15).attr("y", 45).text("0% Remote");
    svg.append("text").attr("x", 135).attr("y", 45).text("100% Remote");
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
<div
  onMouseMove={(e) => {
    const tooltip = document.getElementById("yearTooltip");
    tooltip.style.opacity = 1;
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
    const tooltip = document.getElementById("yearTooltip");
    tooltip.style.opacity = 0;
  }}
  style={{
    position: "absolute",
    top: "12px",
    left: "0px",
    background: "#eef4ff",
    color: "#3b82f6",
    fontWeight: "600",
    padding: "6px 14px",
    borderRadius: "10px",
    fontSize: "14px",
    border: "1px solid #d5e3ff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.07)",
    zIndex: 50,
    cursor: "default"
  }}
>
  {filters.year}
</div>

        <h3 className={styles.title}>Global AI Job Distribution & Remote Connectivity</h3>

        <button
          className={styles.infoButton}
          onClick={() => setShowMainInfo(v => !v)}
        >
          <Info size={16} />
        </button>

        {showMainInfo && (
          <div className={styles.infoPopup}>
            <p>This choropleth map shows job activity based on <b>employee residence</b>.</p>
            <p style={{ marginTop: 8 }}>
              Country color = remote ratio.
            </p>
          </div>
        )}
      </div>

      <p className={styles.mapDescription}>
        Click a country to view its job category distribution.
      </p>

       <div className={styles.mapWrapper}>

  <div className={styles.zoomButtons}>
    <button onClick={() =>
      d3.select(mapRef.current).transition().call(zoomRef.current.scaleBy, 1.3)
    }>+</button>

    <button onClick={() =>
      d3.select(mapRef.current).transition().call(zoomRef.current.scaleBy, 0.7)
    }>−</button>
  </div>

  <svg ref={mapRef} className={styles.mapSvg}></svg>

  <div ref={legendRef} className={styles.legend}></div>

  <div
    ref={tooltipRef}
    className={styles.tooltip}
    style={{
      position: "absolute",
      opacity: 0,
      pointerEvents: "none",
      zIndex: 40,
    }}
  ></div>

  {selectedCountry && (
    <button
      className={styles.clearButton}
      onClick={() => {
        setSelectedCountry(null);
        setSelectedName(null);
        setModalCategory(null);
      }}
    >
      Clear Selected Country
    </button>
  )}

  {selectedCountry && (
    <div className={`${styles.countryDonutOverlay} ${styles.show}`}>
      <CountryDonut
        data={data}
        filters={filters}
        selectedCountry={selectedCountry}
        selectedName={selectedName}
        applyFilters={applyFilters}
        tooltipRef={tooltipRef}
        onCategoryClick={(category) => setModalCategory(category)}
      />
    </div>
  )}

</div>
 

{modalCategory && (
  <div className={styles.modalBackdrop} onClick={() => setModalCategory(null)}>
    <div
      className={styles.modalContent}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={styles.closeButton} onClick={() => setModalCategory(null)}>
        ×
      </button>

      <h2 className={styles.modalTitle}>
        Global Context for{" "}
        <span style={{ color: getCategoryColor(modalCategory) }}>
          {modalCategory}
        </span>
      </h2>

      <GlobalDonut
        data={data}
        filters={filters}
        applyFilters={applyFilters}
        tooltipRef={tooltipRef}
        selectedCategory={modalCategory}
      />
    </div>
  </div>
)}

 <div
      id="yearTooltip"
      style={{
        position: "absolute",
        opacity: 0,
        pointerEvents: "none",
        background: "#0f172a",
        color: "white",
        padding: "10px 14px",
        fontSize: "13px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        transition: "opacity 0.15s ease",
        zIndex: 9999,
        maxWidth: "220px",
        lineHeight: "1.4",
      }}
    ></div>

    </div>
  );
}
