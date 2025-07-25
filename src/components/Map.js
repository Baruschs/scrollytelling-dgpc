// src/components/Map.js

import React, { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import { chapters } from "../config/chapters";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

// --- Inicialización del protocolo PMTiles ---
const pmtilesProtocol = new Protocol();
if (!maplibregl.hasPmtilesProtocol) {
  maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
  maplibregl.hasPmtilesProtocol = true;
}

const Map = ({ location, activeChapterId, styleUrl }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const animationTimers = useRef({});
  const lastChapterIdRef = useRef(null);
  const [map, setMap] = useState(null);

  // --- EFECTO 1: Crear/destuir mapa al cambiar estilo ---
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: location.center,
      zoom: location.zoom,
      pitch: location.pitch,
      bearing: location.bearing,
      interactive: false,
    });

    mapInstance.on("load", () => {
      mapRef.current = mapInstance;
      setMap(mapInstance);
      // Ajustar cámara al cargar
      mapInstance.flyTo({ ...location, duration: 2000 });
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        setMap(null);
      }
    };
  }, [styleUrl]);

  // --- EFECTO 2: Manejo de capas ---
  useEffect(() => {
    if (!map) return;

    // Limpieza de capas
    Object.values(chapters).forEach((chapter) => {
      const cleanupLayer = (layerConfig) => {
        const sourceId = `source-${layerConfig.id}`;
        if (map.getSource(sourceId)) {
          if (map.getLayer(`${sourceId}-fill`)) map.removeLayer(`${sourceId}-fill`);
          if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`);
          if (map.getLayer(`${sourceId}-circle`)) map.removeLayer(`${sourceId}-circle`);
          map.removeSource(sourceId);
        }
        
        const startPointSourceId = `${sourceId}-start-point`;
        const endPointSourceId = `${sourceId}-end-point`;
        if (map.getLayer(`${startPointSourceId}-layer`)) map.removeLayer(`${startPointSourceId}-layer`);
        if (map.getSource(startPointSourceId)) map.removeSource(startPointSourceId);
        if (map.getLayer(`${endPointSourceId}-layer`)) map.removeLayer(`${endPointSourceId}-layer`);
        if (map.getSource(endPointSourceId)) map.removeSource(endPointSourceId);
      };

      if (Array.isArray(chapter.layers)) {
        chapter.layers.forEach(cleanupLayer);
      } else if (chapter.pmtileUrl) {
        cleanupLayer(chapter);
      }
    });

    // Limpiar animaciones anteriores
    Object.values(animationTimers.current).forEach(timer => clearTimeout(timer));
    animationTimers.current = {};

    const chapterData = chapters[activeChapterId];

    // Solo agregar capas si tiene datos
    if (!chapterData?.pmtileUrl && !Array.isArray(chapterData?.layers)) {
      return;
    }

    const addLayerToMap = (layerConfig) => {
      const sourceId = `source-${layerConfig.id}`;
      const firstSymbolId = map.getStyle().layers.find((l) => l.type === "symbol")?.id;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "vector", url: layerConfig.pmtileUrl });
      }

      if (layerConfig.layerType === "polygon") {
        map.addLayer({ 
          id: `${sourceId}-fill`, 
          type: "fill", 
          source: sourceId, 
          "source-layer": layerConfig.sourceLayer, 
          paint: { "fill-color": "#1e5b4f", "fill-opacity": 0.4 } 
        }, firstSymbolId);
        map.addLayer({ 
          id: `${sourceId}-line`, 
          type: "line", 
          source: sourceId, 
          "source-layer": layerConfig.sourceLayer, 
          paint: { "line-color": "#FFFFFF", "line-width": 2 } 
        }, firstSymbolId);
      
      } else if (layerConfig.layerType === "point") {
        map.addLayer({ 
          id: `${sourceId}-circle`, 
          type: "circle", 
          source: sourceId, 
          "source-layer": layerConfig.sourceLayer, 
          paint: { 
            "circle-radius": 1.5, 
            "circle-stroke-width": 0, 
            "circle-color": ["match",["get","NOM_ENT"],
              "Baja California","#0D47A1",
              "Campeche","#FF6F00",
              "Chiapas","#2E7D32",
              "Chihuahua","#D4A017",
              "Ciudad de México","#C2185B",
              "Coahuila","#D32F2F",
              "Colima","#E64A19",
              "Durango","#00695C",
              "Guanajuato","#FBC02D",
              "Guerrero","#00ACC1",
              "Hidalgo","#7B1FA2",
              "Jalisco","#1976D2",
              "México","#880E4F",
              "Michoacán de Ocampo","#F57C00",
              "Morelos","#EC407A",
              "Nayarit","#004D40",
              "Oaxaca","#9C27B0",
              "Puebla","#303F9F",
              "Querétaro Arteaga","#512DA8",
              "Quintana Roo","#00BFA5",
              "San Luis Potosí","#E57373",
              "Sinaloa","#388E3C",
              "Sonora","#FFA000",
              "Tabasco","#1B5E20",
              "Tlaxcala","#FF5252",
              "Veracruz de Ignacio de la Llave","#0277BD",
              "Yucatán","#0097A7",
              "Zacatecas","#AD1457",
              "#cccccc"]
          }
        }, firstSymbolId);
      
      } else if (layerConfig.layerType === "line") {
        map.addLayer({ 
          id: `${sourceId}-line`, 
          type: "line", 
          source: sourceId, 
          "source-layer": layerConfig.sourceLayer, 
          paint: { "line-color": "#fd7600ff", "line-width": 7 } 
        }, firstSymbolId );
        
        if (layerConfig.startCoords && layerConfig.endCoords) {
          const startCoords = layerConfig.startCoords;
          const endCoords = layerConfig.endCoords;

          const startPointSourceId = `${sourceId}-start-point`;
          const endPointSourceId = `${sourceId}-end-point`;

          if (!map.getSource(startPointSourceId)) {
            map.addSource(startPointSourceId, { 
              type: 'geojson', 
              data: { type: 'Point', coordinates: startCoords } 
            });
          }
          if (!map.getSource(endPointSourceId)) {
            map.addSource(endPointSourceId, { 
              type: 'geojson', 
              data: { type: 'Point', coordinates: endCoords } 
            });
          }

          const startLayerId = `${startPointSourceId}-layer`;
          const endLayerId = `${endPointSourceId}-layer`;

          map.addLayer({ 
            id: startLayerId, 
            type: 'circle', 
            source: startPointSourceId, 
            paint: { 'circle-radius': 8, 'circle-color': '#fd7600ff' } 
          });
          map.addLayer({ 
            id: endLayerId, 
            type: 'circle', 
            source: endPointSourceId, 
            paint: { 'circle-radius': 8, 'circle-color': '#fd7600ff' } 
          });
          
          // Animación de pulso segura
          let pulseUp = true;
          const animate = () => {
            if (!map || !map.getStyle() || !map.getLayer(startLayerId)) return;
            const radius = pulseUp ? 17 : 10;
            map.setPaintProperty(startLayerId, 'circle-radius', radius);
            map.setPaintProperty(endLayerId, 'circle-radius', radius);
            pulseUp = !pulseUp;
            animationTimers.current[sourceId] = setTimeout(animate, 300);
          };
          animate();
        }
      }
    };

    if (Array.isArray(chapterData.layers)) {
      chapterData.layers.forEach(addLayerToMap);
    } else if (chapterData.pmtileUrl) {
      addLayerToMap(chapterData);
    }

  }, [map, activeChapterId]);

  // --- EFECTO 3: Animación de cámara al cambiar de capítulo ---
  useEffect(() => {
    if (!map || !location) return;

    // Si el capítulo actual no tiene location, no hacemos nada
    if (!chapters[activeChapterId]?.location) {
      return;
    }

    // Si es el mismo capítulo, no repetimos
    if (lastChapterIdRef.current === activeChapterId) {
      return;
    }

    // Aplicar flyTo suave
    map.flyTo({ 
      ...location, 
      duration: 6000 
    });

    lastChapterIdRef.current = activeChapterId;
  }, [map, activeChapterId, location]);

  return <div className="map-container" ref={mapContainerRef} />;
};

export default Map;