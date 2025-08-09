// Map clustering utility for better performance with dense markers
import { Place } from '@/lib/supabase';

export interface ClusterPoint {
  lat: number;
  lng: number;
  place: Place;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  places: Place[];
  count: number;
}

export interface ClusteringOptions {
  gridSize: number; // Size of clustering grid in pixels
  maxZoom: number;  // Maximum zoom level to cluster
  minimumClusterSize: number; // Minimum places to form a cluster
}

const defaultOptions: ClusteringOptions = {
  gridSize: 60,
  maxZoom: 15,
  minimumClusterSize: 2,
};

/**
 * Simple grid-based clustering algorithm
 * Groups nearby markers into clusters for better map performance
 */
export class MapClusterer {
  private options: ClusteringOptions;
  private clusters: Cluster[] = [];

  constructor(options: Partial<ClusteringOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Cluster places based on their geographic proximity
   */
  clusterPlaces(places: Place[], zoom: number): Cluster[] {
    // Reset clusters
    this.clusters = [];

    // Don't cluster at high zoom levels
    if (zoom > this.options.maxZoom) {
      return places.map(place => ({
        id: `single_${place.id}`,
        lat: place.latitude,
        lng: place.longitude,
        places: [place],
        count: 1,
      }));
    }

    // Convert places to cluster points
    const points: ClusterPoint[] = places.map(place => ({
      lat: place.latitude,
      lng: place.longitude,
      place,
    }));

    // Group points by grid cells
    const gridCells = new Map<string, ClusterPoint[]>();
    const gridSize = this.getGridSize(zoom);

    points.forEach(point => {
      const cellKey = this.getGridCellKey(point, gridSize);
      if (!gridCells.has(cellKey)) {
        gridCells.set(cellKey, []);
      }
      gridCells.get(cellKey)!.push(point);
    });

    // Create clusters from grid cells
    gridCells.forEach((cellPoints, cellKey) => {
      if (cellPoints.length >= this.options.minimumClusterSize) {
        // Create cluster from multiple points
        const centerLat = cellPoints.reduce((sum, p) => sum + p.lat, 0) / cellPoints.length;
        const centerLng = cellPoints.reduce((sum, p) => sum + p.lng, 0) / cellPoints.length;

        this.clusters.push({
          id: `cluster_${cellKey}`,
          lat: centerLat,
          lng: centerLng,
          places: cellPoints.map(p => p.place),
          count: cellPoints.length,
        });
      } else {
        // Single markers for small groups
        cellPoints.forEach(point => {
          this.clusters.push({
            id: `single_${point.place.id}`,
            lat: point.lat,
            lng: point.lng,
            places: [point.place],
            count: 1,
          });
        });
      }
    });

    return this.clusters;
  }

  /**
   * Get grid size based on zoom level
   */
  private getGridSize(zoom: number): number {
    // Larger grid at lower zoom levels for more aggressive clustering
    const zoomFactor = Math.max(1, 20 - zoom);
    return this.options.gridSize * zoomFactor;
  }

  /**
   * Get grid cell key for a point
   */
  private getGridCellKey(point: ClusterPoint, gridSize: number): string {
    // Simple grid-based key
    const lat = Math.floor(point.lat * 1000000 / gridSize);
    const lng = Math.floor(point.lng * 1000000 / gridSize);
    return `${lat}_${lng}`;
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

/**
 * Advanced clustering using distance-based algorithm
 */
export class AdvancedMapClusterer {
  private options: ClusteringOptions & { maxDistance: number };

  constructor(options: Partial<ClusteringOptions & { maxDistance: number }> = {}) {
    this.options = { 
      ...defaultOptions, 
      maxDistance: 0.5, // 500 meters
      ...options 
    };
  }

  /**
   * Cluster places using distance-based algorithm
   */
  clusterPlaces(places: Place[], zoom: number): Cluster[] {
    if (zoom > this.options.maxZoom) {
      return places.map(place => ({
        id: `single_${place.id}`,
        lat: place.latitude,
        lng: place.longitude,
        places: [place],
        count: 1,
      }));
    }

    const clusters: Cluster[] = [];
    const processed = new Set<string>();

    places.forEach(place => {
      if (processed.has(place.id)) return;

      // Find nearby places
      const nearbyPlaces = places.filter(otherPlace => {
        if (processed.has(otherPlace.id) || place.id === otherPlace.id) return false;
        
        const distance = this.calculateDistance(
          place.latitude, place.longitude,
          otherPlace.latitude, otherPlace.longitude
        );
        
        return distance <= this.options.maxDistance;
      });

      if (nearbyPlaces.length >= this.options.minimumClusterSize - 1) {
        // Create cluster
        const allPlaces = [place, ...nearbyPlaces];
        const centerLat = allPlaces.reduce((sum, p) => sum + p.latitude, 0) / allPlaces.length;
        const centerLng = allPlaces.reduce((sum, p) => sum + p.longitude, 0) / allPlaces.length;

        clusters.push({
          id: `cluster_${place.id}`,
          lat: centerLat,
          lng: centerLng,
          places: allPlaces,
          count: allPlaces.length,
        });

        // Mark all places as processed
        allPlaces.forEach(p => processed.add(p.id));
      } else if (!processed.has(place.id)) {
        // Single marker
        clusters.push({
          id: `single_${place.id}`,
          lat: place.latitude,
          lng: place.longitude,
          places: [place],
          count: 1,
        });
        processed.add(place.id);
      }
    });

    return clusters;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

/**
 * Utility functions for cluster visualization
 */
export const ClusterUtils = {
  /**
   * Get cluster color based on number of places
   */
  getClusterColor(count: number): string {
    if (count < 5) return '#007AFF';
    if (count < 10) return '#FF9500';
    if (count < 20) return '#FF3B30';
    return '#5856D6';
  },

  /**
   * Get cluster size based on number of places
   */
  getClusterSize(count: number): number {
    if (count < 5) return 40;
    if (count < 10) return 50;
    if (count < 20) return 60;
    return 70;
  },

  /**
   * Generate cluster icon SVG
   */
  generateClusterIcon(count: number, size: number = 50): string {
    const color = this.getClusterColor(count);
    const fontSize = size * 0.4;
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${count}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  },

  /**
   * Get cluster tooltip text
   */
  getClusterTooltip(cluster: Cluster): string {
    if (cluster.count === 1) {
      return cluster.places[0].name;
    }
    
    const categories = [...new Set(cluster.places.map(p => p.category))];
    const categoryText = categories.length === 1 ? categories[0] : `${categories.length} categories`;
    
    return `${cluster.count} places (${categoryText})`;
  },
};