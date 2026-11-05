// Single-location map of a project (Überblick › Standort): the shared map slot with one pin. The card sits in the middle of a
// scrolling page, so the wheel must not zoom it by accident (cooperative gestures); the dashboard map keeps the plain wheel zoom.
import { mountMap, unmountMap } from './map.js';

export const unmountProjectMap = unmountMap;

export function mountProjectMap(host, ctx, project) {
  if (!project || !project.location) return;
  const cfg = ctx.data.projects.map || {};
  const { lng, lat } = project.location;
  mountMap(host, {
    key: 'project:' + project.id, cfg, center: [lng, lat], zoom: cfg.projectZoom || 15, fallback: '.ov-map-fallback', cooperative: true,
    build: (map, maplibregl) => {
      const pin = document.createElement('span');
      pin.className = 'map-pin';
      pin.title = project.name;
      new maplibregl.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map);
    },
  });
}
