var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {});
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var map = L.map('map', {
    layers: [satelite],
    center: [-21.122864, -44.257799],
    zoom: 10
});

var baseMaps = {
    "OpenStreetMap": osm,
    "ARCSatelite": satelite
};

function mapSignal(sig) {
    if (sig <= -110) return 0.10;
    if (sig <= -100) return 0.25;
    if (sig <= -95) return 0.40;
    if (sig <= -90) return 0.55;
    if (sig <= -85) return 0.70;
    if (sig <= -80) return 0.85;
    return 1.00;
}

var inputFile = document.getElementById("csvinput");
var input_x = document.getElementById("input_x");
var input_y = document.getElementById("input_y");
var input_cord = document.getElementById("input_cord");
var input_delimiter = document.getElementById("input_delimiter");
var input_selection = document.getElementById("input_selection");
var heatmap_selection = document.getElementById("Heatmap_selection");
var button_save = document.getElementById("button_save");
var button_file = document.getElementById("button_file");
var nome_arquivo = document.getElementById("nomeArquivo");
var delimitador = document.getElementById("delimitador");
var heatmap_cord = document.getElementById("heatmap_cord");
var mid_sig = document.getElementById("mid_sig");
var latlong_div = document.querySelector(".latlong");
var cord_div = document.querySelector(".cord");
var data_div = document.querySelector(".data_div");
var order_div = document.querySelector(".order_div");
var heatLegend = document.getElementById("heatLegend");
var button_fechar = document.querySelector(".close_btn");
var isHeatmap = true;

var rowX = "", rowY = "", rowCord = "", delimiter = ",", row_heat="", row_midsig="", isPolygon = false;
var arquivo = null;
var isShapefile = false;

var overlays = {};
var layerControl = L.control.layers(baseMaps, overlays).addTo(map);
map.on('overlayadd', function(e) {
    if (e.name === layerName) {
        heatLegend.style.display = "block";
    }
});

map.on('overlayremove', function(e) {
    if (e.name === layerName) {
        heatLegend.style.display = "none";
    }
});

function setModeForShapefile() {
    input_selection.value = "";
    cord_div.classList.remove("visible");
    latlong_div.classList.remove("visible");
    input_selection.classList.add("invisible");
    delimitador.classList.add("invisible");

    input_selection.disabled = true;
    input_x.disabled = true;
    input_y.disabled = true;
    input_cord.disabled = true;
    input_delimiter.disabled = true;
}

function setModeForCSV() {
    input_selection.classList.remove("invisible");
    delimitador.classList.remove("invisible");

    input_selection.disabled = false;
    input_x.disabled = false;
    input_y.disabled = false;
    input_cord.disabled = false;
    input_delimiter.disabled = false;
}

function updateLayerControl() {
    if (layerControl) {
        try { layerControl.remove(); } catch (e) { }
    }
    layerControl = L.control.layers(baseMaps, overlays).addTo(map);
}

button_file.addEventListener("click", () => inputFile.click());

button_fechar.addEventListener("click", function(){ 
    data_div.classList.remove("menu_visible")
    order_div.classList.remove("menu_visible")
});

input_selection.addEventListener("change", function(event){
    if(event.target.value === "polygon"){
        cord_div.classList.add("visible");
        latlong_div.classList.remove("visible");
        isPolygon = true;
    } else if(event.target.value === "dots"){
        latlong_div.classList.add("visible");
        cord_div.classList.remove("visible");
        isPolygon = false;
    } else {
        cord_div.classList.remove("visible");
        latlong_div.classList.remove("visible");
        isPolygon = false;
    }
});

heatmap_selection.addEventListener("change", function(event){
    if(event.target.value === "Sim"){
        isHeatmap = true;
        order_div.classList.add("menu_visible")
    } else {
        isHeatmap = false;
        order_div.classList.remove("menu_visible")
    }
});

input_x.addEventListener("change", e => rowX = e.target.value.trim());
input_y.addEventListener("change", e => rowY = e.target.value.trim());
input_cord.addEventListener("change", e => rowCord = e.target.value.trim());
heatmap_cord.addEventListener("change", e => row_heat = e.target.value.trim());
mid_sig.addEventListener("change", e => row_midsig = e.target.value.trim());
input_delimiter.addEventListener("change", e => {
    delimiter = e.target.value || ",";
});

