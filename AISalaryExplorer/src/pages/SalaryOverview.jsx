import { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import Filters from "../components/Filters";
import { TrendingUp, Info } from "lucide-react";

import CategorySalaryYearChart from "../components/charts/CategorySalaryYearChart";
import CategorySalaryOverYearsChart from "../components/charts/CategorySalaryOverYearsChart";
import CategoryCompanySizeChart from "../components/charts/CategoryCompanySizeChart";
import CategoryExperienceHeatmap from "../components/charts/CategoryExperienceHeatmap";

import styles from "../css/SalaryOverview.module.css";

export default function SalaryOverview() {
  const { data, loading } = useData();
  const [autoCategories, setAutoCategories] = useState([]);
  const [initialized, setInitialized] = useState(false);
  
  const [hoveredCategory, setHoveredCategory] = useState(null); 
  const [highlightedCategory, setHighlightedCategory] = useState(null); 

  const [filters, setFilters] = useState({
    year: 2025,
    experience: ["EN", "MI", "SE", "EX"],
    companySize: ["S", "M", "L"],
    employmentType: "ALL",
    salaryRange: [20000, 300000],
    jobCategory: [],
    jobRole: [],
  });

  const [jobCategories, setJobCategories] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);

  useEffect(() => {
    if (!loading && data.length > 0 && !initialized) {
      const uniqueCategories = Array.from(new Set(data.map((d) => d.category))).sort();
      const uniqueRoles = Array.from(new Set(data.map((d) => d.job_title))).sort();
      const initialCategories = uniqueCategories.slice(0, 4);

      setJobCategories(uniqueCategories);
      setJobRoles(uniqueRoles);

      setFilters(prev => ({
        ...prev,
        year: 2025,
        jobCategory: initialCategories,
      }));

      setInitialized(true);
    }
  }, [data, loading, initialized]);


  const handleYearChangeFromSlider = (year) => {
    setFilters((prev) => ({ ...prev, year: year }));
  };

  const handleCategoryClick = (category) => {
    setFilters((prev) => {
      const isSingleSelect = prev.jobCategory.length === 1 && prev.jobCategory[0] === category;
      
      if (isSingleSelect) {
        setHighlightedCategory(null);
      } else {
        setHighlightedCategory(category);
      }
      
      return { ...prev, jobCategory: isSingleSelect ? jobCategories.slice(0, 4) : [category] };
    });
  };

  const handleCompanySizeClick = (size) => {
    setFilters((prev) => {
      const isSingleSelect = prev.companySize.length === 1 && prev.companySize[0] === size;
      return { ...prev, companySize: isSingleSelect ? ["S", "M", "L"] : [size] };
    });
  };

  const handleExperienceClick = (expLevel) => {
    setFilters((prev) => {
      const isSingleSelect = prev.experience.length === 1 && prev.experience[0] === expLevel;
      return { ...prev, experience: isSingleSelect ? ["EN", "MI", "SE", "EX"] : [expLevel] };
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      let updated = { ...prev };
      if (field === "jobCategory") {
        updated.jobCategory = value;
        setHighlightedCategory(null);
        setAutoCategories((prevAuto) => prevAuto.filter((cat) => value.includes(cat)));
        return updated;
      }
      if (field === "jobRole") {
        updated.jobRole = value;
        const roleCategories = Array.from(new Set(data.filter((d) => value.includes(d.job_title)).map((d) => d.category)));
        const manualCategories = prev.jobCategory.filter((cat) => !autoCategories.includes(cat));
        const newAutoCategories = roleCategories.filter((cat) => !manualCategories.includes(cat));
        setAutoCategories(newAutoCategories);
        updated.jobCategory = Array.from(new Set([...manualCategories, ...newAutoCategories]));
        
        setHighlightedCategory(null);
        return updated;
      }
      updated[field] = value;
      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({
      year: 2025,
      experience: ["EN", "MI", "SE", "EX"],
      companySize: ["S", "M", "L"],
      employmentType: "ALL",
      salaryRange: [20000, 300000],
      jobCategory: jobCategories.slice(0, 4),
      jobRole: [],
    });
    setHighlightedCategory(null);
  };
  
  const handleClearCategoryFilter = () => {
    setHighlightedCategory(null);
    setFilters(prev => ({ 
        ...prev, 
        jobCategory: jobCategories.slice(0, 4)
    }));
  };

  if (loading || !initialized) return <div className={styles.loadingBox}>Loading dataset...</div>;

  return (
    <div className={styles.containerSalaryOverview}>
      <div className={styles.mainContentSalaryOverview}>
        <h2 className={styles.title}>Salary Overview (2020–2025)</h2>
        <p className={styles.subtitle}>
          Overview of salary evolution, experience levels, categories, and company sizes.
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <CategorySalaryYearChart 
              filters={filters} 
              onCategoryClick={handleCategoryClick}
              highlightedCategory={highlightedCategory}
              onClearCategoryFilter={handleClearCategoryFilter} 
            />
          </div>

          <div className={styles.card}>
            <CategorySalaryOverYearsChart 
                filters={filters} 
                onYearSelect={handleYearChangeFromSlider}
                hoveredCategory={hoveredCategory}
                setHoveredCategory={setHoveredCategory}
                highlightedCategory={highlightedCategory}
                setHighlightedCategory={setHighlightedCategory}
            />
          </div>

          <div className={styles.card}>
            <CategoryCompanySizeChart 
                filters={filters} 
                highlightedCategory={highlightedCategory}
                onSizeClick={handleCompanySizeClick}
            />
          </div>

          <div className={styles.card}>
            <CategoryExperienceHeatmap 
                filters={filters} 
                highlightedCategory={highlightedCategory}
                onExperienceClick={handleExperienceClick}
            />
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
          experience: true,
          companySize: true,
          employmentType: false,
          remoteRatio: false,
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
