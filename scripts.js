import Map from "ol/Map";
import View from "ol/View";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { Draw, Select } from "ol/interaction";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { click } from "ol/events/condition";
import { Feature } from "ol";
import Polygon from "ol/geom/Polygon";
import WKT from "ol/format/WKT";
import { fromLonLat } from "ol/proj";
import GeometryCollection from "ol/geom/GeometryCollection";
import * as turf from "@turf/turf";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";

const raster = new TileLayer({
  source: new OSM(),
});

const source = new VectorSource();
const vector = new VectorLayer({
  source: source,
  style: new Style({
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.2)",
    }),
    stroke: new Stroke({
      color: "#ffcc33",
      width: 2,
    }),
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({
        color: "#ffcc33",
      }),
    }),
  }),
});

// Limit multi-world panning to one world east and west of the real world.
// Geometry coordinates have to be within that range.

const map = new Map({
  layers: [raster, vector],
  target: "map",
  view: new View({
    center: [2206125.510367, 5060929.083961],
    zoom: 14,
  }),
});

let draw, selectClick;

const selected = new Style({
  fill: new Fill({
    color: "#eeeeee",
  }),
  stroke: new Stroke({
    color: "rgba(255, 255, 255, 0.7)",
    width: 2,
  }),
});

function selectStyle(feature) {
  const color = feature.get("COLOR") || "#eeeeee";
  selected.getFill().setColor(color);
  return selected;
}

const selectElement = document.getElementById("select");

function addDrawing() {
  draw = new Draw({
    source: source,
    type: "Polygon",
  });
  map.addInteraction(draw);
}
addDrawing();

function selectFeatures() {
  selectClick = new Select({
    condition: click,
    style: selectStyle,
  });
  map.addInteraction(selectClick);
}
selectFeatures();

selectElement.addEventListener("click", function () {
  map.removeInteraction(draw);
  map.addInteraction(selectClick);
  map.addInteraction(selectClick);
});

var polygons = [];
let poly1Feature, poly2Feature;

const mergeButton = document.getElementById("merge-button");

draw.on("drawend", function (evt) {
  // get the drawn polygon geometry and add it to the polygons array
  var feature = evt.feature;
  var geometry = feature.getGeometry();
  var coords = geometry.getCoordinates();
  polygons.push(coords);

  if (polygons.length >= 2) {
    map.removeInteraction(draw);
  }
});

//FIRST SUCCESSFUL ATTEMPT
mergeButton.addEventListener("click", function () {
  // create a separate feature for each polygon and add them to the vector source
  poly1Feature = new Feature({
    geometry: new Polygon([polygons[0]]),
  });
  poly2Feature = new Feature({
    geometry: new Polygon([polygons[1]]),
  });

  // Convert the OpenLayers features to GeoJSON features
  const geojsonFormat = new GeoJSON();
  const poly1Geojson = geojsonFormat.writeFeatureObject(poly1Feature);
  const poly2Geojson = geojsonFormat.writeFeatureObject(poly2Feature);

  // Merge the two GeoJSON features into a single GeoJSON feature
  const mergedGeojson = turf.union(poly1Geojson, poly2Geojson);

  // Convert the merged GeoJSON feature back to an OpenLayers feature
  const mergedFeature = geojsonFormat.readFeature(mergedGeojson);

  // add the merged feature to the vector source and remove the original features
  source.clear();
  source.addFeature(mergedFeature);
});
