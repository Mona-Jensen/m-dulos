// Configuración inicial
let map, markers, volcanoesData = [];

// Inicializar cuando la página carga
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadData();
    setupEvents();
});

// Crear el mapa
function initMap() {
    map = L.map("map").setView([-39.0, -71.5], 6);
    
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    markers = L.markerClusterGroup();
    map.addLayer(markers);
    
    console.log("✅ Mapa iniciado correctamente");
}

// Cargar datos de volcanes
async function loadData() {
    console.log("🔄 Cargando datos de volcanes...");
    
    try {
        const response = await fetch("volcanoes.json");
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        volcanoesData = await response.json();
        console.log(`✅ ${volcanoesData.length} volcanes cargados:`, volcanoesData);
        
        renderVolcanoes(volcanoesData);
        updateAlertCount();
        
        // Intentar cargar capas adicionales
        loadEvacuationZones();
        loadNationalParks();
        
    } catch (error) {
        console.error("❌ Error cargando volcanes:", error);
        document.getElementById("sidebarContent").innerHTML = `
            <div style="color: red; padding: 20px;">
                <h3>Error cargando datos</h3>
                <p>${error.message}</p>
                <p>Verifica que volcanoes.json existe y tiene formato válido.</p>
            </div>
        `;
    }
}

// Mostrar volcanes en el mapa
function renderVolcanoes(data) {
    if (!markers) {
        console.error("❌ Markers no inicializado");
        return;
    }
    
    markers.clearLayers();
    console.log(`🎨 Renderizando ${data.length} volcanes...`);
    
    data.forEach((volcano, index) => {
        // CORRECCIÓN IMPORTANTE: coordenadas [lat, lon]
        const lat = volcano.coordinates[0];
        const lng = volcano.coordinates[1];
        
        console.log(`  → ${volcano.name}: [${lat}, ${lng}]`);
        
        const color = getStatusColor(volcano.status);
        
        const marker = L.circleMarker([lat, lng], {
            radius: volcano.risk_rank <= 3 ? 12 : volcano.risk_rank <= 6 ? 10 : 8,
            fillColor: color,
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        });
        
        marker.bindTooltip(`
            <strong>${volcano.name}</strong><br>
            <span style="color: ${color}">● ${volcano.status}</span>
            <span style="color: #888"> | Riesgo #${volcano.risk_rank}</span>
        `, { sticky: true });
        
        marker.on("click", () => showVolcanoDetails(volcano));
        markers.addLayer(marker);
    });
    
    console.log("✅ Volcanes renderizados en el mapa");
}

// Cargar zonas de evacuación
async function loadEvacuationZones() {
    try {
        const response = await fetch("evacuation_zones.json");
        if (response.ok) {
            const data = await response.json();
            L.geoJSON(data, {
                style: { color: "#ff3333", weight: 2, fillOpacity: 0.3 }
            }).addTo(map);
            console.log("✅ Zonas de evacuación cargadas");
        }
    } catch (error) {
        console.log("ℹ️ No se cargaron zonas de evacuación:", error.message);
    }
}

// Cargar parques nacionales
async function loadNationalParks() {
    try {
        const response = await fetch("national_parks.json");
        if (response.ok) {
            const data = await response.json();
            L.geoJSON(data, {
                style: { color: "#2e7d32", weight: 2, fillOpacity: 0.2, dashArray: "10, 10" }
            }).addTo(map);
            console.log("✅ Parques nacionales cargados");
        }
    } catch (error) {
        console.log("ℹ️ No se cargaron parques:", error.message);
    }
}

// Mostrar detalles del volcán
function showVolcanoDetails(volcano) {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("sidebarContent");
    
    sidebar.classList.remove("hidden");
    
    content.innerHTML = `
        <div style="padding: 10px;">
            <h2 style="color: #ff5e00; margin-bottom: 15px;">🌋 ${volcano.name}</h2>
            <p><strong>📍 Región:</strong> ${volcano.region}</p>
            <p><strong>⚠️ Estado:</strong> <span class="status-${volcano.status.toLowerCase()}">${volcano.status}</span></p>
            <p><strong>📊 Ranking Riesgo:</strong> #${volcano.risk_rank}</p>
            <p><strong>⛰️ Elevación:</strong> ${volcano.elevation} m</p>
            <p><strong>📅 Última erupción:</strong> ${volcano.last_eruption}</p>
            <p><strong>📝 Descripción:</strong> ${volcano.description}</p>
            <button onclick="flyToVolcano(${volcano.coordinates[0]}, ${volcano.coordinates[1]})" 
                    style="background: #ff5e00; border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer; margin-top: 15px;">
                🗺️ Centrar en mapa
            </button>
        </div>
    `;
}

// Volar a un volcán
function flyToVolcano(lat, lng) {
    map.flyTo([lat, lng], 12, { duration: 1.5 });
    document.getElementById("sidebar").classList.add("hidden");
}

// Obtener color según estado
function getStatusColor(status) {
    const colors = {
        "Verde": "#00e676",
        "Amarilla": "#ffcc00",
        "Naranja": "#ff5e00",
        "Roja": "#ff3333"
    };
    return colors[status] || "#a0a0a0";
}

// Actualizar contador de alertas
function updateAlertCount() {
    const active = volcanoesData.filter(v => v.status !== "Verde").length;
    const alertElement = document.getElementById("alertCount");
    if (alertElement) {
        alertElement.innerHTML = `⚠️ Alertas: ${active}`;
    }
}

// Configurar eventos
function setupEvents() {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = volcanoesData.filter(v => 
                v.name.toLowerCase().includes(term) ||
                v.region.toLowerCase().includes(term)
            );
            renderVolcanoes(filtered);
        });
    }
    
    const closeBtn = document.getElementById("closeSidebar");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("sidebar").classList.add("hidden");
        });
    }
    
    console.log("✅ Eventos configurados");
}

// Hacer función global
window.flyToVolcano = flyToVolcano;