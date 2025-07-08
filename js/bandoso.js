// ====== CẤU HÌNH CHUNG ======
const fieldMap = {
  ma: 'Mã xã/phường',
  ten: 'Tên xã/phường',
  sap_nhap: 'Sáp nhập',
  loai: 'Loại',
  cap: 'Cấp hành chính',
  stt: 'Số thứ tự',
  dien_tich_km2: 'Diện tích (km²)',
  dan_so: 'Dân số',
  mat_do_km2: 'Mật độ (người/km²)'
};

let cachedGeojsonFiles = [];
// Thêm biến lưu các layer geojson để quản lý bật/tắt
let geojsonLayers = [];
let geojsonVisible = true;

// ====== HÀM TIỆN ÍCH ======
function removeVietnameseTones(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function createPopupContent(properties) {
  if (!properties) return 'Không có thông tin.';
  let popupContent = '<div class="popup-info">';
  popupContent += '<div class="popup-title">Thông tin xã/phường</div>';
  popupContent += '<table class="popup-table">';
  for (const key in fieldMap) {
    if (properties[key] !== undefined) {
      popupContent += `<tr><td class='popup-label'>${fieldMap[key]}</td><td>${properties[key]}</td></tr>`;
    }
  }
  popupContent += '</table></div>';
  return popupContent;
}

// ====== KHỞI TẠO BẢN ĐỒ & LỚP NỀN ======
function initMap() {
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  const map = L.map('map', {
    center: [10.2536, 105.9722],
    zoom: 10,
    layers: [osmLayer]
  });

  const baseLayers = {
    "Bản đồ OSM": osmLayer,
    "Vệ tinh (Satellite)": satelliteLayer
  };
  L.control.layers(baseLayers, null, {position: 'topright', collapsed: false}).addTo(map);

  return map;
}

// ====== XỬ LÝ XÁC ĐỊNH VỊ TRÍ ======
function setupLocateButton(map) {
  const locateBtnDom = document.getElementById('locate-btn');
  if (!locateBtnDom) return;
  locateBtnDom.onclick = function() {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ xác định vị trí!');
      return;
    }
    locateBtnDom.disabled = true;
    locateBtnDom.innerText = 'Đang xác định vị trí...';
    navigator.geolocation.getCurrentPosition(function(pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        })
      }).addTo(map).bindPopup('Vị trí của bạn').openPopup();
      map.setView([lat, lng], 15);
      locateBtnDom.disabled = false;
      locateBtnDom.innerText = '📍 Xác định vị trí của bạn';
    }, function(err) {
      if (err.code !== 1) {
        alert('Không thể xác định vị trí: ' + err.message);
      }
      locateBtnDom.disabled = false;
      locateBtnDom.innerText = '📍 Xác định vị trí của bạn';
    });
  };
}

// ====== HIỂN THỊ GEOJSON LÊN BẢN ĐỒ ======
function addGeojsonToMap(map, data) {
  const layer = L.geoJSON(data, {
    style: function(feature) {
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      return {
        color: '#3388ff',
        weight: 2,
        fillColor: randomColor,
        fillOpacity: 0.4
      };
    },
    onEachFeature: function (feature, layer) {
      // Tooltip tên xã/phường
      if (feature.properties && feature.properties.ten) {
        layer.bindTooltip(feature.properties.ten, {direction: 'top', sticky: true, offset: [0, -8], className: 'custom-tooltip'});
      }
      // Popup chi tiết khi click
      layer.on('click', function() {
        layer.setStyle({color: '#2ecc40', weight: 3});
        layer.bindPopup(createPopupContent(feature.properties)).openPopup();
      });
      // Reset style khi popup đóng
      layer.on('popupclose', function() {
        layer.setStyle({color: '#3388ff', weight: 2});
      });
      layer.on('mouseover', function() {
        layer.setStyle({fillOpacity: 0.5, color: '#ff7800'});
      });
      layer.on('mouseout', function() {
        layer.setStyle({fillOpacity: 0.2, color: '#3388ff'});
      });
    }
  }).addTo(map);
  geojsonLayers.push(layer);
  return layer;
}

// ====== TẢI DANH SÁCH GEOJSON & HIỂN THỊ LÊN BẢN ĐỒ ======
function loadAllGeojsons(map) {
  fetch('geo-json/list.json')
    .then(res => res.json())
    .then(geojsonFiles => {
      cachedGeojsonFiles = geojsonFiles;
      geojsonFiles.forEach(filename => {
        fetch('geo-json/' + encodeURIComponent(filename))
          .then(res => res.json())
          .then(data => addGeojsonToMap(map, data))
          .catch(err => console.error('Lỗi tải file', filename, err));
      });
      setupSearch(map);
      setupToggleOverlayBtn(map); // Thêm hàm này sau khi load xong
    })
    .catch(err => {
      console.error('Không thể tải danh sách geojson:', err);
    });
}

// ====== XỬ LÝ TÌM KIẾM ======
function setupSearch(map) {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  if (!searchBtn || !searchInput) return;

  searchBtn.onclick = function() {
    const keyword = removeVietnameseTones(searchInput.value.trim().toLowerCase());
    if (!keyword) {
      alert('Vui lòng nhập tên xã/phường!');
      return;
    }
    const foundFile = cachedGeojsonFiles.find(f => {
      const name = removeVietnameseTones(f.replace('.geojson','').toLowerCase());
      return name.includes(keyword);
    });
    if (!foundFile) {
      alert('Không tìm thấy xã/phường phù hợp!');
      return;
    }
    fetch('geo-json/' + encodeURIComponent(foundFile))
      .then(res => res.json())
      .then(data => {
        let bounds = L.geoJSON(data).getBounds();
        let center = bounds.getCenter();
        map.setView(center, 12);
        let feature = data.features && data.features[0];
        if (feature && feature.properties) {
          const popup = L.popup()
            .setLatLng(center)
            .setContent(createPopupContent(feature.properties));
          map.openPopup(popup);
        }
      })
      .catch(() => {
        alert('Lỗi khi tải dữ liệu xã/phường!');
      });
  };
}

// ====== Thêm hàm tạo nút ẩn/hiện overlay ======
function setupToggleOverlayBtn(map) {
  // Nếu đã có control thì không thêm nữa
  if (map._toggleOverlayControl) return;
  // Tạo custom control
  const ToggleOverlayControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const btn = L.DomUtil.create('a', '', container);
      btn.id = 'toggle-overlay-btn';
      btn.href = '#';
      btn.title = 'Ẩn/Hiện ranh giới các xã/phường';
      btn.style.background = 'transparent';
      btn.style.fontWeight = 'bold';
      btn.style.fontSize = '20px';
      btn.style.width = '36px';
      btn.style.height = '36px';
      btn.style.lineHeight = '36px';
      btn.style.borderRadius = '50%';
      btn.style.margin = '6px 0 0 0';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.textAlign = 'center';
      btn.innerHTML = '👁️';
      L.DomEvent.on(btn, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        geojsonVisible = !geojsonVisible;
        geojsonLayers.forEach(layer => {
          if (geojsonVisible) {
            map.addLayer(layer);
          } else {
            map.removeLayer(layer);
          }
        });
        btn.innerHTML = geojsonVisible ? '👁️' : '🙈';
      });
      return container;
    }
  });
  const control = new ToggleOverlayControl();
  map.addControl(control);
  map._toggleOverlayControl = control;
}

// ====== MAIN ======
(function main() {
  const map = initMap();
  setupLocateButton(map);
  loadAllGeojsons(map);
})(); 