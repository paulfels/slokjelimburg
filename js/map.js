var mapMain;
var watertappuntenFeatureLayer, horecaFeatureLayer;
var currentPosition = null;

// configuration, change things here
var mapConfiguration = {
    //proxyURL: "http://localhost/proxy/proxy.ashx",
    baseMapTopoRDVectorTileService: "https://tiles.arcgis.com/tiles/nSZVuSZjHpEZZbRo/arcgis/rest/services/Topo_RD/VectorTileServer",
    baseMapTopoRDVectorTileThumbnailURL: "https://www.arcgis.com/sharing/rest/content/items/38c4cfd9b72346c988be5fff1668ea79/info/thumbnail/thumbnail.png",
    baseMapAerialPhotoService: "https://services.arcgisonline.nl/arcgis/rest/services/Luchtfoto/Luchtfoto/MapServer",
    baseMapAerialPhotoThumbnailURL: "https://www.arcgis.com/sharing/rest/content/items/5c621f71daf34eef8d2973caa94a7b3b/info/thumbnail/thumbnail.png",
    watertappuntenService: "https://services5.arcgis.com/4IBxFxNCnjtMksej/ArcGIS/rest/services/Watertappunten_2018/FeatureServer/0",
    horecaService: "https://services5.arcgis.com/4IBxFxNCnjtMksej/arcgis/rest/services/Horecazaken_met_kraanwater_Nieuw/FeatureServer/0",
    watertappuntenServiceDefinitionExpression: "Toegang = 'Ja'",
    horecaServiceDefinitionExpression: "",
    showMessageTimeout: 5000//2000
};

