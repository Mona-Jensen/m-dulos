import React, { useState } from 'react';
import { PlanetViewer3D } from './PlanetViewer3D';
import './App.css';

interface Era {
    id: number;
    name: string;
    start_ma: number;
    end_ma: number;
    description: string | null;
    era_color: string | null;
    dominant_species?: string | null;
    temperature_range?: string | null;
    co2_range?: string | null;
}

const ERAS: Era[] = [
    {
        id: 1,
        name: 'Precámbrico',
        start_ma: 4600,
        end_ma: 541,
        description: 'La etapa más larga de la Tierra. Se formó la litosfera, hidrosfera y atmósfera primigenias, y surgió la vida celular unicelular más primitiva (estromatolitos). La atmósfera carecía casi de oxígeno inicialmente.',
        era_color: '#ff4400',
        dominant_species: 'Cianobacterias y microorganismos anaerobios',
        temperature_range: 'Extrema (de muy caliente a glaciaciones globales)',
        co2_range: 'Muy alta (hasta 100 veces los niveles actuales)'
    },
    {
        id: 2,
        name: 'Paleozoico',
        start_ma: 541,
        end_ma: 252,
        description: 'Inicia con la "explosión cámbrica" de vida marina multicelular y culmina con la mayor extinción masiva de la historia. Surgieron los primeros peces, plantas terrestres, insectos y anfibios.',
        era_color: '#66bb44',
        dominant_species: 'Trilobites, peces acorazados, helechos gigantes',
        temperature_range: 'Templada / Cálida húmeda',
        co2_range: 'Decreciente (de 10x a niveles similares a los actuales)'
    },
    {
        id: 3,
        name: 'Mesozoico',
        start_ma: 252,
        end_ma: 66,
        description: 'La era de los dinosaurios y los grandes reptiles. Los continentes se separan del supercontinente Pangea. Aparecen las primeras plantas con flores (angiospermas), aves y mamíferos primitivos.',
        era_color: '#44aaff',
        dominant_species: 'Dinosaurios, reptiles marinos y pterosaurios',
        temperature_range: 'Cálida e invernadero global uniforme',
        co2_range: 'Alta (4-5 veces los niveles preindustriales)'
    },
    {
        id: 4,
        name: 'Cenozoico',
        start_ma: 66,
        end_ma: 0.01,
        description: 'La era de los mamíferos y las aves, que se diversificaron rápidamente tras la extinción de los dinosaurios. Se formaron las grandes cordilleras actuales (Himalaya, Alpes) y aparecieron los primeros homínidos.',
        era_color: '#4488ff',
        dominant_species: 'Mamíferos placentarios, aves, homínidos',
        temperature_range: 'Tendencia al enfriamiento progresivo (glaciaciones)',
        co2_range: 'Decreciente (de moderada a baja)'
    },
    {
        id: 5,
        name: 'Antropoceno',
        start_ma: 0.01,
        end_ma: 0,
        description: 'La época geológica actual, caracterizada por el impacto global y masivo de la actividad humana sobre los ecosistemas terrestres, la biodiversidad y el cambio climático.',
        era_color: '#ff4422',
        dominant_species: 'Homo sapiens (Seres humanos)',
        temperature_range: 'Calentamiento global acelerado de origen antrópico',
        co2_range: '420+ ppm (En aumento rápido, el nivel más alto en millones de años)'
    }
];

function App() {
    const [currentEra, setCurrentEra] = useState<Era | null>(ERAS[2]); // Mesozoico por defecto

    const handleEraSelect = (era: Era) => {
        setCurrentEra(era);
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="glass-panel header-panel">
                <div className="header-title">
                    <h1>🌐 Cronos 3D</h1>
                    <div className="header-subtitle">Simulador de Eras Geológicas de la Tierra</div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Antigravity IDE v1.0
                </div>
            </div>

            {/* Left Sidebar: Navigation */}
            <div className="glass-panel navigation-sidebar">
                <div className="sidebar-title">Cronología de la Tierra</div>
                <div className="era-list">
                    {ERAS.map((era) => (
                        <button
                            key={era.id}
                            className={`era-item ${currentEra?.id === era.id ? 'active' : ''}`}
                            onClick={() => handleEraSelect(era)}
                        >
                            <div className="era-item-header">
                                <span className="era-item-name">{era.name}</span>
                                <span className="era-item-span">
                                    {era.id === 5 ? 'Actual' : `${era.start_ma} Ma`}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Center Area: 3D Globe */}
            <div className="canvas-container">
                <PlanetViewer3D
                    eras={ERAS}
                    currentEra={currentEra}
                    onEraClick={(era) => {
                        // Al hacer clic, ciclar a la siguiente era
                        const currentIndex = ERAS.findIndex((e) => e.id === era.id);
                        const nextIndex = (currentIndex + 1) % ERAS.length;
                        setCurrentEra(ERAS[nextIndex]);
                    }}
                />
            </div>

            {/* Right Sidebar: Details */}
            {currentEra && (
                <div className="glass-panel details-panel">
                    <div className="details-header">
                        <div className="details-section-title">Era Seleccionada</div>
                        <h2 className="details-era-name">{currentEra.name}</h2>
                        <span className="details-era-span">
                            {currentEra.start_ma} Ma a {currentEra.end_ma === 0 ? 'Presente' : `${currentEra.end_ma} Ma`}
                        </span>
                    </div>

                    <div>
                        <div className="details-section-title">Descripción General</div>
                        <p className="description-text">{currentEra.description}</p>
                    </div>

                    <div>
                        <div className="details-section-title">Parámetros del Ecosistema</div>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">🧬</div>
                                <div className="stat-info">
                                    <span className="stat-label">Especie Dominante</span>
                                    <span className="stat-value">{currentEra.dominant_species}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🌡️</div>
                                <div className="stat-info">
                                    <span className="stat-label">Rango Térmico</span>
                                    <span className="stat-value">{currentEra.temperature_range}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">☁️</div>
                                <div className="stat-info">
                                    <span className="stat-label">Nivel de CO₂ Atm.</span>
                                    <span className="stat-value">{currentEra.co2_range}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
