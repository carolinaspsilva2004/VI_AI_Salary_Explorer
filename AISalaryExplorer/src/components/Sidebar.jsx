import React from "react";
import styles from "../css/sidebar.module.css"; 

export default function Sidebar({ tabs, activeTab, setActiveTab }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo_box}>
        <img
          src="/logo.png"
          alt="AI Salary Explorer"
          className={styles.logo}
        />
      </div>

      <div className={styles.menu_title}>Menu</div>

      <nav className={styles.tab_list}>
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              className={`${styles.tab_button} ${
                i === activeTab ? styles.active : ""
              }`}
              onClick={() => setActiveTab(i)}
            >
              {Icon && <Icon size={20} className={styles.icon_svg} />}
              <span>{tab.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}