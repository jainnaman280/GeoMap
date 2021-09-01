(function () {
	let template = document.createElement("template");
	template.innerHTML = `
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
            console.log(val + " " + info + " " + color);
		}


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
			this.render(this.$value, this.$info, this.$color);
		}
	}
    customElements.define("com-demo-gauge", Box);
})();
    