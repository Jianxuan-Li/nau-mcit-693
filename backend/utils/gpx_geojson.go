package utils

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"strings"
)

// GPX represents the GPX XML structure
type GPX struct {
	XMLName xml.Name `xml:"gpx"`
	Tracks  []Track  `xml:"trk"`
	Routes  []Route  `xml:"rte"`
	Waypoints []Waypoint `xml:"wpt"`
}

// Track represents a GPX track
type Track struct {
	Name     string    `xml:"name"`
	Segments []Segment `xml:"trkseg"`
}

// Route represents a GPX route (different from track)
type Route struct {
	Name   string     `xml:"name"`
	Points []Waypoint `xml:"rtept"`
}

// Segment represents a track segment
type Segment struct {
	Points []Waypoint `xml:"trkpt"`
}

// Waypoint represents a GPS point (used in tracks, routes, and standalone waypoints)
type Waypoint struct {
	Lat  float64 `xml:"lat,attr"`
	Lon  float64 `xml:"lon,attr"`
	Ele  *float64 `xml:"ele,omitempty"`
	Time *string  `xml:"time,omitempty"`
	Name *string  `xml:"name,omitempty"`
}

// GeoJSON structures
type GeoJSON struct {
	Type     string      `json:"type"`
	Features []Feature   `json:"features"`
}

type Feature struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Geometry   Geometry               `json:"geometry"`
}

type Geometry struct {
	Type        string      `json:"type"`
	Coordinates interface{} `json:"coordinates"`
}

// ParseGPX parses GPX content and returns the GPX structure
func ParseGPX(content []byte) (*GPX, error) {
	var gpx GPX
	err := xml.Unmarshal(content, &gpx)
	if err != nil {
		return nil, fmt.Errorf("failed to parse GPX: %w", err)
	}
	return &gpx, nil
}

// ConvertGPXToGeoJSON converts GPX data to GeoJSON format
func ConvertGPXToGeoJSON(gpx *GPX) (*GeoJSON, error) {
	geoJSON := &GeoJSON{
		Type:     "FeatureCollection",
		Features: []Feature{},
	}

	// Convert tracks to LineString features
	for i, track := range gpx.Tracks {
		for j, segment := range track.Segments {
			if len(segment.Points) == 0 {
				continue
			}

			coordinates := make([][]float64, 0, len(segment.Points))
			for _, point := range segment.Points {
				// GeoJSON uses [longitude, latitude] order
				coord := []float64{point.Lon, point.Lat}
				if point.Ele != nil {
					coord = append(coord, *point.Ele)
				}
				coordinates = append(coordinates, coord)
			}

			if len(coordinates) > 0 {
				feature := Feature{
					Type: "Feature",
					Properties: map[string]interface{}{
						"name": track.Name,
						"type": "track",
						"track_index": i,
						"segment_index": j,
					},
					Geometry: Geometry{
						Type:        "LineString",
						Coordinates: coordinates,
					},
				}
				geoJSON.Features = append(geoJSON.Features, feature)
			}
		}
	}

	// Convert routes to LineString features
	for i, route := range gpx.Routes {
		if len(route.Points) == 0 {
			continue
		}

		coordinates := make([][]float64, 0, len(route.Points))
		for _, point := range route.Points {
			coord := []float64{point.Lon, point.Lat}
			if point.Ele != nil {
				coord = append(coord, *point.Ele)
			}
			coordinates = append(coordinates, coord)
		}

		if len(coordinates) > 0 {
			feature := Feature{
				Type: "Feature",
				Properties: map[string]interface{}{
					"name": route.Name,
					"type": "route",
					"route_index": i,
				},
				Geometry: Geometry{
					Type:        "LineString",
					Coordinates: coordinates,
				},
			}
			geoJSON.Features = append(geoJSON.Features, feature)
		}
	}

	// Convert waypoints to Point features
	for i, waypoint := range gpx.Waypoints {
		coord := []float64{waypoint.Lon, waypoint.Lat}
		if waypoint.Ele != nil {
			coord = append(coord, *waypoint.Ele)
		}

		properties := map[string]interface{}{
			"type": "waypoint",
			"waypoint_index": i,
		}
		if waypoint.Name != nil {
			properties["name"] = *waypoint.Name
		}
		if waypoint.Time != nil {
			properties["time"] = *waypoint.Time
		}

		feature := Feature{
			Type:       "Feature",
			Properties: properties,
			Geometry: Geometry{
				Type:        "Point",
				Coordinates: coord,
			},
		}
		geoJSON.Features = append(geoJSON.Features, feature)
	}

	if len(geoJSON.Features) == 0 {
		return nil, fmt.Errorf("no valid GPS data found in GPX file")
	}

	return geoJSON, nil
}

// ProcessGPXToGeoJSON processes GPX content and returns GeoJSON string
func ProcessGPXToGeoJSON(content []byte) (string, error) {
	// Parse GPX
	gpx, err := ParseGPX(content)
	if err != nil {
		return "", fmt.Errorf("failed to parse GPX: %w", err)
	}

	// Convert to GeoJSON
	geoJSON, err := ConvertGPXToGeoJSON(gpx)
	if err != nil {
		return "", fmt.Errorf("failed to convert to GeoJSON: %w", err)
	}

	// Marshal to JSON string
	jsonBytes, err := json.Marshal(geoJSON)
	if err != nil {
		return "", fmt.Errorf("failed to marshal GeoJSON: %w", err)
	}

	return string(jsonBytes), nil
}

// ExtractMainLineString extracts the primary LineString from GeoJSON for PostGIS processing
// This is useful for getting the main track/route path for spatial calculations
func ExtractMainLineString(geoJSONStr string) (string, error) {
	var geoJSON GeoJSON
	err := json.Unmarshal([]byte(geoJSONStr), &geoJSON)
	if err != nil {
		return "", fmt.Errorf("failed to parse GeoJSON: %w", err)
	}

	// Find the first LineString feature (usually the main track)
	for _, feature := range geoJSON.Features {
		if feature.Geometry.Type == "LineString" {
			// Convert coordinates to WKT LINESTRING format
			coords, ok := feature.Geometry.Coordinates.([]interface{})
			if !ok {
				continue
			}

			wktCoords := make([]string, 0, len(coords))
			for _, coord := range coords {
				coordArray, ok := coord.([]interface{})
				if !ok || len(coordArray) < 2 {
					continue
				}
				
				lon, ok1 := coordArray[0].(float64)
				lat, ok2 := coordArray[1].(float64)
				if !ok1 || !ok2 {
					continue
				}
				
				wktCoords = append(wktCoords, fmt.Sprintf("%f %f", lon, lat))
			}

			if len(wktCoords) > 0 {
				return fmt.Sprintf("LINESTRING(%s)", strings.Join(wktCoords, ", ")), nil
			}
		}
	}

	return "", fmt.Errorf("no LineString geometry found in GeoJSON")
}