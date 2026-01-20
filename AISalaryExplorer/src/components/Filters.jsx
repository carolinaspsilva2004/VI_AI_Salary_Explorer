import React, { useState } from "react";
import styles from "../css/Filters.module.css";
import { COUNTRY_NAMES } from "../utils/countryNames";
import { ChevronDown, RotateCcw } from "lucide-react";

export default function Filters({
  filters,
  onFilterChange,
  onReset,

  show = {
    year: true,
    jobCategory: true,
    jobRole: true,
    experience: true,
    companySize: true,
    employmentType: true,
    remoteRatio: true,
    salaryRange: true,
    country: true,
    employmentResidence: true,
  },

  jobCategories = [],
  jobRoles = [],
  countries = [],
  residences = [],
}) {
  const [dropdowns, setDropdowns] = useState({
    jobCategory: false,
    jobRole: false,
    country: false,
    employmentResidence: false,
  });

  const experienceLabels = {
    "EN": "Entry-level",
    "MI": "Mid-level",
    "SE": "Senior",
    "EX": "Executive / Expert"
  };

  const companySizeLabels = {
    "S": "Small (<50)",
    "M": "Medium (50-250)",
    "L": "Large (>250)"
  };

  const toggleDropdown = (field) => {
    setDropdowns((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleArrayFilter = (field, value) => {
    const current = Array.isArray(filters[field]) ? filters[field] : [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onFilterChange(field, updated);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.headerRow}>
      <h3 className={styles.title}>Filters</h3>
      
      <button onClick={onReset} className={styles.resetPill}>
        <RotateCcw size={14} strokeWidth={2} />
        Reset
      </button>
    </div>


      {show.year && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Year</label>
          <input
            type="range"
            min="2020"
            max="2025"
            value={filters.year}
            onChange={(e) => onFilterChange("year", +e.target.value)}
            className={styles.slider}
          />
          <p className={styles.value}>{filters.year}</p>
        </div>
      )}

      {show.jobCategory && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Job Category</label>
          <button
            onClick={() => toggleDropdown("jobCategory")}
            className={styles.dropdownButton}
          >
            {filters.jobCategory?.length
              ? `${filters.jobCategory.length} selected`
              : "Select categories"}
            <ChevronDown className={styles.icon} />
          </button>
          {dropdowns.jobCategory && (
            <div className={styles.dropdownMenu}>
              {jobCategories.map((cat) => (
                <label key={cat} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={filters.jobCategory?.includes(cat)}
                    onChange={() => toggleArrayFilter("jobCategory", cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {show.jobRole && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Job Role</label>
          <button
            onClick={() => toggleDropdown("jobRole")}
            className={styles.dropdownButton}
          >
            {filters.jobRole?.length
              ? `${filters.jobRole.length} selected`
              : "Select roles"}
            <ChevronDown className={styles.icon} />
          </button>
          {dropdowns.jobRole && (
            <div className={styles.dropdownMenu}>
              {jobRoles.map((role) => (
                <label key={role} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={filters.jobRole?.includes(role)}
                    onChange={() => toggleArrayFilter("jobRole", role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {show.experience && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Experience Level</label>
          <div className={styles.inlineOptionsColumn}>
            {["EN", "MI", "SE", "EX"].map((exp) => (
              <button
                key={exp}
                className={`${styles.optionButton} ${
                  filters.experience?.includes(exp) ? styles.active : ""
                }`}
                onClick={() => toggleArrayFilter("experience", exp)}
              >
                {experienceLabels[exp]}
              </button>
            ))}
          </div>
        </div>
      )}

      {show.companySize && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Company Size</label>
          <div className={styles.inlineOptionsColumn}>
            {["S", "M", "L"].map((size) => (
              <button
                key={size}
                className={`${styles.optionButton} ${
                  filters.companySize?.includes(size) ? styles.active : ""
                }`}
                onClick={() => toggleArrayFilter("companySize", size)}
              >
                {companySizeLabels[size]}
              </button>
            ))}
          </div>
        </div>
      )}

      {show.remoteRatio && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Remote Ratio</label>
          <div className={styles.inlineOptions}>
            {[0, 50, 100].map((rr) => (
              <button
                key={rr}
                className={`${styles.optionButton} ${
                  filters.remoteRatio?.includes(rr) ? styles.active : ""
                }`}
                onClick={() => toggleArrayFilter("remoteRatio", rr)}
              >
                {rr === 0 ? "On-site (0%)" : rr === 100 ? "Remote (100%)" : "Hybrid (50%)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {show.salaryRange && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Salary Range (€)</label>
          <div className={styles.doubleRangeWrapper}>
            <input
              type="range"
              min="0"
              max={filters.salaryRange[1] - 5000}
              step="5000"
              value={filters.salaryRange[0]}
              onChange={(e) =>
                onFilterChange("salaryRange", [
                  +e.target.value,
                  filters.salaryRange[1],
                ])
              }
              className={styles.slider}
            />
            <input
              type="range"
              min={filters.salaryRange[0] + 5000}
              max="600000"
              step="5000"
              value={filters.salaryRange[1]}
              onChange={(e) =>
                onFilterChange("salaryRange", [
                  filters.salaryRange[0],
                  +e.target.value,
                ])
              }
              className={styles.slider}
            />
          </div>
          <p className={styles.value}>
            {filters.salaryRange[0].toLocaleString()}€ –{" "}
            {filters.salaryRange[1].toLocaleString()}€
          </p>
        </div>
      )}

      {show.country && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Company Location</label>
          <button
            onClick={() => toggleDropdown("country")}
            className={styles.dropdownButton}
          >
            {filters.country?.length
              ? `${filters.country.length} selected`
              : "Select countries"}
            <ChevronDown className={styles.icon} />
          </button>
          {dropdowns.country && (
            <div className={styles.dropdownMenu}>
             {countries.map((c) => (
                <label key={c} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={filters.country?.includes(c)}
                    onChange={() => toggleArrayFilter("country", c)}
                  />
                  {COUNTRY_NAMES[c] ?? c}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {show.employmentResidence && (
        <div className={styles.filterBlock}>
          <label className={styles.label}>Employee Residence</label>
          <button
            onClick={() => toggleDropdown("employmentResidence")}
            className={styles.dropdownButton}
          >
            {filters.employmentResidence?.length
              ? `${filters.employmentResidence.length} selected`
              : "Select residence"}
            <ChevronDown className={styles.icon} />
          </button>
          {dropdowns.employmentResidence && (
            <div className={styles.dropdownMenu}>
              {residences.map((r) => (
                <label key={r} className={styles.dropdownOption}>
                  <input
                    type="checkbox"
                    checked={filters.employmentResidence?.includes(r)}
                    onChange={() => toggleArrayFilter("employmentResidence", r)}
                  />
                  {COUNTRY_NAMES[r] ?? r}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}