// @formatter:off
require([
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/config",
    "esri/basemaps",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/geometry/projection",

    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",

    "esri/dijit/BasemapToggle",
    "esri/dijit/LayerList",
    "esri/dijit/PopupTemplate",

    "dojox/mobile",
    "esri/sniff",//from example, no documentation found

    "dojo/parser",
    "dojo/on",
    "dojo/dom",
    "dojo/i18n!nls/strings.js",

    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/registry",

    "dijit/form/Button",
    "dojo/domReady!"],
    function (Map, FeatureLayer, config, esriBasemaps, Point, SpatialReference, projection,
        PictureMarkerSymbol, Graphic,
        BasemapToggle, LayerList, PopupTemplate,
        mobile, has,
        parser, on, dom, i18nStrings,
        _BorderContainer, _ContentPane, registry) {

        // Parse DOM nodes decorated with the data-dojo-type attribute
        parser.parse().then(function () {

            // Localize/adjust the UI
            registry.byId("mapLayersTitlePane").set("title", i18nStrings.mapLayerTitle);
            registry.byId("mapLayersTitlePane").set("open", false);

            // hook up buttons
            registry.byId("btnZoomToMyLocation").on("click", function () {
                zoomToMyLocation();
            });

            registry.byId("btnPanToMyLocation").on("click", function () {
                panToMyLocation();
            });
        });

        // // Step: Specify the proxy Url
        // config.defaults.io.proxyUrl = mapConfiguration.proxyURL;

        if ('serviceWorker' in navigator) {
            try {
                navigator.serviceWorker.register('sw.js');
                console.log('SW registered');
            } catch (error) {
                console.log('SW registration failed');
            }
        }

        AddRdBaseMaps();

        SetBaseMap();

        mapMain.on("load", mapLoadHandler);

        // onorientationchange doesn't always fire in a timely manner in Android so check for both orientationchange and resize
        var resizeEvt = (window.onorientationchange !== undefined && !has('android')) ? "orientationchange" : "resize";
        on(window, resizeEvt, resizeMap);

        //hide the popup if its outside the map's extent
        mapMain.on("mouse-drag", function (evt) {
            if (mapMain.infoWindow.isShowing) {
                var loc = mapMain.infoWindow.getSelectedFeature().geometry;
                if (!mapMain.extent.contains(loc)) {
                    mapMain.infoWindow.hide();
                }
            }
        });

        AddBaseMapToggle();

        AddFeatureLayers();

        AddLayerListWidget();

        // Track the current location
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(updateLocation, locationError);
        }

        function AddRdBaseMaps() {

            // Add TopoRd as the basemap
            esriBasemaps.topoRD = {
                baseMapLayers: [{
                    type: "VectorTile",
                    url: mapConfiguration.baseMapTopoRDVectorTileService
                }],
                thumbnailUrl: mapConfiguration.baseMapTopoRDVectorTileThumbnailURL,
                title: i18nStrings.baseMapTopoRDVTitle
            };

            // Add Luchtfoto as the basemap
            esriBasemaps.luchtfotoRD = {
                baseMapLayers: [{
                    url: mapConfiguration.baseMapAerialPhotoService
                }],
                thumbnailUrl: mapConfiguration.baseMapAerialPhotoThumbnailURL,
                title: i18nStrings.baseMapAerialPhotoTitle
            };
        }

        function SetBaseMap() {
            // Center to a RD point
            var rdSpatailRef = new SpatialReference({ wkid: 28992 });
            var point = new Point(186287, 364045, rdSpatailRef);

            // Create the map
            mapMain = new Map("divMap", {
                basemap: "topoRD",
                center: point,
                zoom: 5
            });
        }

        function mapLoadHandler(evt) {
            resizeMap();
            registry.byId('divMap').on('AfterTransitionIn', resizeMap);
        }

        function resizeMap() {
            adjustMapHeight();
            mapMain.resize();
           // mapMain.reposition();
        }

        function adjustMapHeight() {
            var availHeight = mobile.getScreenSize().h;
            if (has('iphone') || has('ipod')) {
                availHeight += iphoneAdjustment();
            }
            dom.byId("divMap").style.height = availHeight + "px";
        }

        function iphoneAdjustment() {
            // Not for standalone
            if (window.navigator.standalone) {
                return 0; // there is still a small space on top (Portrait) or on the bottom (Landscape) returning 20 didn't do anything
            }

            var screenSize = mobile.getScreenSize();
            if (screenSize.h > screenSize.w) { //portrait

                 //Need to react to full screen / bottom bar visible toggles
                 var conn = on(window, 'resize', function () {
                    conn.remove();
                    resizeMap();
                });

                //Need to add address bar height back to map
                var temp = screen.availHeight - window.innerHeight - 40;
                /* 40 = height of bottom safari toolbar */
                return 0; 
            }
            else { //landscape
                //Need to react to full screen / bottom bar visible toggles
                var conn = on(window, 'resize', function () {
                    conn.remove();
                    resizeMap();
                });

                return 0;                
            }
        }

        function AddBaseMapToggle() {
            // Toggle basemaps
            var toggle = new BasemapToggle({
                map: mapMain,
                basemap: "luchtfotoRD"
            }, "BasemapToggle");

            toggle.startup();
        }

        function AddFeatureLayers() {

            var watertappuntenPopupTemplate = new PopupTemplate({
                "title": "{Naam}",
                "description": "{Locatie_Omschrijving}<br/><br/>" +
                    "<div class=\"featureImageDiv\"><img class=\"featureImage\" src=\"{Link_Dropbox}\" /></div>"
            });

            watertappuntenFeatureLayer = new FeatureLayer(mapConfiguration.watertappuntenService, {
                outFields: ['*'],
                infoTemplate: watertappuntenPopupTemplate
            });

            if (mapConfiguration.watertappuntenServiceDefinitionExpression !== "") {
                watertappuntenFeatureLayer.setDefinitionExpression(mapConfiguration.watertappuntenServiceDefinitionExpression);
            }

            var horecaPopupTemplate = new PopupTemplate({
                "title": "{USER_BEDRIJFSNAAM}",
                "description": "{USER_STRAAT}, {USER_PLAATS}"
            });

            horecaFeatureLayer = new FeatureLayer(mapConfiguration.horecaService, {
                outFields: ['*'],
                infoTemplate: horecaPopupTemplate
            });

            if (mapConfiguration.horecaServiceDefinitionExpression !== "") {
                horecaFeatureLayer.setDefinitionExpression(mapConfiguration.horecaServiceDefinitionExpression);
            }

            // add the layers to the map
            mapMain.addLayers([watertappuntenFeatureLayer, horecaFeatureLayer]);
        }

        function AddLayerListWidget() {
            const layers = [
                {
                    layer: horecaFeatureLayer,
                    visibility: true,
                    title: i18nStrings.horecaFeatureLayerTitle
                },
                {
                    layer: watertappuntenFeatureLayer,
                    visibility: true,
                    title: i18nStrings.watertappuntenFeatureLayerTitle
                }
            ];

            var layerListWidget = new LayerList({
                map: mapMain,
                layers: layers
            }, "layerList");

            layerListWidget.startup();
        }

        async function updateLocation(location) {

            if (mapMain.graphics === null) {
                return;
            }

            mapMain.graphics.clear();

            currentPosition = await projectToRd(location);

            var markerSymbol = new PictureMarkerSymbol('images/BGW_40.png', 25, 25);
            mapMain.graphics.add(new Graphic(currentPosition, markerSymbol));

            dom.byId("btnZoomToMyLocationDiv").hidden = false;
            dom.byId("btnPanToMyLocationDiv").hidden = false;
        }

        function zoomToMyLocation() {
            if (currentPosition !== null) {
                mapMain.centerAndZoom(currentPosition, 11);
            }
        }

        function panToMyLocation() {
            if (currentPosition !== null) {
                mapMain.centerAt(currentPosition);
            }
        }

        function projectToRd(location) {

            if (!projection.isSupported()) {
                showTempMessage(i18nStrings.messageProjectionNotSupported);
                return;
            }

            // Get the lat lon point
            var wgs84SpatailRef = new SpatialReference({ wkid: 4326 });
            var wgs84Location = new Point(location.coords.longitude, location.coords.latitude, wgs84SpatailRef);

            var rdSpatailRef = new SpatialReference({ wkid: 28992 });

            if (!projection.isLoaded()) {

                return new Promise(resolve => {
                    projection.load().then(function () {
                        // the projection module loaded. 
                        // Geometries can be reprojected.
                        resolve(projection.project(wgs84Location, rdSpatailRef));
                    });
                });
            } else {
                return projection.project(wgs84Location, rdSpatailRef);
            }
        }

        function locationError(error) {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    showTempMessage(i18nStrings.errorMessageLocationNotProvided);
                    break;
                case error.POSITION_UNAVAILABLE:
                    showTempMessage(i18nStrings.errorMessageLocationNotAvailable);
                    break;
                case error.TIMEOUT:
                    showTempMessage(i18nStrings.errorMessageLocationTimeout);
                    break;
                default:
                    showTempMessage(i18nStrings.errorMessageUnknownError);
                    break;
            }
        }

        function showTempMessage(message) {
            dom.byId("messageDiv").innerHTML = message;
            return new Promise(() => {
                setTimeout(() => {
                    dom.byId("messageDiv").innerHTML = "";
                }, mapConfiguration.showMessageTimeout);
            });
        }
    });
