import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Fix par défaut des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icône personnalisée pour le livreur (Scooter / Moto)
const driverIcon = L.divIcon({
  className: 'custom-driver-pin',
  html: `
    <div style="background-color: #2563eb; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2.5px solid white; font-size: 18px;">
      🛵
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// Définition des calques (Rues standard vs Satellite HD Esri)
const TILE_LAYERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  },
  satellite: {
    // Esri World Imagery (Couverture satellite haute résolution sans clé API requise)
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS Community',
      maxZoom: 19,
    },
    // Overlay des noms de rues et repères sur le satellite
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
};

export default function MapComponent({
  markers = [], // Array de { lat, lng, title, details, isOutdated }
  center = [-18.9135, 47.5278], // Antananarivo par défaut
  zoom = 14,
  height = '400px',
  showLayerToggle = true, // Permet d'activer/désactiver le bouton satellite
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const satelliteLabelsLayerRef = useRef(null);
  const initialViewRef = useRef({ center, zoom });

  const [mapMode, setMapMode] = useState('streets'); // 'streets' | 'satellite'

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // On repositionne le zoom pour une interface plus moderne
      }).setView(initialViewRef.current.center, initialViewRef.current.zoom);

      // Repositionner le zoom en bas à droite
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Calque initial (Standard OSM)
      const baseLayer = L.tileLayer(TILE_LAYERS.streets.url, TILE_LAYERS.streets.options).addTo(map);
      currentTileLayerRef.current = baseLayer;

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const resizeObserver = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Gestion du basculement entre Plan et Satellite
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Suppression de l'ancien calque de tuiles
    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }
    if (satelliteLabelsLayerRef.current) {
      mapInstanceRef.current.removeLayer(satelliteLabelsLayerRef.current);
      satelliteLabelsLayerRef.current = null;
    }

    if (mapMode === 'satellite') {
      // 1. Calque Satellite Imagerie Esri
      const satLayer = L.tileLayer(TILE_LAYERS.satellite.url, TILE_LAYERS.satellite.options).addTo(
        mapInstanceRef.current
      );
      currentTileLayerRef.current = satLayer;

      // 2. Calque transparent des noms de rues / frontières pour la lisibilité
      const labels = L.tileLayer(TILE_LAYERS.satellite.labelsUrl, { maxZoom: 19 }).addTo(
        mapInstanceRef.current
      );
      satelliteLabelsLayerRef.current = labels;
    } else {
      // Calque Standard OSM
      const streetsLayer = L.tileLayer(TILE_LAYERS.streets.url, TILE_LAYERS.streets.options).addTo(
        mapInstanceRef.current
      );
      currentTileLayerRef.current = streetsLayer;
    }

  }, [mapMode]);

  // Mise à jour dynamique des marqueurs
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (markers.length === 0) return;

    const bounds = [];

    markers.forEach((m) => {
      if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
        const marker = L.marker([m.lat, m.lng], { icon: driverIcon }).addTo(
          markersLayerRef.current
        );

        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'font-size:13px;line-height:1.4;min-width:180px';
        const title = document.createElement('strong');
        title.textContent = m.title || 'Livreur en route';
        popupContent.append(title);
        if (m.details) {
          const details = document.createElement('p');
          details.textContent = m.details;
          popupContent.append(details);
        }
        const freshness = document.createElement('div');
        freshness.textContent = m.isOutdated ? 'Signal GPS ancien (> 3 min)' : 'Signal GPS récent';
        freshness.style.cssText = `margin-top:6px;padding:3px 6px;border-radius:4px;font-size:11px;background:${m.isOutdated ? '#fef3c7' : '#dcfce7'};color:${m.isOutdated ? '#92400e' : '#166534'}`;
        popupContent.append(freshness);

        marker.bindPopup(popupContent);
        bounds.push([m.lat, m.lng]);
      }
    });

    if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], zoom);
    } else if (bounds.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, zoom]);

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      {/* Sélecteur de calque élégant (Plan vs Satellite) */}
      {showLayerToggle && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-slate-200/80 flex items-center gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMapMode('streets')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              mapMode === 'streets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>🗺️</span>
            <span>Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              mapMode === 'satellite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>
        </div>
      )}

      {/* Conteneur de la carte Leaflet */}
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', borderRadius: '14px', overflow: 'hidden' }}
        className="shadow-sm border border-slate-200"
      />
    </div>
  );
}
