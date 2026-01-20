import { useState } from "react";
import { 
  Home, 
  DollarSign, 
  Briefcase, 
  Globe 
} from "lucide-react"; 
import Sidebar from "./components/Sidebar";
import Homepage from "./pages/HomePage";
import SalaryOverview from "./pages/SalaryOverview";
import RolesExperience from "./pages/RolesExperience";
import GeographyInsights from "./pages/GeographyInsights";
import "./App.css";

export default function App() {
  // 0 = Home, 1 = Salary, 2 = Roles, 3 = Geo
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { 
      name: "Home", 
      icon: Home, 
      // AQUI ESTÁ O TRUQUE: Passamos a função setActiveTab para dentro da Home
      content: <Homepage setActiveTab={setActiveTab} /> 
    },
    { 
      name: "Salary Overview", 
      icon: DollarSign, 
      content: <SalaryOverview /> 
    }, 
    { 
      name: "Roles & Experience", 
      icon: Briefcase, 
      content: <RolesExperience goToGeographyTab={() => setActiveTab(3)} /> 
    },
    { 
      name: "Geography Insights", 
      icon: Globe, 
      content: <GeographyInsights /> 
    },
  ];

  return (
    <div className="app-container">
      <Sidebar 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="main-content">
        <section className="content-section">
          {/* Renderiza o conteúdo da aba ativa */}
          {tabs[activeTab].content}
        </section>

        <footer className="app-footer">
          <p>
            © {new Date().getFullYear()} <strong>AI Salary Explorer</strong>. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
