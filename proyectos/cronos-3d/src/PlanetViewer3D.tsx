import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card } from './Card';

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

interface PlanetViewer3DProps {
    eras: Era[];
    currentEra: Era | null;
    onEraClick: (era: Era) => void;
}

const ERA_CONFIGS: Record<string, any> = {
    'Precámbrico': {
        atmosphereColor: '#ff4400',
        atmosphereOpacity: 0.15,
        cloudOpacity: 0.02,
    },
    'Paleozoico': {
        atmosphereColor: '#66bb44',
        atmosphereOpacity: 0.10,
        cloudOpacity: 0.20,
    },
    'Mesozoico': {
        atmosphereColor: '#44aaff',
        atmosphereOpacity: 0.08,
        cloudOpacity: 0.30,
    },
    'Cenozoico': {
        atmosphereColor: '#4488ff',
        atmosphereOpacity: 0.06,
        cloudOpacity: 0.15,
    },
    'Antropoceno': {
        atmosphereColor: '#ff4422',
        atmosphereOpacity: 0.12,
        cloudOpacity: 0.10,
    },
};

export const PlanetViewer3D: React.FC<PlanetViewer3DProps> = ({
    eras,
    currentEra,
    onEraClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const planetRef = useRef<THREE.Mesh | null>(null);
    const atmosphereRef = useRef<THREE.Mesh | null>(null);
    const cloudsRef = useRef<THREE.Mesh | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const [hoveredEra, setHoveredEra] = useState<string | null>(null);

    // Refs para evitar que cambie la dependencia del useEffect principal
    const currentEraRef = useRef<Era | null>(currentEra);
    const onEraClickRef = useRef<(era: Era) => void>(onEraClick);

    useEffect(() => {
        currentEraRef.current = currentEra;
    }, [currentEra]);

    useEffect(() => {
        onEraClickRef.current = onEraClick;
    }, [onEraClick]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Inicializar escena
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        sceneRef.current = scene;

        // Cámara
        const camera = new THREE.PerspectiveCamera(
            45,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0.5, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Estrellas
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const radius = 15 + Math.random() * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        // Planeta
        const textureLoader = new THREE.TextureLoader();
        const earthMap = textureLoader.load(
            'https://unpkg.com/three-globe@2.24.11/example/img/earth-blue-marble.jpg'
        );
        const earthBumpMap = textureLoader.load(
            'https://unpkg.com/three-globe@2.24.11/example/img/earth-topology.png'
        );
        const earthSpecularMap = textureLoader.load(
            'https://unpkg.com/three-globe@2.24.11/example/img/earth-water.png'
        );
        const cloudMap = textureLoader.load(
            'https://unpkg.com/three-globe@2.24.11/example/img/earth-night.jpg'
        );

        const planetGeometry = new THREE.SphereGeometry(2, 64, 64);
        const planetMaterial = new THREE.MeshPhongMaterial({
            map: earthMap,
            bumpMap: earthBumpMap,
            bumpScale: 0.04,
            specularMap: earthSpecularMap,
            specular: new THREE.Color('grey'),
            shininess: 5,
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.name = 'planet';
        scene.add(planet);
        planetRef.current = planet;

        // Nubes
        const cloudGeometry = new THREE.SphereGeometry(2.01, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudMap,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(clouds);
        cloudsRef.current = clouds;

        // Atmósfera
        const atmosphereGeometry = new THREE.SphereGeometry(2.08, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.06,
            side: THREE.BackSide,
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);
        atmosphereRef.current = atmosphere;

        // Iluminación
        const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(5, 3, 5);
        scene.add(sunLight);

        const backLight = new THREE.DirectionalLight(0x4488ff, 0.4);
        backLight.position.set(-3, -1, -5);
        scene.add(backLight);

        // Animación
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            planet.rotation.y += 0.0005;
            clouds.rotation.y += 0.0003;
            renderer.render(scene, camera);
        };
        animate();

        // Manejo de clics
        const onCanvasClick = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(planet);

            if (intersects.length > 0 && currentEraRef.current) {
                onEraClickRef.current(currentEraRef.current);
            }
        };

        renderer.domElement.addEventListener('click', onCanvasClick);

        // Manejo de redimensionamiento
        const onWindowResize = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener('resize', onWindowResize);

        return () => {
            window.removeEventListener('resize', onWindowResize);
            if (renderer.domElement) {
                renderer.domElement.removeEventListener('click', onCanvasClick);
            }
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }

            // Liberar memoria
            starGeometry.dispose();
            starMaterial.dispose();
            planetGeometry.dispose();
            planetMaterial.dispose();
            cloudGeometry.dispose();
            cloudMaterial.dispose();
            atmosphereGeometry.dispose();
            atmosphereMaterial.dispose();
            earthMap.dispose();
            earthBumpMap.dispose();
            earthSpecularMap.dispose();
            cloudMap.dispose();
            renderer.dispose();
        };
    }, []);

    // Actualizar atmósfera según era
    useEffect(() => {
        if (!currentEra || !atmosphereRef.current || !cloudsRef.current) return;

        const config = ERA_CONFIGS[currentEra.name];
        if (!config) return;

        const color = new THREE.Color(config.atmosphereColor);
        const atmosphereMaterial = atmosphereRef.current.material as THREE.MeshBasicMaterial;
        atmosphereMaterial.color.copy(color);
        atmosphereMaterial.opacity = config.atmosphereOpacity;
        atmosphereMaterial.needsUpdate = true;

        const cloudMaterial = cloudsRef.current.material as THREE.MeshPhongMaterial;
        cloudMaterial.opacity = config.cloudOpacity;
        cloudMaterial.needsUpdate = true;
    }, [currentEra]);

    return (
        <div className="planet-viewer-container">
            <div
                ref={containerRef}
                className="planet-canvas"
            />

            {/* Hint */}
            <div className="planet-hint">
                <p className="planet-hint-text">
                    🖱️ Haz clic en el planeta para explorar
                </p>
            </div>

            {/* Info actual */}
            {currentEra && (
                <div className="planet-info-overlay">
                    <Card>
                        <h3 className="card-title">{currentEra.name}</h3>
                        <p className="card-subtitle">
                            {currentEra.start_ma} - {currentEra.end_ma} Ma
                        </p>
                        <p className="card-description">{currentEra.description}</p>
                    </Card>
                </div>
            )}
        </div>
    );
};
