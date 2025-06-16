L.Control.MousePosition = L.Control.extend({
  options: {
    position: 'bottomleft',
    separator: ',',
    emptyString: '',
    lngFirst: false,
    numDigits: 6,
    lngFormatter: undefined,
    latFormatter: undefined,
    prefix: "Vĩ độ, kinh độ: "
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    L.DomEvent.disableClickPropagation(this._container);
    map.on('mousemove', this._onMouseMove, this);

    map.on('zoomlevelschange zoomstart zoom zoomend', this._onZoom, this);

    this._container.innerHTML = this.options.emptyString;

    return this._container;
  },

  onZoom: function (map) {
    map.off('zoomlevelschange zoomstart zoom zoomend', this._onZoom)
  },

  _onZoom: function (e) {
    this._container.innerHTML = 'Zoom Level: ' + L.Util.formatNum(map.getZoom(), 2);
  },


  onRemove: function (map) {
    map.off('mousemove', this._onMouseMove)
  },

  _onMouseMove: function (e) {
    //    var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
    //    var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
    var num1 = e.latlng.lng;
    var num2 = (num1 - parseInt(num1)) * 60;
    var num3 = L.Util.formatNum((num2 - parseInt(num2)) * 60, 2);
    var lng = parseInt(num1) + "°" + parseInt(num2) + "'" + parseInt(num3) + "''";

    var num1 = e.latlng.lat;
    var num2 = (num1 - parseInt(num1)) * 60;
    var num3 = L.Util.formatNum((num2 - parseInt(num2)) * 60, 2);
    var lat = parseInt(num1) + "°" + parseInt(num2) + "'" + parseInt(num3) + "''";

    var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
    var prefixAndValue = this.options.prefix + value;
    prefixAndValue = prefixAndValue + '; Zoom Level: ' + L.Util.formatNum(map.getZoom(), 2);

    this._container.innerHTML = prefixAndValue;
  }

});

L.Map.mergeOptions({
  positionControl: false
});

L.Map.addInitHook(function () {
  if (this.options.positionControl) {
    this.positionControl = new L.Control.MousePosition();
    this.addControl(this.positionControl);
  }
});

L.control.mousePosition = function (options) {
  return new L.Control.MousePosition(options);
};
