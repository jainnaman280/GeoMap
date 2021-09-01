(function () {
	let template = document.createElement("template");
	template.innerHTML = `
		<script type="text/javascript" src="jquery-1.10.2.js"></script>
		<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/dat.gui@0.7.6/build/dat.gui.min.js"></script>
		<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/gcoord@0.2.3/dist/gcoord.js"></script>
		<link type="text/css" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maptalks/dist/maptalks.css">
		<script type="text/javascript" src="https://maptalks.org/maptalks.three/demo/js/maptalks.js"></script>
		<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/three@0.104.0/build/three.min.js"></script>
		<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/maptalks.three@latest/dist/maptalks.three.js"></script>
		<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/three@0.104.0/examples/js/libs/stats.min.js"></script>
		
        <style>
			html,
			body {
				margin: 0px;
				height: 100%;
				width: 100%;
			}

			#map {
				width: 100%;
				height: 100%;
				background-color: #b2c2d2
			}
		</style>
		
		<div id="map"></div>
	`;

    var json = "";
	class Box extends HTMLElement {
		constructor() {
			super();
			let shadowRoot = this.attachShadow({ mode: "open" });
			shadowRoot.appendChild(template.content.cloneNode(true));

			this.$style = shadowRoot.querySelector('style');
			this.$svg = shadowRoot.querySelector('svg');

			this.addEventListener("click", event => {
				var event = new Event("onClick");
				this.dispatchEvent(event);
			});

			this._props = {};
		}

		render(val, info, color) {
			//var val1 = val * 0.01;
			//var x = this.svg_circle_arc_path(500, 500, 450, -90, val1 * 180.0 - 90);
			//var rounded = Math.round(val * 10) / 10;


			//if (rounded >= 0 && rounded <= 100) {
			//	this.$style.innerHTML = ':host {border-radius: 10px;border-width: 2px;border-color: black;border-style: solid;display: block;}.body {background: #fff;}.metric {padding: 10%;}.metric svg {max-width: 100%;}.metric path {stroke-width: 75;stroke: #ecf0f1;fill: none;}.metric text {font-family: "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif;}.metric.participation path.data-arc {stroke: ' + color + ';}.metric.participation text {fill: ' + color + ';}';
			//	this.$svg.innerHTML = '<path d="M 950 500 A 450 450 0 0 0 50 500"></path><text class="percentage" text-anchor="middle" alignment-baseline="middle" x="500" y="300" font-size="140" font-weight="bold">' + rounded + '%</text><text class="title" text-anchor="middle" alignment-baseline="middle" x="500" y="450" font-size="90" font-weight="normal">' + info + '</text><path d="' + x + '" class="data-arc"></path>"';
			//}
		}

		//polar_to_cartesian(cx, cy, radius, angle) {
		//	var radians;
		//	radians = (angle - 90) * Math.PI / 180.0;
		//	return [Math.round((cx + radius * Math.cos(radians)) * 100) / 100, Math.round((cy + radius * Math.sin(radians)) * 100) / 100];
		//}

		//svg_circle_arc_path(x, y, radius, start_angle, end_angle) {
		//	var end_xy, start_xy;
		//	start_xy = this.polar_to_cartesian(x, y, radius, end_angle);
		//	end_xy = this.polar_to_cartesian(x, y, radius, start_angle);
		//	return "M " + start_xy[0] + " " + start_xy[1] + " A " + radius + " " + radius + " 0 0 0 " + end_xy[0] + " " + end_xy[1];
		//};


		onCustomWidgetBeforeUpdate(changedProperties) {
			this._props = { ...this._props, ...changedProperties };
		}

		onCustomWidgetAfterUpdate(changedProperties) {
			if ("value" in changedProperties) {
				this.$value = changedProperties["value"];
			}

			if ("info" in changedProperties) {
				this.$info = changedProperties["info"];
			}

			if ("color" in changedProperties) {
				this.$color = changedProperties["color"];
            }
            json = this.$info;
			//this.render(this.$value, this.$info, this.$color);
		}
	}

	

     
    var map = new maptalks.Map("map", {
        "center": [113.98448073352165, 22.53682833203598],
        zoom: 15,
        pitch: 65,
        //"zoom": 15.577399018609112,
        //"pitch": 80,
        //"bearing": 69.82251749999989,
        //centerCross: true,
        //doubleClickZoom: false,
            baseLayer: new maptalks.TileLayer('tile', {
                urlTemplate: 'http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
                subdomains: ['a', 'b', 'c', 'd','e'],
            // attribution: '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
            })
    });

    // the ThreeLayer to draw buildings
    var threeLayer = new maptalks.ThreeLayer('t', {
        forceRenderOnMoving: true,
        forceRenderOnRotating: true
        // animation: true
    });
    threeLayer.prepareToDraw = function (gl, scene, camera) {
        stats = new Stats();
        stats.domElement.style.zIndex = 100;
        document.getElementById('map').appendChild(stats.domElement);

        var light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, -10, 10).normalize();
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        addBar(scene);

    };
    threeLayer.addTo(map);

    var bars = [], selectMesh = [];
    var material = new THREE.MeshLambertMaterial({ color: 'rgb(38,160,146)', transparent: true, opacity: 1 });
    var highlightmaterial = new THREE.MeshBasicMaterial({ color: 'yellow', transparent: true });

    function addBar(scene) {
        //fetch('https://raw.githubusercontent.com/jainnaman280/GeoMap/main/extrude.json').then((function (res) {
        //    return res.json();
        //})).then(function (json) {
            const data = json.features.slice(0, Infinity).map(function (dataItem) {
                dataItem = gcoord.transform(dataItem, gcoord.AMap, gcoord.WGS84);
                return {
                    coordinate: dataItem.geometry.coordinates,
                    height: dataItem.properties.Amount*2,
                    value: dataItem.properties.Amount,
                    city: dataItem.properties.City,
                    zip: dataItem.properties.ZipCode,
                    //height: Math.random() * 200,
                    //value: Math.random() * 10000,
                    topColor: '#fff'
                }
            });
            const time = 'time';
            console.time(time);
            const box = threeLayer.toBoxs(data, {}, material);
            bars.push(box);
            console.timeEnd(time);

            // tooltip test
            box.setToolTip('hello', {
                showTimeout: 0,
                eventsPropagation: true,
                dx: 10
            });
            threeLayer.addMesh(bars);


            //infowindow test
            box.setInfoWindow({
                content: 'hello world,height:',
                title: 'message',
                animationDuration: 0,
                autoOpenOn: false
            });


            ['click', 'empty', 'mousemove'].forEach(function (eventType) {
                box.on(eventType, function (e) {
                    const select = e.selectMesh;
                    if (e.type === 'empty' && selectMesh.length) {
                        threeLayer.removeMesh(selectMesh);
                        selectMesh = [];
                    }

                    let data, baseObject;
                    if (select) {
                        data = select.data;
                        baseObject = select.baseObject;
                        if (baseObject && !baseObject.isAdd) {
                            baseObject.setSymbol(highlightmaterial);
                            threeLayer.addMesh(baseObject);
                            selectMesh.push(baseObject);
                        }
                    }


                    if (selectMesh.length > 20) {
                        threeLayer.removeMesh(selectMesh);
                        selectMesh = [];
                    }
                    // override tooltip
                    if (e.type === 'mousemove' && data) {
                        const height = data.value;
                        const tooltip = this.getToolTip();
                        tooltip._content = `value:${height}`;
                    }
                    //             //override infowindow
                    if (e.type === 'click' && data) {
                        const height = data.value;
                        const city = data.city;
                        const zip = data.zip;
                        const infoWindow = this.getInfoWindow();
                        const content = 'City : ' + city + '<br> ZipCode : ' + zip + '<br> value : ' + height;
                        infoWindow.setContent(content);
                        if (infoWindow && (!infoWindow._owner)) {
                            infoWindow.addTo(this);
                        }
                        this.openInfoWindow(e.coordinate);
                    }
                });
            });
        //});
        animation();
        initGui();
    }
        


    function animation() {
        // layer animation support Skipping frames
        threeLayer._needsUpdate = !threeLayer._needsUpdate;
        if (threeLayer._needsUpdate) {
            threeLayer.renderScene();
        }
        stats.update();
        requestAnimationFrame(animation);
    }

    function initGui() {
        var params = {
            add: true,
            color: material.color.getStyle(),
            show: true,
            opacity: material.opacity,
            altitude: 0,
            animateShow: animateShow
        };

        var gui = new dat.GUI();
        gui.add(params, 'add').onChange(function () {
            if (params.add) {
                threeLayer.addMesh(bars);
            } else {
                threeLayer.removeMesh(bars);
            }
        });
        gui.addColor(params, 'color').name('bar color').onChange(function () {
            material.color.set(params.color);
            bars.forEach(function (mesh) {
                mesh.setSymbol(material);
            });
        });
        gui.add(params, 'opacity', 0, 1).onChange(function () {
            material.opacity = params.opacity;
            bars.forEach(function (mesh) {
                mesh.setSymbol(material);
            });
        });
        gui.add(params, 'show').onChange(function () {
            bars.forEach(function (mesh) {
                if (params.show) {
                    mesh.show();
                } else {
                    mesh.hide();
                }
            });
        });
        gui.add(params, 'altitude', 0, 300).onChange(function () {
            bars.forEach(function (mesh) {
                mesh.setAltitude(params.altitude);
            });
        });
        gui.add(params, 'animateShow');
    }

    function animateShow() {
        bars.forEach(function (mesh) {
            mesh.animateShow({
                duration: 3000
            });
        });
    }
       
   
    $(window).load(function () {
        $('.dg,.ac').css('display', 'none');
        $('.maptalks-attribution').css('display', 'none');
        const ele = $('#map div')[13];
        ele.style.display = 'none';
    });

    customElements.define("com-demo-gauge", Box);

console.log(json);

})();
    
