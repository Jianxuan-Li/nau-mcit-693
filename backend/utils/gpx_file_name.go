package utils

import (
	"strings"
)

func GenerateGPXFileName(routeName string, routeID string) string {
	replacer := strings.NewReplacer(" ", "_", "　", "_")
	name := replacer.Replace(routeName)

	var filtered []rune
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			filtered = append(filtered, r)
		}
	}
	name = string(filtered)

	name = strings.ToLower(name)

	if name == "" {
		name = routeID
	}

	return name + ".gpx"
}
