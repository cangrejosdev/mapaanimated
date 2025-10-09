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
    <!-- Container Principal - 100% responsive -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">

      <!-- Header Superior con gradiente moderno -->
      <header class="bg-gradient-to-r from-orange-500 via-orange-300 to-orange-200 shadow-2xl">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 sm:h-20">
            <!-- Logo y Título -->
            <div class="flex items-center space-x-3">
              <div class="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <span class="text-2xl sm:text-3xl">🚚</span>
              </div>
              <div>
                <h1 class="text-lg sm:text-xl lg:text-2xl font-bold text-white">GPS Tracker Pro</h1>
                <p class="text-xs sm:text-sm text-white/80 hidden sm:block">Rastreo en Tiempo Real</p>
              </div>
            </div>

            <!-- Estado Badge -->
            <div class="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full">
              <div class="w-2 h-2 rounded-full {{ isTracking() ? 'bg-green-400 animate-pulse' : 'bg-gray-300' }}"></div>
              <span class="text-white text-xs sm:text-sm font-medium">{{ isTracking() ? 'Activo' : 'Inactivo' }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Contenedor Principal - Layout Responsive con Mapa Predominante -->
      <div class="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">

        <!-- Mapa - Ocupa la mayor parte de la pantalla con card style -->
        <div class="h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-auto lg:flex-1 relative order-2 lg:order-1">
          <!-- Card contenedor del mapa con bordes redondeados y sombra -->
          <div class="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-300">
            <div id="map" class="w-full h-full rounded-2xl"></div>
          </div>

          <!-- Badge de información flotante sobre el mapa -->
          @if (currentPosition()) {
            <div class="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-3 sm:p-4 max-w-xs z-[1000] border-2 border-slate-300">
              <div class="flex items-center space-x-2 mb-2">
                <span class="text-lg">�</span>
                <h3 class="font-bold text-gray-800 text-sm sm:text-base">Ubicación Actual</h3>
              </div>
              <div class="space-y-1 text-xs sm:text-sm text-gray-600">
                <p><strong>Lat:</strong> {{ currentPosition()!.lat.toFixed(6) }}</p>
                <p><strong>Lng:</strong> {{ currentPosition()!.lng.toFixed(6) }}</p>
                @if (currentSpeed() !== null) {
                  <div class="mt-2 pt-2 border-t border-gray-200">
                    <p class="text-indigo-600 font-bold">🚗 {{ currentSpeed() }} km/h</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Panel de Control - Sidebar compacto para maximizar el mapa -->
        <div class="w-full lg:w-80 xl:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-300 order-1 lg:order-2 flex flex-col max-h-[40vh] lg:max-h-full">

          <!-- Header del Panel -->
          <!-- <div class="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-t-2xl">
            <h2 class="text-lg sm:text-xl font-bold flex items-center gap-2">
              <span>⚡</span> Panel de Control
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">Configure el rastreo GPS</p>
          </div> -->

          <!-- Contenido Scrolleable del Panel -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

            <!-- Input de Unidad - Card moderna -->
            <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-slate-300">
              <label for="unidad" class="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2">
                <span>🏷️</span> Nombre de la Unidad
              </label>
              <input
                id="unidad"
                type="text"
                [(ngModel)]="unidadName"
                placeholder="Ingrese el nombre de la unidad a rastrear (ej: unidad, vehiculo01, truck_05)"
                [disabled]="isTracking()"
                class="w-full px-4 py-3 sm:py-4 text-sm sm:text-base bg-white border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-sm"
              >
            </div>

            <!-- Botones de Control - Flexbox Horizontal Responsive -->
            <div class="space-y-3">
              <!-- Botón Iniciar - Ancho completo -->
              <button
                (click)="startTracking()"
                [disabled]="isTracking() || !unidadName()"
                class="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 text-sm sm:text-base"
              >
                <span class="flex items-center justify-center gap-2">
                  {{ isTracking() ? '🔄 Rastreando...' : '🚀 Iniciar Tracking' }}
                </span>
              </button>

              <!-- Botones Detener y Limpiar - Flex Horizontal -->
              <div class="flex gap-2 sm:gap-3">
                <!-- Botón Detener -->
                <button
                  (click)="stopTracking()"
                  [disabled]="!isTracking()"
                  class="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 text-xs sm:text-sm"
                >
                  <span class="flex items-center justify-center gap-1 sm:gap-2">
                    <span>⏹️</span>
                    <span class="hidden sm:inline">Detener</span>
                  </span>
                </button>

                <!-- Botón Limpiar -->
                <button
                  (click)="clearMap()"
                  class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all duration-300 text-xs sm:text-sm"
                >
                  <span class="flex items-center justify-center gap-1 sm:gap-2">
                    <span>🗑️</span>
                    <span class="hidden sm:inline">Limpiar</span>
                  </span>
                </button>
              </div>
            </div>

            <!-- Estado del Sistema - Card con gradiente -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-blue-300">
              <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📊</span> Estado del Sistema
              </h3>
              <div class="space-y-2 text-xs sm:text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Estado:</span>
                  <span class="font-bold {{ isTracking() ? 'text-green-600' : 'text-gray-600' }}">
                    {{ status() }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Última actualización:</span>
                  <span class="font-medium text-gray-800">{{ lastUpdate() || 'Nunca' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Total puntos:</span>
                  <span class="font-bold text-indigo-600">{{ routePoints().length }}</span>
                </div>
              </div>
            </div>

            <!-- Lista de Puntos de Ruta - Scrolleable -->
            @if (routePoints().length > 0) {
              <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-slate-300">
                <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🗺️</span> Ruta ({{ routePoints().length }} puntos)
                </h3>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  @for (point of routePoints(); track point.name) {
                    <div class="bg-white rounded-xl p-3 shadow-sm border-2 border-slate-300 hover:shadow-md transition-shadow">
                      <p class="font-bold text-gray-900 text-xs sm:text-sm">{{ point.name }}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ point.coords[0].toFixed(4) }}, {{ point.coords[1].toFixed(4) }}
                      </p>
                      @if (point.timestamp) {
                        <p class="text-xs text-indigo-600 mt-1">🕐 {{ point.timestamp }}</p>
                      }
                    </div>
                  }
                </div>
              </div>
            }

          </div>
        </div>
      </div>

      <!-- Footer Moderno -->
      <footer class="bg-gradient-to-r from-slate-800 to-slate-900 border-t-4 border-indigo-500">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div class="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">

            <!-- Info del Sistema -->
            <div class="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span>Sistema Activo</span>
              </div>
              <div class="flex items-center gap-2">
                <span>📊</span>
                <span>Angular 20</span>
              </div>
              <div class="flex items-center gap-2">
                <span>🗺️</span>
                <span>Leaflet Maps</span>
              </div>
            </div>

            <!-- Copyright -->
            <div class="text-xs sm:text-sm text-slate-400 text-center sm:text-right">
              <p>&copy; 2025 GPS Tracker Pro</p>
            </div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Estilos CSS personalizados para scrollbar -->
    <style>
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      #map {
        position: relative;
        z-index: 0;
      }

      .leaflet-container {
        font-family: inherit;
      }
    </style>
  `,
  styleUrls: ['./route-animation.css']
})
export class RouteAnimationComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);

  unidadName = signal<string>('');
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
