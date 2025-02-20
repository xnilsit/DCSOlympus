import { Icon, LatLng, Marker, Polyline } from "leaflet";
import { getApp } from "..";
import { distance, bearing, zeroAppend, mToNm, nmToFt, mToFt, latLngToMGRS, MGRS, latLngToUTM, latLngToMercator } from "../other/utils";
import { Unit } from "../unit/unit";
import { Panel } from "./panel";
import formatcoords from "formatcoords";
import { MGRS_PRECISION_100M, MGRS_PRECISION_10KM, MGRS_PRECISION_10M, MGRS_PRECISION_1KM, MGRS_PRECISION_1M } from "../constants/constants";
import { Popup } from "../popups/popup";

export class MouseInfoPanel extends Panel {
    #coordinatesElement: HTMLElement;
    #unitCoordinatesElement: HTMLElement;
    #locationSystems = ["LatLng", "MGRS", "UTM", "LatLngDec"];
    #measureMarker: Marker;
    #measurePoint: LatLng | null = null;
    #measureIcon: Icon;
    #measureLine: Polyline = new Polyline([], { color: '#2d3e50', weight: 3, opacity: 0.5, smoothFactor: 1, interactive: false });
    #measureBox: HTMLElement;
    #MGRSPrecisions = [MGRS_PRECISION_10KM, MGRS_PRECISION_1KM, MGRS_PRECISION_100M, MGRS_PRECISION_10M, MGRS_PRECISION_1M];
    #selectedMGRSPrecisionIndex = 3;
    #selectedLocationSystemIndex = 0;
    #elevationRequest: XMLHttpRequest | null = null;
    #updateInterval: any = null;


    constructor(ID: string) {
        super(ID);

        this.#measureIcon = new Icon({ iconUrl: 'resources/theme/images/icons/pin.svg', iconAnchor: [16, 32] });
        this.#measureMarker = new Marker([0, 0], { icon: this.#measureIcon, interactive: false });

        this.#measureBox = document.createElement("div");
        this.#measureBox.classList.add("ol-measure-box", "hide");
        document.body.appendChild(this.#measureBox);

        getApp().getMap()?.on("click", (e: any) => this.#onMapClick(e));
        getApp().getMap()?.on('zoom', (e: any) => this.#onZoom(e));
        getApp().getMap()?.on('mousemove', (e: any) => this.#onMouseMove(e));
        getApp().getMap()?.on('drag', (e: any) => this.#onMouseMove(e));

        document.addEventListener('unitsSelection', (e: CustomEvent<Unit[]>) => {
            /* Let's update selected unit coordinates every second, useful for moving units */
            this.#updateInterval = setInterval(() => {
                var selectedUnits = getApp().getUnitsManager().getSelectedUnits();
                if (selectedUnits && selectedUnits.length == 1) {
                    this.#update()
                }
            }, 1000);
            this.#update()
        });
        document.addEventListener('clearSelection', () => {
            clearInterval(this.#updateInterval)
            this.#update()
        });

        this.#coordinatesElement = <HTMLElement>this.getElement().querySelector('#coordinates-tool');

        this.#coordinatesElement.addEventListener("click", (ev: MouseEvent) => {
            this.#changeLocationSystem();
        });

        getApp().getShortcutManager().addKeyboardShortcut("switchMapLocationSystem", {
            "callback": (ev: KeyboardEvent) => {
                this.#changeLocationSystem();
            },
            "code": "KeyZ"
        }).addKeyboardShortcut("decreaseMGRSPrecision", {
            "callback": (ev: KeyboardEvent) => {
                if (this.#getLocationSystem() !== "MGRS") {
                    return;
                }

                if (this.#selectedMGRSPrecisionIndex > 0) {
                    this.#selectedMGRSPrecisionIndex--;
                    this.#update();
                }
            },
            "code": "Comma"
        }).addKeyboardShortcut("increaseMGRSPrecision", {
            "callback": (ev: KeyboardEvent) => {
                if (this.#getLocationSystem() !== "MGRS") {
                    return;
                }

                if (this.#selectedMGRSPrecisionIndex < this.#MGRSPrecisions.length - 1) {
                    this.#selectedMGRSPrecisionIndex++;
                    this.#update();
                }
            },
            "code": "Period"
        });

        /* Selected unit coordinates panel interaction */
        this.#unitCoordinatesElement = <HTMLElement>this.getElement().querySelector('#unit-coordinates');

        this.#unitCoordinatesElement.addEventListener("click", (ev: MouseEvent) => {
            this.#changeLocationSystem();
        });

        const unitCoordsToggleEl = <HTMLElement>this.getElement().querySelector('#unit-coordinates-toggle');
        const unitCoordsContainer = <HTMLElement>this.getElement().querySelector('#unit-coordinates-container');
        unitCoordsToggleEl.addEventListener("click", (ev: MouseEvent) => {
            if (unitCoordsContainer.getAttribute('data-open') === 'true') {
                unitCoordsContainer.setAttribute('data-open', 'false');
            } else {
                unitCoordsContainer.setAttribute('data-open', 'true');
            }
        });



        /* Let's make coordinates copy-able */
        this.#listenForCopyableElements();
    }

