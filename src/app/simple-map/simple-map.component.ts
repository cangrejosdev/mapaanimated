import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-simple-map',
  standalone: true,
  template: `
    <div style="background: #f0f0f0; padding: 10px; margin: 10px 0;">
      <p><strong>Estado:</strong> {{ status }}</p>
    </div>
    <div
      style="width: 100%; height: 400px; border: 2px solid #ccc; background: #e8f4f8;"
      id="simple-map">
    </div>
    <div style="margin-top: 10px;">
      <p><small>Si el mapa no aparece, revisa la consola del navegador (F12)</small></p>
    </div>
  `,
  styles: []
})
export class SimpleMapComponent implements AfterViewInit {
  status = 'Iniciando...';

  ngAfterViewInit(): void {
    console.log('SimpleMapComponent: Inicializando...');

    setTimeout(() => {
      try {
        const mapElement = document.getElementById('simple-map');
        console.log('Elemento encontrado:', mapElement);

        if (!mapElement) {
          this.status = 'Error: Elemento no encontrado';
          return;
        }

        // Configurar iconos de Leaflet con assets locales
        const iconRetinaUrl = '/leaflet/marker-icon-2x.png';
        const iconUrl = '/leaflet/marker-icon.png';
        const shadowUrl = '/leaflet/marker-shadow.png';

        const iconDefault = L.icon({
          iconRetinaUrl,
          iconUrl,
          shadowUrl,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28],
          shadowSize: [41, 41]
        });
        L.Marker.prototype.options.icon = iconDefault;

        this.status = 'Intentando crear mapa...';

        // Crear mapa simple
        const map = L.map('simple-map', {
          center: [9.2, -80.5],
          zoom: 7,
          zoomControl: true
        });

        console.log('Mapa inicializado:', map);
        this.status = 'Mapa inicializado, cargando tiles...';

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        });

        tileLayer.addTo(map);
        console.log('Tiles agregados');

        // Evento cuando los tiles se cargan
        tileLayer.on('load', () => {
          this.status = 'Tiles cargados correctamente';
          console.log('Tiles cargados exitosamente');
        });

        // Agregar un marcador
        const marker = L.marker([9.2, -80.5]).addTo(map);
        marker.bindPopup('¡Panamá!').openPopup();

        console.log('Marcador agregado');
        this.status = 'Mapa completado';

        // Forzar redimensionado del mapa
        setTimeout(() => {
          map.invalidateSize();
          this.status = 'Mapa redimensionado';
        }, 100);

      } catch (error) {
        console.error('Error:', error);
        this.status = `Error: ${error}`;
      }
    }, 500);
  }
}
