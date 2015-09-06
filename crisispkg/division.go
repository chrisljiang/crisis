package crisis

import (
	"encoding/json"
)

type Division struct {
	Id      int
	Units   map[string]int
	DivName string
	FacName string
	CoordX  int
	CoordY  int
	Speed   int
}

type Unit struct {
	Utype  string
	Amount int
}

func (d Division) MarshalJSON() ([]byte, error) {
	divJson := struct {
		AbsCoords Coords
		Units     []Unit
	}{
		Coords{d.CoordX, d.CoordY},
		unitMapToSlice(d.Units),
	}
	return json.Marshal(divJson)
}

func unitMapToSlice(umap map[string]int) []Unit {
	result := make([]Unit, len(umap))
	for utype, amount := range umap {
		result = append(result, Unit{utype, amount})
	}
	return result
}
