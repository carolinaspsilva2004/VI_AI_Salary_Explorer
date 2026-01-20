import { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import Filters from "../components/Filters";

import RemoteCountryChart from "../components/charts/CountryRemoteSalaryChar";
import ResidenceSalaryChart from "../components/charts/ResidenceSalaryChart";

import styles from "../css/GeographyInsights.module.css";
import WorldMapDonutChart from "../components/charts/WorldMapDonutChart";

export default function GeographyInsights() {
  const { data, loading } = useData();

  const [initialized, setInitialized] = useState(false);

  const [filters, setFilters] = useState({
    year: 2025,
    jobCategory: [],
    jobRole: [],
    remoteRatio: [0, 50, 100],     
    salaryRange: [0, 300000],
    country: [],
    employmentResidence: [],
  });

  const [jobCategories, setJobCategories] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [residences, setResidences] = useState([]);

  useEffect(() => {
    if (!loading && data.length > 0 && !initialized) {
      const uniqueCategories = Array.from(
        new Set(data.map((d) => d.category))
      ).sort();

      const uniqueRoles = Array.from(
        new Set(data.map((d) => d.job_title))
      ).sort();

      const uniqueCountries = Array.from(
        new Set(data.map((d) => d.company_location))
      ).sort();

      const uniqueResidences = Array.from(
        new Set(data.map((d) => d.employee_residence))
      ).sort();

      setJobCategories(uniqueCategories);
      setJobRoles(uniqueRoles);
      setCountries(uniqueCountries);
      setResidences(uniqueResidences);

      setFilters({
        year: 2025,
        jobCategory: [],
        jobRole: [],
        remoteRatio: [0, 50, 100],             
        salaryRange: [0, 300000],
        country: uniqueCountries.slice(0, 5),
        employmentResidence: uniqueResidences.slice(0, 6),
      });

      setInitialized(true);
    }
  }, [data, loading, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const pending = sessionStorage.getItem("pendingGeoRole");
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        const role = parsed?.role;
        const year = parsed?.year;
        if (role) {
          setFilters((prev) => ({
            ...prev,
            jobRole: [role],
            year: year ?? prev.year,
          }));
        }
      } catch (err) {
        console.error("Failed to parse pending geo role", err);
      } finally {
        sessionStorage.removeItem("pendingGeoRole");
      }
    }
  }, [initialized]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      year: 2025,
      jobCategory: [],
      jobRole: [],
      remoteRatio: [0, 50, 100],          
      salaryRange: [0, 300000],
      country: countries.slice(0, 5),
      employmentResidence: residences.slice(0, 6),
    });
  };

  if (loading || !initialized) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading dataset...
      </div>
    );
  }

  return (
    <div className={styles.containerGeo}>
      <div className={styles.mainContentGeo}>
        <h2 className={styles.titleGeo}>Geography Insights (2020–2025)</h2>
        <p className={styles.subtitleGeo}>
          Analysis of salary variations by country, remote ratio, and employee
          residence.
        </p>

        <div className={styles.fullWidthCard}>
        <WorldMapDonutChart filters={filters} />
      </div>


        <div className={styles.gridGeo}>
          <div className={styles.cardGeo}>
            <RemoteCountryChart filters={filters} />
          </div>

          <div className={styles.cardGeo}>
            <ResidenceSalaryChart filters={filters} />
          </div>
        </div>
      </div>

      <Filters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        show={{
          year: true,
          jobCategory: true,
          jobRole: true,
          experience: false,
          companySize: false,
          employmentType: false,
          remoteRatio: true,
          salaryRange: true,
          country: true,
          employmentResidence: true,
        }}
        jobCategories={jobCategories}
        jobRoles={jobRoles}
        countries={countries}
        residences={residences}
      />
    </div>
  );
}
