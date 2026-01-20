import React from "react";
import { 
  Briefcase, 
  Globe, 
  ArrowRight, 
  Target, 
  TrendingUp 
} from "lucide-react";
import styles from "../css/homepage.module.css";

export default function Homepage({ setActiveTab }) {
  
  const handleNavigation = (tabIndex) => {
    if (setActiveTab) {
      setActiveTab(tabIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn("setActiveTab function not provided to Homepage");
    }
  };

  const modules = [
    {
      id: "salary",
      tabIndex: 1, 
      title: "Market Overview",
      subtitle: "Macro Analysis & Trends",
      icon: <TrendingUp size={32} />,
      description: (
        <>
          Gain a high-level perspective on the <strong>AI and Tech market</strong> across various job categories. Benchmark compensation against 5 years of historical data, company sizes, and experience levels.
        </>
      ),
      features: [
        "Yearly Salary Evolution (2020–2025)",
        "Market Distribution by Company Size",
        "Experience Level Heatmaps",
        "Category-based Growth Trends"
      ],
      colorClass: styles.iconBlue
    },
    {
      id: "roles",
      tabIndex: 2, 
      title: "Roles & Career",
      subtitle: "Job Specific Intelligence",
      icon: <Briefcase size={32} />,
      description: (
        <>
          Drill down into specific <strong>AI, Data Science, and Engineering</strong> job titles. Understand the ROI of different career paths and how specific roles scale with experience and work settings.
        </>
      ),
      features: [
        "Role-Specific Salary Curves",
        "Career Trajectory Analysis",
        "Remote vs. On-site Role Impact",
        "Top Paying Roles by Seniority"
      ],
      colorClass: styles.iconPurple
    },
    {
      id: "geo",
      tabIndex: 3, 
      title: "Global Strategy",
      subtitle: "Geography & Remote Work",
      icon: <Globe size={32} />,
      description: (
        <>
          Navigate the global talent map for <strong>AI and Tech roles</strong>. Compare cost-of-living adjustments by country and evaluate the financial efficiency of remote work models.
        </>
      ),
      features: [
        "Country-based Compensation Index",
        "Remote Work ROI Analysis",
        "Employee Residence Cost Impact",
        "Global Hiring Hotspots"
      ],
      colorClass: styles.iconTeal
    }
  ];

  return (
    <div className={styles.home_container}>
      <header className={styles.hero}>
        <div className={styles.hero_content}>
          <div className={styles.badge}>AI Salary Explorer v2.0</div>
          <h1 className={styles.home_title}>
            AI & Tech Job <br />
            <span className={styles.gradient_text}>Compensation Intelligence</span>
          </h1>
          <p className={styles.home_subtitle}>
            A comprehensive dashboard designed for professionals and recruiters to navigate 
            global market trends, role valuations, and remote work strategies across 
            
            <strong> Artificial Intelligence, Data Science, and Engineering</strong>.
          </p>
        </div>
      </header>

      <section className={styles.dashboard_grid}>
        {modules.map((module, index) => (
          <div 
            key={module.id} 
            className={styles.card}
            onClick={() => handleNavigation(module.tabIndex)}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className={styles.card_header}>
              <div className={`${styles.icon_box} ${module.colorClass}`}>
                {module.icon}
              </div>
              <div className={styles.header_text}>
                <span className={styles.card_subtitle}>{module.subtitle}</span>
                <h3 className={styles.card_title}>{module.title}</h3>
              </div>
            </div>

            <p className={styles.card_description}>{module.description}</p>

            <div className={styles.divider}></div>

            <ul className={styles.feature_list}>
              {module.features.map((feat, i) => (
                <li key={i} className={styles.feature_item}>
                  <Target size={14} className={styles.feature_icon} />
                  {feat}
                </li>
              ))}
            </ul>

            <button className={styles.action_button}>
              Open Dashboard <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </section>
      
      <footer className={styles.footer_note}>
        <p>Select a module above to begin your analysis.</p>
      </footer>
    </div>
  );
}