inputFile.addEventListener("change", function(event){
    arquivo = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    nome_arquivo.textContent = arquivo ? arquivo.name : "Nenhum arquivo selecionado";

    if (!arquivo) {
        isShapefile = false;
        setModeForCSV();
        return;
    }

    const ext = arquivo.name.split('.').pop().toLowerCase();

    if (ext === "zip") {
        isShapefile = true;
        setModeForShapefile();
    } else {
        isShapefile = false;
        setModeForCSV();
    }
});

function addOrReplaceOverlay(name, layer) {
    if (overlays[name]) {
        try {
            map.removeLayer(overlays[name]);
        } catch (e) {}
    }
    overlays[name] = layer;
    updateLayerControl();
}

button_save.addEventListener("click", function(){
    if (!arquivo) return;

    const layerName = arquivo.name.split(".")[0];
    data_div.classList.remove("menu_visible");
    order_div.classList.remove("menu_visible");

    if (isShapefile) {
        const reader = new FileReader();
        reader.onerror = function(e) {
            console.error("Erro lendo shapefile:", e);
            alert("Erro ao ler o shapefile.");
        };
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            shp(arrayBuffer).then(function(geojson) {
                let geo;
                if (geojson.type && geojson.type === "FeatureCollection") {
                    geo = geojson;
                } else {
                    let features = [];
                    for (let k in geojson) {
                        if (geojson[k] && geojson[k].features) {
                            features = features.concat(geojson[k].features);
                        }
                    }
                    geo = { type: "FeatureCollection", features: features };
                }

                if (!geo || !geo.features || geo.features.length === 0) {
                    alert("Nenhuma feição encontrada no shapefile.");
                    return;
                }

                const geoLayer = L.geoJSON(geo, {
                    onEachFeature: function(feature, layer) {
                        if (feature.properties) {
                            let popup = "";
                            for (let key in feature.properties) {
                                popup += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                            }
                            layer.bindPopup(popup);
                        }
                    },
                    style: function(feature) {
                        return {
                            color: "blue",
                            weight: 2,
                            fillColor: "lightblue",
                            fillOpacity: 0.5
                        };
                    },
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, { radius: 5, fillOpacity: 0.8 });
                    }
                });

                const overlayGroup = L.layerGroup();
                geoLayer.addTo(overlayGroup);
                overlayGroup.addTo(map);

                try {
                    const bounds = geoLayer.getBounds();
                    if (bounds && bounds.isValid && bounds.isValid()) {
                        map.fitBounds(bounds);
                    }
                } catch (e) {
                }

                addOrReplaceOverlay(layerName, overlayGroup);
            }).catch(function(err){
                console.error("Erro convertendo shapefile:", err);
                alert("Erro ao converter shapefile. Veja o console para detalhes.");
            });
        };
        reader.readAsArrayBuffer(arquivo);
        return;
    }

    Papa.parse(arquivo, {
        header: true,
        delimiter: delimiter || ",",
        skipEmptyLines: true,
        complete: function(results) {
            if (!results || !results.data || results.data.length === 0) {
                alert("CSV vazio ou inválido.");
                return;
            }

            const overlay = L.layerGroup();
            const heatPoints = []; 

            results.data.forEach(function(row) {
                const hasValue = Object.keys(row).some(k => row[k] !== null && row[k] !== "");
                if (!hasValue) return;

                let popup = "";
                for (let key in row) {
                    if (row[key] !== "" && row[key] !== null) popup += `<b>${key}:</b> ${row[key]}<br>`;
                }

                if (isPolygon) {
                    if (!rowCord) return;
                    let raw = row[rowCord];
                    if (!raw) return;
                    let latlngs;
                    try { latlngs = JSON.parse(raw); }
                    catch (e) {
                        try {
                            const fixed = raw.replaceAll("'", '"').replaceAll("(", "[").replaceAll(")", "]");
                            latlngs = JSON.parse(fixed);
                        } catch (err) { return; }
                    }
                    try {
                        L.polygon(latlngs, {
                            color: 'blue',
                            weight: 2,
                            fillColor: 'lightblue',
                            fillOpacity: 0.5
                        }).bindPopup(popup).addTo(overlay);
                    } catch (e) { console.error(e); }
                } else {
                    if (!rowX || !rowY) return;
                    const vx = parseFloat(row[rowX]);
                    const vy = parseFloat(row[rowY]);
                    const sig = parseFloat(row[row_heat] || row.signal || row.RSSI);
                    if (isNaN(vx) || isNaN(vy)) return;

                    if (!isHeatmap) {

                        L.circleMarker([vy, vx], {
                            radius: 3,
                            color: 'red',
                            fillOpacity: 0.7
                        }).bindPopup(popup).addTo(overlay);
                    } else {
                        if (!isNaN(sig)) heatPoints.push([vy, vx, sig]);
                    }
                }
            });

            if (isHeatmap && heatPoints.length > 0 && row_heat!="" && row_midsig!="") {

                const filteredPoints = [];
                const proximityThreshold = 0.002;

                heatPoints.forEach(p => {
                    const [lat, lon, sig] = p;
                    let foundNearby = false;

                    for (let i = 0; i < filteredPoints.length; i++) {
                        const [fLat, fLon, fSig] = filteredPoints[i];
                        const dLat = lat - fLat;
                        const dLon = lon - fLon;
                        const dist2 = dLat * dLat + dLon * dLon;

                        if (dist2 < proximityThreshold * proximityThreshold) {
                            if (sig > fSig) filteredPoints[i] = [lat, lon, sig];
                            foundNearby = true;
                            break;
                        }
                    }

                    if (!foundNearby) filteredPoints.push(p);
                });

                console.log(`Reduzido de ${heatPoints.length} para ${filteredPoints.length} pontos após filtragem.`);

                const normData = [];
                const midSig =  parseInt(row_midsig);    
                const steepness = 0.5; 

                const delta = Math.log(19) / steepness;

                const minVal = midSig - delta;
                const maxVal = midSig + delta;

                document.querySelector("#heatLegend .heat-legend-labels span:first-child").innerText =
                    `${minVal.toFixed(1)} dBm`;

                document.querySelector("#heatLegend .heat-legend-labels span:last-child").innerText =
                    `${maxVal.toFixed(1)} dBm`;

                    
                filteredPoints.forEach(p => {
                    const lat = p[0];
                    const lon = p[1];
                    const sig = p[2];
                    
                    /*function mapSignal(sig) {
                        if (sig <= -110) return 0.05; 
                        if (sig <= -100) return 0.15;
                        if (sig <= -95)  return 0.30;
                        if (sig <= -90)  return 0.45;
                        if (sig <= -85)  return 0.65;
                        if (sig <= -80)  return 0.85;
                        return 1.0;                   
                    }
                    let intensity = mapSignal(sig);*/
                                        
                    let norm = 1 / (1 + Math.exp((midSig - sig) * steepness));
                    let intensity = Math.pow(norm, 1.2);
                    const baseRadius = 15; 
                    const pointRadius = baseRadius + intensity * 40; 

                    const numSamples = 8;
                    for (let i = 0; i < numSamples; i++) {
                        const angle = (Math.PI * 2 * i) / numSamples;
                        const latOffset = lat + 0.0002 * Math.cos(angle) * (pointRadius / 50);
                        const lonOffset = lon + 0.0002 * Math.sin(angle) * (pointRadius / 50);
                        normData.push([latOffset, lonOffset, intensity * 0.9]);
                    }

                    normData.push([lat, lon, intensity]);
                });

                const heatLayer = L.heatLayer(normData, {
                    radius: 55,
                    blur: 40,
                    maxZoom: 15,
                    minOpacity: 0.05,
                    gradient: {
                        0.0: '#0000ff',
                        0.25: '#00ffff',
                        0.5: '#00ff00',
                        0.75: '#ffff00',
                        1.0: '#ff0000'
                    }
                });

                heatLayer.addTo(overlay);
                heatLegend.style.display = "block";


            }


            overlay.addTo(map);
            addOrReplaceOverlay(layerName, overlay);
        },
        error: function(err) {
            console.error("Erro no PapaParse:", err);
            alert("Erro ao parsear CSV.");
        }
    });
});

const botaoCustom = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px 10px';
        container.style.cursor = 'pointer';
        container.style.border = '1px solid #b1cea3';
        container.style.borderRadius = '5px';
        container.style.fontWeight = '600';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '5px';
        container.innerHTML = `<img src="../bars-solid-full.svg" width="20" height="20" alt="icon">`;
        L.DomEvent.disableClickPropagation(container);
        container.addEventListener('click', () => data_div.classList.add("menu_visible"));
        return container;
    }
});
map.addControl(new botaoCustom());