// ============================================================
// 1. CONFIGURACIÓN Y PROYECCIÓN UTM CHILE (HUSO 19 SUR)
// ============================================================
proj4.defs("EPSG:32719", "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs");

function utmToLatLng(easting, northing) {
    const result = proj4("EPSG:32719", "EPSG:4326", [easting, northing]);
    return [result[1], result[0]]; // Retorna [lat, lng]
}

// Synthesise audio beep for premium micro-interaction
function playBeep(type = 'click') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'critical') {
            // Alarm warning sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            // Soft select beep
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        }
    } catch (e) {
        console.warn("Audio Context not supported or blocked by autoplay policy");
    }
}

// ============================================================
// 2. CONJUNTO DE DATOS OFICIALES (VALORES UTM ORIGINALES)
// ============================================================

const polygonUTM = [
    [250000, 6600000], [250500, 6600200], [251000, 6600400], [251500, 6600600],
    [252000, 6600800], [252500, 6601000], [253000, 6601200], [253500, 6601400],
    [254000, 6601600], [254500, 6601800], [255000, 6602000], [255500, 6602200],
    [256000, 6602400], [256500, 6602600], [257000, 6602800], [257500, 6603000],
    [258000, 6603200], [258500, 6603400], [259000, 6603600], [259500, 6603800],
    [260000, 6604000], [260500, 6604200], [261000, 6604400], [261500, 6604600],
    [262000, 6604800], [262500, 6605000], [263000, 6605200], [263500, 6605400],
    [264000, 6605600], [264500, 6605800], [265000, 6606000], [265500, 6606200],
    [266000, 6606400], [266500, 6606600], [267000, 6606800], [267500, 6607000],
    [268000, 6607200], [268500, 6607400], [269000, 6607600], [269500, 6607800],
    [270000, 6608000], [270500, 6608200], [271000, 6608400], [271500, 6608600],
    [272000, 6608800], [272500, 6609000], [273000, 6609200], [273500, 6609400],
    [274000, 6609600], [274500, 6609800], [275000, 6610000], [275500, 6610200],
    [276000, 6610400], [276500, 6610600], [277000, 6611000], [277500, 6611000],
    [278000, 6611200], [278500, 6611400], [279000, 6611600], [279500, 6611800],
    [280000, 6612000], [280500, 6612200], [281000, 6612400], [281500, 6612600],
    [282000, 6612800], [282500, 6613000], [283000, 6613200], [283500, 6613400],
    [284000, 6613600], [284500, 6613800], [285000, 6614000], [285500, 6614200],
    [286000, 6614400], [286500, 6614600], [287000, 6614800], [287500, 6615000],
    [288000, 6615200], [288500, 6615400], [289000, 6615600], [289500, 6615800],
    [290000, 6616000], [290500, 6616200], [291000, 6616400], [291500, 6616600],
    [292000, 6616800], [292500, 6617000], [293000, 6617200], [293500, 6617400],
    [294000, 6617600], [294500, 6617800], [295000, 6618000], [295500, 6618200],
    [296000, 6618400], [296500, 6618600], [297000, 6618800], [297500, 6619000],
    [298000, 6619200], [298500, 6619400], [299000, 6619600], [299500, 6619800],
    [300000, 6620000], [300500, 6620200], [301000, 6620400], [301500, 6620600],
    [302000, 6620800], [302500, 6621000], [303000, 6621200], [303500, 6621400],
    [304000, 6621600], [304500, 6621800], [305000, 6622000], [305500, 6622200],
    [306000, 6622400], [306500, 6622600], [307000, 6622800], [307500, 6623000],
    [308000, 6623200], [308500, 6623400], [309000, 6623600], [309500, 6623800],
    [310000, 6624000]
];

const polygonLatLng = polygonUTM.map(([easting, northing]) => utmToLatLng(easting, northing));

// Depósito de relaves
const depositoUTM = [280000, 6612000];
const depositoLatLng = utmToLatLng(depositoUTM[0], depositoUTM[1]);

// Puntos Críticos
const puntosCriticosUTM = [
    [260000, 6605000], // Agrietamiento
    [270000, 6608000], // Erosión
    [285000, 6613000]  // Desborde
];
const puntosCriticosLatLng = puntosCriticosUTM.map(([e, n]) => utmToLatLng(e, n));

const descripcionesCriticas = [
    'Agrietamiento en muro de contención',
    'Erosión post sistemas frontales',
    'Desborde de agua detectado'
];

// Vías de evacuación
const viasEvacuacion = [
    {
        name: 'Vía Evacuación Norte',
        coords: [
            [275000, 6608000],
            [270000, 6605000],
            [265000, 6602000]
        ].map(([e, n]) => utmToLatLng(e, n))
    },
    {
        name: 'Vía Evacuación Sur',
        coords: [
            [285000, 6612000],
            [290000, 6614000],
            [295000, 6616000]
        ].map(([e, n]) => utmToLatLng(e, n))
    }
];

