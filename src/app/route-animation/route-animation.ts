import { Component, OnInit, OnDestroy, signal, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

interface RoutePoint {
  coords: [number, number];
  name: string;
  timestamp?: string;
}

interface ApiResponse {
  LAT: number;
  LNG: number;
  ANGLE: number;
  DEVICE_NO: number;
  DEVICE_SIM: number;
  GPS_TIME: number;
  HIGH: number;
  IOS_TABLE: number;
  OBJECT_FLAG: number;
  PORT: number;
  RCV_TIME: number;
  SPEED: number;
  STARS: number;
  STA_TABLE: number;
  VALID: number;
}

interface Position {
  lat: number;
  lng: number;
  speed?: number;
}

@Component({
  selector: 'app-route-animation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div id="map" class="map-container"></div>
      <div class="controls">
        <h3>🚚 Tracking GPS en Tiempo Real</h3>
        <div class="input-group">
          <label for="unidad">Nombre de la Unidad:</label>
          <input
            id="unidad"
            type="text"
            [(ngModel)]="unidadName"
            placeholder="Ej: unidad, vehiculo01, etc."
            [disabled]="isTracking()"
            class="input-field"
          >
        </div>
        <div class="button-group">
          <button
            (click)="startTracking()"
            [disabled]="isTracking() || !unidadName()"
            class="btn btn-start"
          >
            {{ isTracking() ? '🔄 Rastreando...' : '🚀 Iniciar Tracking' }}
          </button>
          <button
            (click)="stopTracking()"
            [disabled]="!isTracking()"
            class="btn btn-stop"
          >
            ⏹️ Detener
          </button>
          <button
            (click)="testApiCall()"
            [disabled]="!unidadName()"
            class="btn btn-test"
          >
            🧪 Test API
          </button>
          <button
            (click)="clearMap()"
            class="btn btn-clear"
          >
            🗑️ Limpiar Mapa
          </button>
        </div>
        <div class="status">
          <p><strong>Estado:</strong> {{ status() }}</p>
          <p><strong>Última actualización:</strong> {{ lastUpdate() || 'Nunca' }}</p>
          <p><strong>Total puntos:</strong> {{ routePoints().length }}</p>
          @if (currentPosition()) {
            <div class="current-position">
              <p><strong>📍 Posición actual:</strong></p>
              <p>Lat: {{ currentPosition()!.lat }}, Lng: {{ currentPosition()!.lng }}</p>
              @if (currentSpeed() !== null) {
                <p><strong>🚗 Velocidad:</strong> {{ currentSpeed() }} km/h</p>
              }
            </div>
          }
        </div>
        <div class="debug-section">
          <h4>🔧 Debug Info</h4>
          <div class="debug-info">
            <p><strong>Intervalo ID:</strong> {{ intervalId || 'No activo' }}</p>
            <p><strong>Mapa inicializado:</strong> {{ map ? 'Sí' : 'No' }}</p>
            <p><strong>API URL:</strong> {{ getCurrentApiUrl() }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./route-animation.css']
})
export class RouteAnimationComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);

  unidadName = signal<string>('unidad');
  isTracking = signal<boolean>(false);
  status = signal<string>('Detenido');
  lastUpdate = signal<string>('');
  currentPosition = signal<Position | null>(null);
  currentSpeed = signal<number | null>(null);
  routePoints = signal<RoutePoint[]>([]);

  map: L.Map | null = null;
  private currentMarker: L.Marker | null = null;
  private routePath: L.Polyline | null = null;
  intervalId: number | null = null;
  private firstPositionSet = false;

  ngOnInit() {
    console.log('RouteAnimationComponent iniciado');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy() {
    this.stopTracking();
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap() {
    console.log('🗺️ Inicializando mapa en Ciudad de Panamá...');

    try {
      this.map = L.map('map', {
        center: [8.9824, -79.5199], // Ciudad de Panamá, Panamá
        zoom: 15
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      console.log('✅ Mapa inicializado correctamente en Ciudad de Panamá');
    } catch (error) {
      console.error('❌ Error al inicializar el mapa:', error);
    }
  }

  private createMarkerIcon(): L.Icon {
    // Usar el icono original de Leaflet - sin personalización
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  testApiCall() {
    console.log('=== INICIANDO TEST DEL API ===');
    const apiUrl = 'https://www.logistictodo.com:5001/user99/unidad';
    console.log('URL completa:', apiUrl);

    this.http.get<any>(apiUrl).subscribe({
      next: (data) => {
        console.log('=== RESPUESTA COMPLETA DEL API ===');
        console.log('Datos brutos:', data);
        console.log('Tipo de datos:', typeof data);
        console.log('Es array:', Array.isArray(data));
        console.log('JSON stringify:', JSON.stringify(data, null, 2));

        console.log('=== PROCESANDO ESTRUCTURA DE ARRAY ANIDADO ===');

        // El API devuelve [[{objeto}]] - un array dentro de otro array
        if (Array.isArray(data) && data.length > 0) {
          console.log('✅ Es array, primer elemento:', data[0]);

          if (Array.isArray(data[0]) && data[0].length > 0) {
            console.log('✅ Primer elemento también es array, objeto interno:', data[0][0]);
            const gpsData = data[0][0];

            console.log('=== ANÁLISIS DEL OBJETO GPS ===');
            console.log('Propiedades del objeto GPS:', Object.keys(gpsData));
            console.log('LAT:', gpsData.LAT, '(tipo:', typeof gpsData.LAT, ')');
            console.log('LNG:', gpsData.LNG, '(tipo:', typeof gpsData.LNG, ')');
            console.log('SPEED:', gpsData.SPEED, '(tipo:', typeof gpsData.SPEED, ')');
            console.log('VÁLIDO?:', gpsData.VALID);
            console.log('GPS_TIME:', gpsData.GPS_TIME);

            // Procesar los datos GPS
            this.processGpsData(gpsData);
          } else {
            console.log('❌ El primer elemento no es un array válido');
          }
        } else {
          console.log('❌ La respuesta no es un array o está vacía');
        }
      },
      error: (error) => {
        console.error('=== ERROR EN LA LLAMADA AL API ===');
        console.error('Error completo:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
      }
    });
  }

  private processGpsData(gpsData: ApiResponse) {
    console.log('=== PROCESANDO DATOS GPS ===');
    console.log('Datos GPS recibidos:', gpsData);

    // Verificar si los datos son válidos
    if (gpsData.VALID === 0) {
      console.log('⚠️ DATOS GPS NO VÁLIDOS (VALID=0)');
      console.log('Esto puede indicar que el dispositivo GPS no tiene señal o datos de prueba');
      this.status.set('GPS sin señal válida');
      return;
    }

    // Verificar coordenadas y velocidad
    const lat = Number(gpsData.LAT);
    const lng = Number(gpsData.LNG);
    const speed = Number(gpsData.SPEED);

    console.log('Datos extraídos - LAT:', lat, 'LNG:', lng, 'SPEED:', speed);

    if (this.isValidCoordinate(lat, lng)) {
      console.log('✅ Coordenadas válidas encontradas');

      const position: Position = { lat, lng, speed };
      this.currentPosition.set(position);
      this.currentSpeed.set(speed);

      // Agregar a la ruta
      const routePoint: RoutePoint = {
        coords: [lat, lng],
        name: this.unidadName(),
        timestamp: new Date().toISOString()
      };

      this.routePoints.update(points => [...points, routePoint]);
      this.updateMapWithNewPosition(position);
      this.lastUpdate.set(new Date().toLocaleTimeString());
      this.status.set('Ubicación actualizada');

    } else {
      console.log('❌ Coordenadas no válidas:', { lat, lng });
      this.status.set('Coordenadas inválidas recibidas');
    }
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    const isValid = !isNaN(lat) && !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180 &&
           (lat !== 0 || lng !== 0); // Evitar (0,0) que suelen ser datos de prueba

    console.log(`Validando coordenadas lat=${lat}, lng=${lng}: ${isValid ? '✅ VÁLIDAS' : '❌ INVÁLIDAS'}`);
    return isValid;
  }

  private updateMapWithNewPosition(position: Position) {
    if (!this.map) {
      console.warn('⚠️ Mapa no disponible para actualizar');
      return;
    }

    console.log('🗺️ Actualizando mapa con posición:', position);
    const latLng = L.latLng(position.lat, position.lng);

    // Auto-centrar en la primera posición
    if (!this.firstPositionSet) {
      console.log('🎯 Centrando mapa en primera posición');
      this.map.setView(latLng, 16);
      this.firstPositionSet = true;
    }

    // Actualizar marcador de taxi actual
    const isMoving = position.speed !== undefined && position.speed > 0;

    if (this.currentMarker) {
      // Actualizar posición del marcador
      this.currentMarker.setLatLng(latLng);
    } else {
      // Crear nuevo marcador con icono original
      this.currentMarker = L.marker(latLng, {
        icon: this.createMarkerIcon()
      })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center; min-width: 200px;">
            <h4 style="margin: 5px 0; color: #f39c12;">� ${this.unidadName()}</h4>
            <div style="margin: 8px 0;">
              <strong>📍 Posición:</strong><br>
              <span style="font-family: monospace;">Lat: ${position.lat.toFixed(6)}</span><br>
              <span style="font-family: monospace;">Lng: ${position.lng.toFixed(6)}</span>
            </div>
            ${position.speed !== undefined ?
              `<div style="margin: 8px 0; padding: 5px; background: ${position.speed > 0 ? '#d4edda' : '#f8d7da'}; border-radius: 4px;">
                <strong>🚗 Velocidad:</strong> ${position.speed} km/h
                ${position.speed > 0 ? '<br><small>🟢 En movimiento</small>' : '<br><small>🔴 Detenido</small>'}
              </div>` : ''}
            <div style="margin: 8px 0; font-size: 12px; color: #6c757d;">
              <strong>⏰ Actualizado:</strong><br>
              ${new Date().toLocaleString()}
            </div>
          </div>
        `);
    }

    this.updateRoutePath();
  }

  private updateRoutePath() {
    if (!this.map) return;

    const points = this.routePoints();
    if (points.length < 2) return;

    const coordinates: [number, number][] = points.map(point => point.coords);

    if (this.routePath) {
      this.routePath.setLatLngs(coordinates);
    } else {
      this.routePath = L.polyline(coordinates, {
        color: '#007bff',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(this.map);
    }
  }

  startTracking() {
    if (this.isTracking() || !this.unidadName()) return;

    console.log('🚀 Iniciando tracking para:', this.unidadName());
    this.isTracking.set(true);
    this.status.set('Iniciando...');
    this.firstPositionSet = false;

    // Primera llamada inmediata
    this.fetchLocationData();

    // Configurar polling cada 2 segundos (2000ms)
    this.intervalId = window.setInterval(() => {
      this.fetchLocationData();
    }, 2000);

    this.status.set('Rastreando en tiempo real');
  }

  stopTracking() {
    console.log('⏹️ Deteniendo tracking...');
    this.isTracking.set(false);
    this.status.set('Detenido');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  clearMap() {
    console.log('🗑️ Limpiando mapa...');
    this.stopTracking();
    this.routePoints.set([]);
    this.currentPosition.set(null);
    this.currentSpeed.set(null);
    this.lastUpdate.set('');
    this.firstPositionSet = false;

    if (this.map) {
      if (this.currentMarker) {
        this.map.removeLayer(this.currentMarker);
        this.currentMarker = null;
      }
      if (this.routePath) {
        this.map.removeLayer(this.routePath);
        this.routePath = null;
      }
    }
    this.status.set('Mapa limpiado');
  }

  private fetchLocationData() {
    const apiUrl = this.getCurrentApiUrl();

    this.http.get<any>(apiUrl).subscribe({
      next: (data) => {
        console.log('📍 Datos GPS recibidos en tracking:', data);

        // Procesar la estructura de array anidado
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) && data[0].length > 0) {
          const gpsData = data[0][0];
          this.processGpsData(gpsData);
        } else {
          console.warn('⚠️ Estructura de datos inesperada en tracking');
        }
      },
      error: (error) => {
        console.error('❌ Error en tracking:', error);
        this.status.set(`Error: ${error.message || 'Conexión fallida'}`);
      }
    });
  }

  getCurrentApiUrl(): string {
    return `https://www.logistictodo.com:5001/user99/${this.unidadName()}`;
  }
}
