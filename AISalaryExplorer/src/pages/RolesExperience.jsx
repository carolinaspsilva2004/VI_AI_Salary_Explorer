import { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import Filters from "../components/Filters";

import JobRoleExperienceChart from "../components/charts/JobRoleExperienceChart";
import CompanySizeChart from "../components/charts/CompanySizeChart";
import JobRoleEvolutionChart from "../components/charts/JobRoleEvolutionChart";
import RemoteRatioChart from "../components/charts/RemoteRatioChart";

import styles from "../css/RolesExperience.module.css";

export default function RolesExperience({ goToGeographyTab = () => {} }) {
  const { data, loading } = useData();

  const [initialized, setInitialized] = useState(false);

  const [highlightedRole, setHighlightedRole] = useState(null);

  const handleRoleClick = (role) => {
    setFilters((prev) => ({
      ...prev,
      jobRole: [role],
    }));

    setVisibleRoles([role]);
    setHighlightedRole(role);
  };

  const handleClearRoleFilter = () => {
    const defaults = jobRoles.slice(0, 4);

    setFilters((prev) => ({
      ...prev,
      jobRole: defaults,
    }));

    setVisibleRoles(defaults);
    setHighlightedRole(null);
  };

  const [filters, setFilters] = useState({
    year: 2025,
    experience: ["EN", "MI", "SE", "EX"],
    companySize: ["S", "M", "L"],
    employmentType: ["FT", "PT", "CT", "FL"],
    remoteRatio: [0, 50, 100],
    salaryRange: [20000, 300000],
    jobRole: [],
    jobCategory: [],
  });

  const [jobRoles, setJobRoles] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [visibleRoles, setVisibleRoles] = useState([]);

  useEffect(() => {
    if (!loading && data.length > 0 && !initialized) {
      const uniqueRoles = Array.from(new Set(data.map((d) => d.job_title))).sort();
      const initialVisible = uniqueRoles.slice(0, 4);

      setJobRoles(uniqueRoles);
      setVisibleRoles(initialVisible);

      setFilters({
        year: 2025,
        experience: ["EN", "MI", "SE", "EX"],
        companySize: ["S", "M", "L"],
        employmentType: ["FT", "PT", "CT", "FL"],
        remoteRatio: [0, 50, 100],
        salaryRange: [20000, 300000],
        jobRole: initialVisible,
      });

      setInitialized(true);
    }
  }, [data, loading, initialized]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === "jobRole") {
  const roles = value?.length ? value : jobRoles.slice(0, 4);
  setVisibleRoles(roles);
  setHighlightedRole(null);
}
  };

  useEffect(() => {
    if (initialized && visibleRoles.length) {
      if (JSON.stringify(visibleRoles) !== JSON.stringify(filters.jobRole)) {
        setFilters((prev) => ({ ...prev, jobRole: visibleRoles }));
      }
    }
  }, [visibleRoles]);

  const resetFilters = () => {
    const defaults = jobRoles.slice(0, 4);
    setFilters({
      year: 2025,
      experience: ["EN", "MI", "SE", "EX"],
      companySize: ["S", "M", "L"],
      employmentType: ["FT", "PT", "CT", "FL"],
      remoteRatio: [0, 50, 100],
      salaryRange: [20000, 300000],
      jobRole: defaults,
      jobCategory: [],
    });

    setVisibleRoles(defaults);
    setHighlightedRole(null);
  };

  if (loading || !initialized) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading dataset...
      </div>
    );
  }

  return (
    <div className={styles.containerRolesEx}>
      <div className={styles.mainContentRolesEx}>
        <h2 className={styles.titleRolesEx}>Roles & Experience Overview (2020–2025)</h2>
        <p className={styles.subtitleRolesEx}>
          Analysis of salary trends by role, experience level, company size, and work style between 2020 and 2025.
        </p>

        <div className={styles.gridRolesEx}>
          <div className={styles.cardRolesEx}>
            <JobRoleExperienceChart
              filters={filters}
              visibleRoles={visibleRoles}
              highlightedRole={highlightedRole}
              onRoleClick={handleRoleClick}
              onClearRoleFilter={handleClearRoleFilter}
            />
          </div>

          <div className={styles.cardRolesEx}>
            <CompanySizeChart
              filters={filters}
              visibleRoles={visibleRoles}
              highlightedRole={highlightedRole}
              onRoleClick={handleRoleClick}
              onClearRoleFilter={handleClearRoleFilter}
            />
          </div>

          <div className={styles.cardRolesEx}>
            <JobRoleEvolutionChart
              filters={filters}
              visibleRoles={visibleRoles}
              highlightedRole={highlightedRole}
              onRoleClick={handleRoleClick}
              onClearRoleFilter={handleClearRoleFilter}
              onYearSelect={(year) => {
                setFilters(prev => ({ ...prev, year })); 
              }}
            />
          </div>

          <div className={styles.cardRolesEx}>
            <RemoteRatioChart
              filters={filters}
              visibleRoles={visibleRoles}
              highlightedRole={highlightedRole}
              onRoleClick={handleRoleClick}
              onClearRoleFilter={handleClearRoleFilter}
              onRequestGeoView={(role) => {
                sessionStorage.setItem(
                  "pendingGeoRole",
                  JSON.stringify({ role, year: filters.year })
                );
                goToGeographyTab();
              }}
            />
          </div>
        </div>
      </div>

      <Filters
        key={filters.jobRole.join("-")}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        show={{
          year: true,
          jobCategory: false,
          jobRole: true,
          experience: true,
          companySize: true,
          employmentType: true,
          remoteRatio: true,
          salaryRange: true,
          country: false,
          employmentResidence: false,
        }}
        jobCategories={jobCategories}
        jobRoles={jobRoles}
      />
    </div>
  );
}
