import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useT } from '../i18n';
import { placeProjects } from '../utils/mapPlacement';
import { formatMoney } from '../utils/helpers';

/**
 * The projects on a map of Cameroon. Loaded lazily from ProjectsPage, so the
 * map library costs nothing to anyone who never opens this view.
 *
 * Solid markers are recorded sites; hollow dashed ones sit near their region's
 * centre because the project has no recorded position. The legend says so.
 */

const CAMEROON_VIEW = { center: [7.3, 12.4], zoom: 6 };

/** Status colours come from the theme tokens, so the map follows light and dark mode. */
const STATUS_TOKEN = {
  Planned: '--planned-fg',
  Ongoing: '--progress-fg',
  Stalled: '--stalled-fg',
  Completed: '--done-fg',
};

const tokenColour = (token) => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return rgb ? `rgb(${rgb.split(/\s+/).join(',')})` : '#2e64bc';
};

const escapeHtml = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ProjectMap = ({ projects }) => {
  const t = useT();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const placed = useMemo(() => placeProjects(projects), [projects]);
  const exactCount = placed.filter((p) => p.exact).length;

  useEffect(() => {
    const map = L.map(containerRef.current, { ...CAMEROON_VIEW, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const { project, lat, lng, exact } of placed) {
      const colour = tokenColour(STATUS_TOKEN[project.status] || '--planned-fg');
      const marker = L.circleMarker([lat, lng], {
        radius: exact ? 8 : 7,
        color: colour,
        weight: 2,
        fillColor: colour,
        fillOpacity: exact ? 0.85 : 0.15,
        dashArray: exact ? null : '3 3',
      });

      const popup = document.createElement('div');
      popup.innerHTML = `
        <p style="font-weight:600;margin:0 0 2px">${escapeHtml(project.title)}</p>
        <p style="margin:0">${escapeHtml(project.location)}, ${escapeHtml(project.region)}</p>
        <p style="margin:0">${escapeHtml(t(`status.${project.status}`))} · ${escapeHtml(formatMoney(Number(project.budget) || 0))}</p>
        ${exact ? '' : `<p style="margin:4px 0 0;font-style:italic">${escapeHtml(t('projects.mapApproximate'))}</p>`}
      `;
      const open = document.createElement('a');
      // The app uses HashRouter, so a real link (middle-click, copy) needs the hash.
      open.href = `#/project/${encodeURIComponent(project.id)}`;
      open.textContent = t('projects.mapOpen');
      open.style.display = 'inline-block';
      open.style.marginTop = '6px';
      // Stay inside the single-page app instead of reloading it.
      open.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(`/project/${project.id}`);
      });
      popup.appendChild(open);

      marker.bindPopup(popup).addTo(layer);
    }
  }, [placed, navigate, t]);

  return (
    <div>
      <div
        ref={containerRef}
        className="h-[28rem] w-full overflow-hidden rounded-lg border border-line md:h-[36rem]"
        role="region"
        aria-label={t('projects.mapLabel')}
      />
      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-fg-secondary">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-fg-secondary" aria-hidden="true" />
          {t('projects.mapExact', { count: exactCount })}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-fg-secondary" aria-hidden="true" />
          {t('projects.mapRegionOnly', { count: placed.length - exactCount })}
        </span>
      </p>
    </div>
  );
};

export default ProjectMap;