// Referencias viales
const referencias = [
    { coords: utmToLatLng(270000, 6605000), nombre: 'Ruta D-55' },
    { coords: utmToLatLng(290000, 6612000), nombre: 'Camino a Paihuano' },
    { coords: utmToLatLng(260000, 6602000), nombre: 'Ruta 45' }
];

// Centro del mapa
const mapCenter = utmToLatLng(280000, 6610000);

// ============================================================
// 3. INICIALIZACIÓN DEL MAPA Y CAPAS BASE
// ============================================================
const map = L.map('map', {
    center: mapCenter,
    zoom: 12,
    zoomControl: false,
    fadeAnimation: true
});

// Control de zoom arriba a la derecha
L.control.zoom({ position: 'topright' }).addTo(map);

// Capas base de azulejos (Tiles)
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
});

// Satélite Esri
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
});

// Iniciar con OSM
osmLayer.addTo(map);
let isSatellite = false;

// ============================================================
// 4. CREACIÓN Y DIBUJO DE CAPAS DE ELEMENTOS (FEATURE GROUPS)
// ============================================================

const perimetroGroup = L.featureGroup().addTo(map);
const depositoGroup = L.featureGroup().addTo(map);
const evacuacionGroup = L.featureGroup().addTo(map);
const puntosCriticosGroup = L.featureGroup().addTo(map);
const referenciasGroup = L.featureGroup().addTo(map);

// 4a. Dibujar Perímetro de Seguridad (Polígono)
const perimetroPoly = L.polygon(polygonLatLng, {
    color: '#ef4444',
    weight: 4,
    opacity: 0.9,
    fillColor: '#ef4444',
    fillOpacity: 0.15,
    dashArray: '8, 6',
    className: 'perimetro-seguridad-line'
});

perimetroPoly.bindPopup(`
    <div style="font-family:'Inter', sans-serif;">
        <h3 style="color:#ef4444; margin: 0 0 6px 0; font-size:14px; font-weight:700;">⚠️ PERÍMETRO DE SEGURIDAD (OFICIAL)</h3>
        <p style="margin:0 0 4px 0; font-size:12px;">Área restringida por peligro de colapso de muro.</p>
        <p style="margin:0; font-size:11px; color:#94a3b8;">Establecido: 23 Jul 2026<br>Vigilancia: SENAPRED</p>
    </div>
`);
perimetroPoly.addTo(perimetroGroup);