    #listenForCopyableElements() {
        const copyableElements = document.getElementsByClassName('copyable');

        for (const element of copyableElements) {
            element.addEventListener('contextmenu', async (ev) => {
                if (!ev.target) return;

                const locationSystem = this.#getLocationSystem();
                const coordinatesComposeElements = document.querySelectorAll(`.copyable[data-location-system=${locationSystem}]`)
                const elevationComposeElement = document.querySelectorAll(`.copyable.elevation`)

                let text = '';

                for (const element of coordinatesComposeElements) {
                    text += (element as HTMLElement).innerText + '\n';
                }

                text += (elevationComposeElement[0] as HTMLElement).getAttribute('data-value');

                if (!navigator || !navigator.clipboard) {
                    console.error('This browser does not support clipboard copy.');
                    return;
                };

                navigator.clipboard.writeText(text)
                    .then(() => {
                        (getApp().getPopupsManager().get("infoPopup") as Popup).setText('Coordinates copied to clipboard.');
                    })
                    .catch(err => {
                        (getApp().getPopupsManager().get("infoPopup") as Popup).setText('An error occurred while copying text to clipboard: ' + err);
                    });
            });
        }
    }

    #update() {
        const mousePosition = getApp().getMap().getMouseCoordinates();

        let selectedUnitPosition = null;
        let selectedUnitElevation = null;

        var selectedUnits = getApp().getUnitsManager().getSelectedUnits();
        if (selectedUnits && selectedUnits.length == 1) {
            this.getElement().querySelector(`#unit-coordinates-container`)?.classList.remove('hide');
            selectedUnitPosition = new LatLng(selectedUnits[0].getPosition().lat, selectedUnits[0].getPosition().lng);
            selectedUnitElevation = selectedUnits[0].getPosition().alt;
        } else {
            selectedUnitPosition = null;
            selectedUnitElevation = null;
            this.getElement().querySelector(`#unit-coordinates-container`)?.classList.add('hide');
        }

        /* Draw measures from selected unit, from pin location, and from bullseyes */
        this.#drawMeasure("ref-measure-position", "measure-position", this.#measurePoint, mousePosition);
        this.#drawMeasure("ref-unit-position", "unit-position", selectedUnitPosition, mousePosition);

        this.getElement().querySelector(`#measuring-tool`)?.classList.toggle("hide", this.#measurePoint === null);
        this.getElement().querySelector(`#unit-bullseye-tool`)?.classList.toggle("hide", selectedUnitPosition === null);

        var bullseyes = getApp().getMissionManager().getBullseyes();
        for (let idx in bullseyes)
            this.#drawMeasure(null, `bullseye-${idx}`, bullseyes[idx].getLatLng(), mousePosition);

        /* Draw coordinates */
        var coords = formatcoords(mousePosition.lat, mousePosition.lng);
        var coordString = coords.format('XDDMMss', { decimalPlaces: 4 });
        let decCoordsString = coords.format('XDDm', { decimalPlaces: 3 });

        if (this.#getLocationSystem() === "MGRS") {
            const mgrs = <MGRS>latLngToMGRS(mousePosition.lat, mousePosition.lng, this.#MGRSPrecisions[this.#selectedMGRSPrecisionIndex]);
            this.#drawCoordinates("ref-mouse-position-mgrs", "mouse-position-mgrs", "M" + mgrs.groups.join(" "));
        } else if (this.#getLocationSystem() === "UTM") {
            const utm = latLngToUTM(mousePosition.lat, mousePosition.lng);
            this.#drawCoordinates("ref-mouse-position-utm-northing", "mouse-position-utm-northing", "N" + utm.northing);
            this.#drawCoordinates("ref-mouse-position-utm-easting", "mouse-position-utm-easting", "E" + utm.easting);
        } else if (this.#getLocationSystem() === "LatLngDec") {
            this.#drawCoordinates("ref-mouse-position-latitude-dec", "mouse-position-latitude-dec", decCoordsString.split(" ")[0] + "'");
            this.#drawCoordinates("ref-mouse-position-longitude-dec", "mouse-position-longitude-dec", decCoordsString.split(" ")[1] + "'");
        }
        else {
            this.#drawCoordinates("ref-mouse-position-latitude", "mouse-position-latitude", coordString.split(" ")[0]);
            this.#drawCoordinates("ref-mouse-position-longitude", "mouse-position-longitude", coordString.split(" ")[1]);
        }

        /* Draw selected unit coordinates */
        if (selectedUnitPosition) {
            var unitCoords = formatcoords(selectedUnitPosition.lat, selectedUnitPosition.lng);
            var unitCoordString = unitCoords.format('XDDMMss', { decimalPlaces: 4 });
            let decCoordsString = unitCoords.format('XDDm', { decimalPlaces: 3 });

            if (this.#getLocationSystem() === "MGRS") {
                const mgrs = <MGRS>latLngToMGRS(selectedUnitPosition.lat, selectedUnitPosition.lng, this.#MGRSPrecisions[this.#selectedMGRSPrecisionIndex]);
                this.#drawCoordinates("ref-unit-position-mgrs", "unit-position-mgrs", "M" + mgrs.groups.join(" "));
            } else if (this.#getLocationSystem() === "UTM") {
                const utm = latLngToUTM(selectedUnitPosition.lat, selectedUnitPosition.lng);
                this.#drawCoordinates("ref-unit-position-utm-northing", "unit-position-utm-northing", "N" + utm.northing);
                this.#drawCoordinates("ref-unit-position-utm-easting", "unit-position-utm-easting", "E" + utm.easting);
            } else if (this.#getLocationSystem() === "LatLngDec") {
                this.#drawCoordinates("ref-unit-position-latitude-dec", "unit-position-latitude-dec", decCoordsString.split(" ")[0] + "'");
                this.#drawCoordinates("ref-unit-position-longitude-dec", "unit-position-longitude-dec", decCoordsString.split(" ")[1] + "'");
            } else {
                this.#drawCoordinates("ref-unit-position-latitude", "unit-position-latitude", unitCoordString.split(" ")[0]);
                this.#drawCoordinates("ref-unit-position-longitude", "unit-position-longitude", unitCoordString.split(" ")[1]);
            }

            const unitElevationElement = this.getElement().querySelector(`#unit-position-elevation`) as HTMLElement;
            let displayedHeight = "0";

            switch (selectedUnits[0].getCategory()) {
                case 'Aircraft':
                    displayedHeight = "FL" + zeroAppend(Math.floor(mToFt(selectedUnitElevation as number) / 100), 3);
                    break;
                default:
                    displayedHeight = Math.floor(mToFt(selectedUnitElevation as number)) + " ft"
                    break;
            }

            unitElevationElement.dataset.value = displayedHeight;
        }

        /* Get the ground elevation from the server endpoint */
        if (this.#elevationRequest == null) {
            this.#elevationRequest = new XMLHttpRequest();
            this.#elevationRequest.open('GET', `api/elevation/${mousePosition.lat}/${mousePosition.lng}`, true);
            this.#elevationRequest.timeout = 500; // ms
            this.#elevationRequest.responseType = 'json';
            this.#elevationRequest.onload = () => {
                var status = this.#elevationRequest?.status;
                if (status === 200) {
                    const el = this.getElement().querySelector(`#mouse-position-elevation`) as HTMLElement;
                    try {
                        el.dataset.value = `${Math.floor(mToFt(parseFloat(this.#elevationRequest?.response)))} ft`;
                    } catch {
                        el.dataset.value = `N/A`;
                    }
                }
                this.#elevationRequest = null;
            };
            this.#elevationRequest.ontimeout = () => { this.#elevationRequest = null; }
            this.#elevationRequest.onerror = () => { this.#elevationRequest = null; }
            this.#elevationRequest.onabort = () => { this.#elevationRequest = null; }
            this.#elevationRequest.send();
        }
    }

    #onMapClick(e: any) {
        if (e.originalEvent.ctrlKey) {
            if (!this.#measurePoint) {
                this.#measureBox.classList.toggle("hide", false);
                this.#measurePoint = e.latlng;
                this.#measureMarker.setLatLng(e.latlng);
                this.#measureMarker.addTo(getApp().getMap());
                if (!getApp().getMap().hasLayer(this.#measureLine))
                    this.#measureLine.addTo(getApp().getMap());
            }
            else {
                this.#measureBox.classList.toggle("hide", true);
                this.#measurePoint = null;
                if (getApp().getMap().hasLayer(this.#measureMarker))
                    getApp().getMap().removeLayer(this.#measureMarker);

                this.#measureLine.setLatLngs([]);
                if (getApp().getMap().hasLayer(this.#measureLine))
                    getApp().getMap().removeLayer(this.#measureLine);
            }
        }

        this.#update();
    }

    #drawMeasureLine() {
        var mouseLatLng = getApp().getMap().containerPointToLatLng(getApp().getMap().getMousePosition());
        const mousePosition = getApp().getMap().getMousePosition();
        if (this.#measurePoint != null) {
            var points = [this.#measurePoint, mouseLatLng];
            this.#measureLine.setLatLngs(points);
            var dist = distance(this.#measurePoint.lat, this.#measurePoint.lng, mouseLatLng.lat, mouseLatLng.lng);
            var bear = bearing(this.#measurePoint.lat, this.#measurePoint.lng, mouseLatLng.lat, mouseLatLng.lng);
            var startXY = getApp().getMap().latLngToContainerPoint(this.#measurePoint);
            var dx = mousePosition.x - startXY.x;
            var dy = mousePosition.y - startXY.y;

            var angle = Math.atan2(dy, dx);
            if (angle > Math.PI / 2)
                angle = angle - Math.PI;

            if (angle < -Math.PI / 2)
                angle = angle + Math.PI;

            let bng = zeroAppend(Math.floor(bear), 3);

            if (bng === "000")
                bng = "360";

            var [str, unit] = this.#computeDistanceString(dist)

            let data = [`${bng}°`, `${str} ${unit}`];

            this.#measureBox.innerText = data.join(" / ");
            this.#measureBox.style.left = (mousePosition.x + startXY.x) / 2 - this.#measureBox.offsetWidth / 2 + "px";
            this.#measureBox.style.top = (mousePosition.y + startXY.y) / 2 - this.#measureBox.offsetHeight / 2 + "px";
            this.#measureBox.style.rotate = angle + "rad";
        }
    }

    #onMouseMove(e: any) {
        this.#update();
        this.#drawMeasureLine();
    }

    #onZoom(e: any) {
        this.#drawMeasureLine();
    }

    #drawMeasure(imgID: string | null, textID: string, value: LatLng | null, mousePosition: LatLng) {
        var el = this.getElement().querySelector(`#${textID}`) as HTMLElement;
        var img = imgID != null ? this.getElement().querySelector(`#${imgID}`) as HTMLElement : null;
        if (value) {
            if (el != null) {
                el.classList.remove("hide");

                var bear = bearing(value.lat, value.lng, mousePosition.lat, mousePosition.lng);
                var dist = distance(value.lat, value.lng, mousePosition.lat, mousePosition.lng);

                let bng = zeroAppend(Math.floor(bear), 3);

                if (bng === "000")
                    bng = "360";

                var [str, unit] = this.#computeDistanceString(dist)

                el.dataset.bearing = bng;
                el.dataset.distance = str;
                el.dataset.distanceUnits = unit;
            }
            if (img != null)
                img.classList.remove("hide");
        }
        else {
            if (el != null)
                el.classList.add("hide");
            if (img != null)
                img.classList.add("hide");
        }
    }

    #drawCoordinates(imgID: string, textID: string, value: string) {
        const el = this.getElement().querySelector(`#${textID}`) as HTMLElement;
        const img = this.getElement().querySelector(`#${imgID}`) as HTMLElement;
        if (img && el) {
            el.innerText = value.substring(1);
            img.innerText = value[0];
        }
    }

    #computeDistanceString(dist: number) {
        var val = mToNm(dist);
        var strVal = 0;
        var decimal = false;
        var unit = "NM";
        if (val > 10)
            strVal = Math.floor(val);
        else if (val > 1 && val <= 10) {
            strVal = Math.floor(val * 100) / 100;
            decimal = true;
        }
        else {
            strVal = Math.floor(nmToFt(val));
            unit = "ft";
        }

        return [zeroAppend(strVal, 3, decimal), unit];
    }

    #changeLocationSystem() {

        if (this.#selectedLocationSystemIndex < this.#locationSystems.length - 1) {
            this.#selectedLocationSystemIndex++;
        } else {
            this.#selectedLocationSystemIndex = 0;
        }

        this.#coordinatesElement.setAttribute("data-location-system", this.#getLocationSystem());
        this.#unitCoordinatesElement.setAttribute("data-location-system", this.#getLocationSystem());
        this.#update();
    }

    #getLocationSystem() {
        const x = this.#locationSystems;
        const y = this.#selectedLocationSystemIndex;
        const z = this.#locationSystems[this.#selectedLocationSystemIndex];
        return this.#locationSystems[this.#selectedLocationSystemIndex];
    }
}