// 4b. Dibujar Depósito de Relaves y Zona de Riesgo (500m)
const depositoIcon = L.divIcon({
    className: 'deposito-marker-icon',
    html: '🏭',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

const depositoMarker = L.marker(depositoLatLng, { icon: depositoIcon });
depositoMarker.bindPopup(`
    <div style="font-family:'Inter', sans-serif;">
        <h3 style="color:#8b5cf6; margin: 0 0 4px 0;">🏭 Depósito de Relaves</h3>
        <p style="margin:0 0 4px 0; font-size:12px;"><strong>Complejo Productivo Sur / Ex Delta</strong></p>
        <p style="margin:0; font-size:11px; color:#94a3b8;">Operado por ENAMI</p>
    </div>
`);
depositoMarker.addTo(depositoGroup);

const zonaRiesgoCircle = L.circle(depositoLatLng, {
    color: '#f97316',
    weight: 2,
    opacity: 0.8,
    fillColor: '#f97316',
    fillOpacity: 0.15,
    radius: 500
});
zonaRiesgoCircle.bindPopup(`
    <div style="font-family:'Inter', sans-serif;">
        <h3 style="color:#f97316; margin: 0 0 4px 0;">🔶 Zona de Riesgo Inmediato</h3>
        <p style="margin:0; font-size:12px;">Radio de seguridad de 500 metros desde el centro del depósito.</p>
    </div>
`);
zonaRiesgoCircle.addTo(depositoGroup);

// 4c. Dibujar Vías de Evacuación
viasEvacuacion.forEach(via => {
    const routePoly = L.polyline(via.coords, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 8'
    });
    routePoly.bindPopup(`
        <div style="font-family:'Inter', sans-serif; font-size:12px;">
            <strong style="color:#10b981;">🟢 ${via.name}</strong><br>
            Ruta recomendada libre de relaves.
        </div>
    `);
    routePoly.addTo(evacuacionGroup);
});

// 4d. Dibujar Puntos Críticos
const criticalMarkers = [];
const warningIcon = L.divIcon({
    className: 'warning-marker-icon',
    html: '⚠️',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

puntosCriticosLatLng.forEach((coords, index) => {
    const marker = L.marker(coords, { icon: warningIcon });
    marker.bindPopup(`
        <div style="font-family:'Inter', sans-serif;">
            <h3 style="color:#ef4444; margin: 0 0 4px 0;">⚠️ Punto Crítico #${index + 1}</h3>
            <p style="margin:0 0 4px 0; font-size:12px;"><strong>${descripcionesCriticas[index]}</strong></p>
            <p style="margin:0; font-size:11px; color:#94a3b8;">Monitoreo instrumental activo.</p>
        </div>
    `);
    marker.addTo(puntosCriticosGroup);
    criticalMarkers.push(marker);
});

// 4e. Dibujar Referencias Viales
const refIcon = L.divIcon({
    className: 'ref-marker-icon',
    html: '📍',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

referencias.forEach(r => {
    const marker = L.marker(r.coords, { icon: refIcon });
    marker.bindPopup(`
        <div style="font-family:'Inter', sans-serif; font-size:12px;">
            <strong>📍 ${r.nombre}</strong><br>Punto de referencia vial.
        </div>
    `);
    marker.addTo(referenciasGroup);
});

// Escala métrica en el mapa
L.control.scale({ position: 'bottomright' }).addTo(map);

// ============================================================
// 5. INTERACTIVIDAD DE LA INTERFAZ DE USUARIO
// ============================================================

// 5a. Control de Capas Toggles del Sidebar
const layerGroups = {
    'perimetro': perimetroGroup,
    'riesgo': depositoGroup,
    'evacuacion': evacuacionGroup,
    'criticos': puntosCriticosGroup,
    'referencias': referenciasGroup
};

document.querySelectorAll('.layer-switch').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const layerKey = e.target.dataset.layer;
        const group = layerGroups[layerKey];
        if (e.target.checked) {
            map.addLayer(group);
            showToast(`Capa activada: ${e.target.name}`);
        } else {
            map.removeLayer(group);
            showToast(`Capa desactivada: ${e.target.name}`);
        }
        playBeep();
    });
});

// 5b. Centrar en Punto Crítico (FlyTo)
window.flyToPoint = function(index) {
    if (index >= 0 && index < puntosCriticosLatLng.length) {
        const coords = puntosCriticosLatLng[index];
        playBeep('critical');
        map.flyTo(coords, 14, {
            animate: true,
            duration: 1.5
        });
        
        // Esperar a que termine el vuelo para abrir el popup
        setTimeout(() => {
            criticalMarkers[index].openPopup();
        }, 1500);
        
        showToast(`Enfocando Punto Crítico #${index + 1}`);
    }
};

// 5c. Botones de Control Flotantes
window.zoomToPerimeter = function() {
    playBeep();
    const bounds = perimetroPoly.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
    showToast("Vista ajustada al Perímetro de Seguridad");
};

window.resetView = function() {
    playBeep();
    map.setView(mapCenter, 12);
    showToast("Vista general restaurada");
};

window.toggleSatellite = function() {
    playBeep();
    isSatellite = !isSatellite;
    const btn = document.getElementById('satellite-btn');
    if (isSatellite) {
        map.removeLayer(osmLayer);
        map.addLayer(satelliteLayer);
        btn.innerHTML = '🗺️ Mapa Base';
        btn.classList.add('primary');
        showToast("Capa satelital activada");
    } else {
        map.removeLayer(satelliteLayer);
        map.addLayer(osmLayer);
        btn.innerHTML = '🛰️ Satélite';
        btn.classList.remove('primary');
        showToast("Mapa base de calles activado");
    }
};

// 5d. Mostrar y ocultar la barra lateral (Colapso)
const sidebar = document.getElementById('sidebar');
const sidebarTrigger = document.getElementById('sidebar-trigger');
const coordsHud = document.getElementById('coords-hud');

window.toggleSidebar = function() {
    playBeep();
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        sidebarTrigger.classList.add('visible');
        coordsHud.classList.add('collapsed-sidebar');
    } else {
        sidebarTrigger.classList.remove('visible');
        coordsHud.classList.remove('collapsed-sidebar');
    }
};

// 5e. Actualización de coordenadas HUD en tiempo real
const latVal = document.getElementById('lat-val');
const lngVal = document.getElementById('lng-val');

map.on('mousemove', (e) => {
    latVal.textContent = e.latlng.lat.toFixed(6);
    lngVal.textContent = e.latlng.lng.toFixed(6);
});

// ============================================================
// 6. SISTEMA DE TOASTS Y NOTIFICACIONES
// ============================================================
function showToast(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) {
        existing.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification glass-panel';
    toast.innerHTML = `<span>🔔</span> <span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Auto-ocultar
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Carga Inicial
window.addEventListener('load', () => {
    setTimeout(() => {
        showToast("⚠️ Monitoreo Ovalle: Datos oficiales cargados de SENAPRED");
        // Forzar zoom inicial para enfocar el perímetro con padding
        const bounds = perimetroPoly.getBounds();
        map.fitBounds(bounds, { padding: [40, 40] });
    }, 1000);
});
