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
  mat_do_km2: 'Mật độ (người/km²)',
  bi_thu: 'Bí thư',
  sdt_bt: 'SĐT Bí thư',
  chu_tich: 'Chủ tịch',
  sdt_ct: 'SĐT Chủ tịch'
};

let cachedGeojsonFiles = [];
// Thêm biến lưu các layer geojson để quản lý bật/tắt
let geojsonLayers = [];
let geojsonVisible = true;
let currentOverlayOpacity = 0.4;

// Biến cho tính năng đo khoảng cách
let isMeasuring = false;
let measurePoints = [];
let measureMarkers = [];
let measurePolyline = null;
let measureClickHandler = null;
let measureSegmentLabels = []; // Lưu các label hiển thị khoảng cách từng đoạn

// Biến cho tính năng đo diện tích
let isMeasuringArea = false;
let areaPoints = [];
let areaMarkers = [];
let areaPolygon = null;
let areaClickHandler = null;
let areaSegmentLabels = []; // Lưu các label hiển thị độ dài từng cạnh

// Biến cho panel thông tin xã/phường
let infoPanel = null;
let infoPanelBody = null;
let infoPanelTitle = null;

// Hàm tắt/bật tương tác với GeoJSON layers
function toggleGeojsonInteractivity(enable) {
  geojsonLayers.forEach(layer => {
    layer.eachLayer(function(featureLayer) {
      if (enable) {
        // Bật lại tương tác
        featureLayer.options.interactive = true;
        if (featureLayer._path) {
          featureLayer._path.style.pointerEvents = '';
        }
        if (featureLayer._renderer && featureLayer._renderer._container) {
          featureLayer._renderer._container.style.pointerEvents = '';
        }
      } else {
        // Tắt tương tác - đặt pointer-events: none
        featureLayer.options.interactive = false;
        if (featureLayer._path) {
          featureLayer._path.style.pointerEvents = 'none';
        }
        if (featureLayer._renderer && featureLayer._renderer._container) {
          featureLayer._renderer._container.style.pointerEvents = 'none';
        }
        // Đóng popup nếu đang mở
        if (featureLayer.isPopupOpen && featureLayer.isPopupOpen()) {
          featureLayer.closePopup();
        }
      }
    });
  });
}

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

// Tạo nội dung cho panel thông tin bên phải
function createInfoPanelContent(properties, isDhlvb = false, isProject = false, projectName = '') {
  if (isDhlvb) {
    return `
      <div class="info-panel-empty">
        <strong>Dự án: Đường hành lang ven biển</strong><br/>
        Thông tin chi tiết đang được cập nhật.
      </div>
    `;
  }
  if (isProject && projectName) {
    return `
      <div class="info-panel-empty">
        <strong>Dự án: ${projectName}</strong><br/>
        Thông tin chi tiết đang được cập nhật.
      </div>
    `;
  }
  if (!properties) {
    return '<div class="info-panel-empty">Không có thông tin cho khu vực này.</div>';
  }
  let html = '<table class="info-panel-table">';
  for (const key in fieldMap) {
    if (properties[key] !== undefined) {
      html += `
        <tr>
          <td class="label">${fieldMap[key]}</td>
          <td class="value">${properties[key]}</td>
        </tr>
      `;
    }
  }
  html += '</table>';
  return html;
}

function openInfoPanel(properties, isDhlvb = false, isProject = false, projectName = '') {
  if (!infoPanel || !infoPanelBody || !infoPanelTitle) return;
  let title = 'Thông tin khu vực';
  if (isProject && projectName) {
    title = projectName;
  } else if (properties && properties.ten) {
    title = properties.ten;
  }
  infoPanelTitle.textContent = title;
  infoPanelBody.innerHTML = createInfoPanelContent(properties, isDhlvb, isProject, projectName);
  infoPanel.classList.add('visible');
}

function setupInfoPanel() {
  infoPanel = document.getElementById('info-panel');
  infoPanelBody = document.getElementById('info-panel-body');
  infoPanelTitle = document.getElementById('info-panel-title');
  const closeBtn = document.getElementById('info-panel-close');
  if (closeBtn && infoPanel) {
    closeBtn.onclick = function() {
      infoPanel.classList.remove('visible');
    };
  }
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

// ====== XỬ LÝ XÁC ĐỊNH VỊ TRÍ REAL-TIME ======
let watchPositionId = null;
let currentLocationMarker = null;
let isTrackingLocation = false;

function setupLocateButton(map) {
  const locateBtnDom = document.getElementById('locate-btn');
  if (!locateBtnDom) return;
  
  locateBtnDom.onclick = function() {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ xác định vị trí!');
      return;
    }
    
    // Nếu đang theo dõi, dừng lại
    if (isTrackingLocation && watchPositionId !== null) {
      navigator.geolocation.clearWatch(watchPositionId);
      watchPositionId = null;
      isTrackingLocation = false;
      locateBtnDom.disabled = false;
      locateBtnDom.innerText = '📍 Xác định vị trí';
      locateBtnDom.classList.remove('active');
      return;
    }
    
    // Bắt đầu theo dõi vị trí
    locateBtnDom.disabled = true;
    locateBtnDom.innerText = 'Đang xác định vị trí...';
    locateBtnDom.classList.add('active');
    
    // Xóa marker cũ nếu có
    if (currentLocationMarker) {
      map.removeLayer(currentLocationMarker);
      currentLocationMarker = null;
    }
    
    // Cấu hình options cho watchPosition
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    watchPositionId = navigator.geolocation.watchPosition(
      function(pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        // Xóa marker cũ nếu có
        if (currentLocationMarker) {
          map.removeLayer(currentLocationMarker);
        }
        
        // Tạo marker mới với icon đặc biệt cho real-time
        currentLocationMarker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        }).addTo(map);
        
        // Thêm circle để hiển thị độ chính xác
        const accuracy = pos.coords.accuracy;
        if (currentLocationMarker._accuracyCircle) {
          map.removeLayer(currentLocationMarker._accuracyCircle);
        }
        currentLocationMarker._accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#1976d2',
          fillColor: '#1976d2',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(map);
        
        // Cập nhật popup với thông tin real-time
        const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) + ' km/h' : 'Không xác định';
        const heading = pos.coords.heading ? pos.coords.heading.toFixed(0) + '°' : 'Không xác định';
        currentLocationMarker.bindPopup(
          `<div style="text-align: center;">
            <strong>📍 Vị trí của bạn</strong><br>
            <small>Độ chính xác: ${accuracy.toFixed(0)} m</small><br>
            <small>Tốc độ: ${speed}</small><br>
            <small>Hướng: ${heading}</small>
          </div>`
        );
        
        // Cập nhật view của map (chỉ lần đầu hoặc khi zoom quá xa)
        if (!isTrackingLocation || map.getZoom() < 13) {
          map.setView([lat, lng], 15);
        } else {
          // Chỉ pan đến vị trí mới, không thay đổi zoom
          map.panTo([lat, lng]);
        }
        
        // Cập nhật trạng thái
        isTrackingLocation = true;
        locateBtnDom.disabled = false;
        locateBtnDom.innerText = '⏹️ Dừng theo dõi';
      },
      function(err) {
        if (err.code !== 1) {
          alert('Không thể xác định vị trí: ' + err.message);
        }
        locateBtnDom.disabled = false;
        locateBtnDom.innerText = '📍 Xác định vị trí';
        locateBtnDom.classList.remove('active');
        isTrackingLocation = false;
        if (watchPositionId !== null) {
          navigator.geolocation.clearWatch(watchPositionId);
          watchPositionId = null;
        }
      },
      options
    );
  };
}

// ====== HIỂN THỊ GEOJSON LÊN BẢN ĐỒ ======
function addGeojsonToMap(map, data) {
  const isDhlvb = data && data.name === 'DHLVB';
  const layer = L.geoJSON(data, {
    style: function(feature) {
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      // Sử dụng màu từ GeoJSON nếu có, nếu không thì dùng màu mặc định
      const featureStyle = feature.properties.style || {};
      return {
        color: isDhlvb ? '#ff0000' : (featureStyle.color || '#3388ff'),
        weight: isDhlvb ? 4 : (featureStyle.weight || 2),
        fillColor: isDhlvb ? '#ff0000' : randomColor,
        fillOpacity: featureStyle.opacity || currentOverlayOpacity
      };
    },
    onEachFeature: function (feature, layer) {
      const featureStyle = feature.properties.style || {};
      const baseColor = isDhlvb ? '#ff0000' : (featureStyle.color || '#3388ff');
      const baseWeight = isDhlvb ? 4 : (featureStyle.weight || 2);
      // Tooltip tên xã/phường
      if (feature.properties && feature.properties.ten) {
        layer.bindTooltip(feature.properties.ten, {direction: 'top', sticky: true, offset: [0, -8], className: 'custom-tooltip'});
      }
      // Hiển thị panel chi tiết khi click
      layer.on('click', function() {
        // Không mở popup nếu đang ở chế độ đo khoảng cách
        if (isMeasuring) {
          return;
        }
        layer.setStyle({color: '#2ecc40', weight: 3});
        openInfoPanel(feature.properties, isDhlvb);
      });
      layer.on('mouseover', function() {
        layer.setStyle({fillOpacity: 0.5, color: '#ff7800'});
      });
      layer.on('mouseout', function() {
        layer.setStyle({
          fillOpacity: currentOverlayOpacity, 
          color: baseColor
        });
      });
    }
  }).addTo(map);
  geojsonLayers.push(layer);
  return layer;
}

// ====== FORMAT TÊN DỰ ÁN ======
function formatProjectName(filename) {
  const nameMap = {
    'CaoTocTraVinh-HongNgu_1': 'Cao tốc Trà Vinh - Hồng Ngự',
    'CaoTocHCM-TienGiang-TraVinh-SocTrang_1': 'Cao tốc HCM - Tiền Giang - Trà Vinh - Sóc Trăng',
    'DuongTinh911_1': 'Đường tỉnh 911',
    'DuongTinh914B_1': 'Đường tỉnh 914B'
  };
  const baseName = filename.replace('.geojson', '');
  return nameMap[baseName] || baseName;
}

// ====== THÊM DỰ ÁN VỚI MÀU SẮC CỤ THỂ ======
function addProjectToMap(map, filename, color, weight = 6, displayName = '') {
  fetch('geo-json/' + encodeURIComponent(filename))
    .then(res => res.json())
    .then(data => {
      // Tạo pane riêng cho các dự án nếu chưa có
      if (!map._projectPane) {
        map._projectPane = map.createPane('projectPane');
        map._projectPane.style.zIndex = 650; // Cao hơn overlayPane (z-index 400)
      }
      
      // Lấy tên dự án đã format
      const projectName = displayName || formatProjectName(filename);
      
      const layer = L.geoJSON(data, {
        style: function(feature) {
          return {
            color: color,
            weight: weight,
            fillColor: color,
            fillOpacity: 0.5,
            opacity: 1.0
          };
        },
        onEachFeature: function (feature, layer) {
          // Tooltip tên dự án
          layer.bindTooltip(projectName, {
            direction: 'top', 
            sticky: true, 
            offset: [0, -8], 
            className: 'custom-tooltip'
          });
          // Hiển thị panel chi tiết khi click
          layer.on('click', function() {
            if (isMeasuring || isMeasuringArea) {
              return;
            }
            layer.setStyle({color: '#2ecc40', weight: weight + 2});
            openInfoPanel(null, false, true, projectName);
          });
          layer.on('mouseover', function() {
            layer.setStyle({fillOpacity: 0.7, color: '#ff7800', weight: weight + 2});
          });
          layer.on('mouseout', function() {
            layer.setStyle({
              fillOpacity: 0.5, 
              color: color,
              weight: weight
            });
          });
        },
        // Sử dụng pane riêng để đảm bảo nằm phía trên
        pane: 'projectPane'
      });
      
      layer.addTo(map);
      // Đưa toàn bộ layer lên phía trên
      layer.bringToFront();
      geojsonLayers.push(layer);
    })
    .catch(err => console.error('Lỗi tải dự án', filename, err));
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

// ====== TẢI CÁC DỰ ÁN VỚI MÀU SẮC KHÁC NHAU ======
function loadProjects(map) {
  // Cao tốc Trà Vinh - Hồng Ngự: màu đỏ đậm
  addProjectToMap(map, 'CaoTocTraVinh-HongNgu_1.geojson', '#B22222', 6, 'Cao tốc Trà Vinh - Hồng Ngự');
  
  // Cao tốc HCM - Tiền Giang - Trà Vinh - Sóc Trăng: màu xanh dương đậm
  addProjectToMap(map, 'CaoTocHCM-TienGiang-TraVinh-SocTrang_1.geojson', '#0066CC', 6, 'Cao tốc HCM - Tiền Giang - Trà Vinh - Sóc Trăng');
  
  // Đường tỉnh 911: màu xanh lá đậm
  addProjectToMap(map, 'DuongTinh911_1.geojson', '#228B22', 6, 'Đường tỉnh 911');
  
  // Đường tỉnh 914B: màu cam đậm
  addProjectToMap(map, 'DuongTinh914B_1.geojson', '#FF6600', 6, 'Đường tỉnh 914B');
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
          openInfoPanel(feature.properties, false);
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

function setupOpacitySliderControl(map) {
  if (map._opacitySliderControl) return;
  const OpacitySliderControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      container.style.background = 'rgba(255,255,255,0.95)';
      container.style.padding = '6px 10px 2px 10px';
      container.style.borderRadius = '8px';
      container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      // Label
      const label = L.DomUtil.create('label', '', container);
      label.innerText = 'Độ trong suốt';
      label.style.fontSize = '12px';
      label.style.color = '#333';
      label.style.marginBottom = '2px';
      // Slider
      const slider = L.DomUtil.create('input', '', container);
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.05';
      slider.value = '0.4';
      slider.title = 'Điều chỉnh độ trong suốt lớp ranh giới';
      slider.style.width = '70px';
      slider.style.margin = '0 0 2px 0';
      slider.style.cursor = 'pointer';
      // Giá trị
      const valueSpan = L.DomUtil.create('span', '', container);
      valueSpan.innerText = '0.40';
      valueSpan.style.fontSize = '11px';
      valueSpan.style.color = '#1976d2';
      valueSpan.style.marginTop = '0px';
      // Ngăn sự kiện ảnh hưởng map
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      // Sự kiện thay đổi opacity
      slider.addEventListener('input', function() {
        const val = parseFloat(slider.value);
        valueSpan.innerText = val.toFixed(2);
        currentOverlayOpacity = val;
        geojsonLayers.forEach(layer => {
          layer.setStyle({ fillOpacity: currentOverlayOpacity });
        });
      });
      return container;
    }
  });
  const control = new OpacitySliderControl();
  map.addControl(control);
  map._opacitySliderControl = control;
}

// ====== TÍNH NĂNG ĐO KHOẢNG CÁCH ======
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Bán kính Trái Đất tính bằng mét
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters) {
  if (meters < 1000) {
    return meters.toFixed(2) + ' m';
  } else {
    return (meters / 1000).toFixed(2) + ' km';
  }
}

// ====== TÍNH NĂNG ĐO DIỆN TÍCH ======
function calculatePolygonArea(points) {
  if (points.length < 3) return 0;
  
  const R = 6371000; // Bán kính Trái Đất tính bằng mét
  let area = 0;
  
  // Chuyển đổi tất cả điểm sang radian
  const radPoints = points.map(p => ({
    lat: p.lat * Math.PI / 180,
    lng: p.lng * Math.PI / 180
  }));
  
  // Tính diện tích sử dụng công thức spherical excess (Girard's theorem)
  for (let i = 0; i < radPoints.length; i++) {
    const j = (i + 1) % radPoints.length;
    const k = (i + 2) % radPoints.length;
    
    const p1 = radPoints[i];
    const p2 = radPoints[j];
    const p3 = radPoints[k];
    
    // Tính các cạnh của tam giác cầu
    const a = Math.acos(
      Math.sin(p2.lat) * Math.sin(p3.lat) +
      Math.cos(p2.lat) * Math.cos(p3.lat) * Math.cos(p3.lng - p2.lng)
    );
    const b = Math.acos(
      Math.sin(p1.lat) * Math.sin(p3.lat) +
      Math.cos(p1.lat) * Math.cos(p3.lat) * Math.cos(p3.lng - p1.lng)
    );
    const c = Math.acos(
      Math.sin(p1.lat) * Math.sin(p2.lat) +
      Math.cos(p1.lat) * Math.cos(p2.lat) * Math.cos(p2.lng - p1.lng)
    );
    
    // Tính nửa chu vi
    const s = (a + b + c) / 2;
    
    // Tính spherical excess
    const tanHalfS = Math.tan(s / 2);
    const tanHalfSA = Math.tan((s - a) / 2);
    const tanHalfSB = Math.tan((s - b) / 2);
    const tanHalfSC = Math.tan((s - c) / 2);
    
    const excess = 4 * Math.atan(
      Math.sqrt(
        Math.max(0, tanHalfS * tanHalfSA * tanHalfSB * tanHalfSC)
      )
    );
    
    area += excess;
  }
  
  // Diện tích tính bằng mét vuông
  area = Math.abs(area) * R * R;
  
  return area;
}

function formatArea(squareMeters) {
  const squareKm = squareMeters / 1000000;
  const hectares = squareMeters / 10000;
  
  if (squareKm >= 1) {
    return squareKm.toFixed(4) + ' km²';
  } else if (hectares >= 1) {
    return hectares.toFixed(2) + ' ha';
  } else {
    return squareMeters.toFixed(2) + ' m²';
  }
}

function formatHectares(squareMeters) {
  const hectares = squareMeters / 10000;
  return hectares.toFixed(2) + ' ha';
}

// ====== XỬ LÝ ĐO DIỆN TÍCH ======
function updateAreaDisplay() {
  const areaInfo = document.getElementById('area-info');
  const areaValue = document.getElementById('area-value');
  const areaHectares = document.getElementById('area-hectares');
  const areaPointsEl = document.getElementById('area-points');
  
  if (areaPoints.length < 3) {
    if (areaInfo) areaInfo.style.display = 'none';
    return;
  }
  
  const area = calculatePolygonArea(areaPoints);
  const areaText = 'Diện tích: ' + formatArea(area);
  const hectaresText = '(' + formatHectares(area) + ')';
  const pointsText = 'Số điểm: ' + areaPoints.length;
  
  // Cập nhật thông tin ở phần chính
  if (areaInfo) areaInfo.style.display = 'block';
  if (areaValue) areaValue.textContent = areaText;
  if (areaHectares) areaHectares.textContent = hectaresText;
  if (areaPointsEl) areaPointsEl.textContent = pointsText;
}

function clearArea(map) {
  // Xóa tất cả markers
  areaMarkers.forEach(marker => map.removeLayer(marker));
  areaMarkers = [];
  
  // Xóa tất cả label đoạn
  areaSegmentLabels.forEach(label => map.removeLayer(label));
  areaSegmentLabels = [];
  
  // Xóa polygon
  if (areaPolygon) {
    map.removeLayer(areaPolygon);
    areaPolygon = null;
  }
  
  // Xóa mảng điểm
  areaPoints = [];
  
  // Ẩn thông tin
  const areaInfo = document.getElementById('area-info');
  if (areaInfo) {
    areaInfo.style.display = 'none';
  }
  
  // Ẩn nút xóa
  const clearBtn = document.getElementById('clear-area-btn');
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
}

function setupAreaButton(map) {
  const areaBtn = document.getElementById('area-btn');
  const clearBtn = document.getElementById('clear-area-btn');
  
  if (!areaBtn) return;
  
  areaBtn.onclick = function() {
    // Tắt chế độ đo khoảng cách nếu đang bật
    if (isMeasuring) {
      const measureBtn = document.getElementById('measure-btn');
      if (measureBtn) measureBtn.click();
    }
    
    isMeasuringArea = !isMeasuringArea;
    
    if (isMeasuringArea) {
      // Bật chế độ đo diện tích
      areaBtn.classList.add('active');
      areaBtn.textContent = '⏹️ Dừng đo';
      if (clearBtn) clearBtn.style.display = 'inline-block';
      
      // Tắt tương tác với GeoJSON layers để tránh nhấn nhầm
      toggleGeojsonInteractivity(false);
      
      // Thay đổi cursor
      map.getContainer().style.cursor = 'crosshair';
      
      // Thêm sự kiện click
      areaClickHandler = function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Thêm điểm vào mảng
        areaPoints.push({ lat, lng });
        
        // Tạo marker
        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: '#ff9800',
          color: '#fff',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);
        
        // Thêm số thứ tự vào marker
        marker.bindTooltip(areaPoints.length.toString(), {
          permanent: true,
          direction: 'center',
          className: 'area-point-tooltip',
          offset: [0, 0]
        });
        
        areaMarkers.push(marker);
        
        // Xóa polygon và labels cũ để vẽ lại
        if (areaPolygon) {
          map.removeLayer(areaPolygon);
        }
        areaSegmentLabels.forEach(label => map.removeLayer(label));
        areaSegmentLabels = [];
        
        if (areaPoints.length >= 3) {
          const latlngs = areaPoints.map(p => [p.lat, p.lng]);
          // Đóng polygon bằng cách thêm điểm đầu vào cuối
          latlngs.push([areaPoints[0].lat, areaPoints[0].lng]);
          
          areaPolygon = L.polygon(latlngs, {
            color: '#ff9800',
            weight: 3,
            fillColor: '#ff9800',
            fillOpacity: 0.3
          }).addTo(map);
          
          // Thêm label khoảng cách cho từng cạnh
          for (let i = 0; i < areaPoints.length; i++) {
            const p1 = areaPoints[i];
            const p2 = areaPoints[(i + 1) % areaPoints.length];
            const segmentDistance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
            
            // Tính điểm giữa của cạnh
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            
            // Tạo label hiển thị khoảng cách
            const labelText = formatDistance(segmentDistance);
            const label = L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'area-segment-label',
                html: '<div class="area-segment-label-content">' + labelText + '</div>',
                iconSize: [100, 30],
                iconAnchor: [50, 15]
              }),
              interactive: false,
              zIndexOffset: 1000
            }).addTo(map);
            
            areaSegmentLabels.push(label);
          }
        } else if (areaPoints.length >= 2) {
          // Vẽ đường nối khi chưa đủ 3 điểm
          const latlngs = areaPoints.map(p => [p.lat, p.lng]);
          areaPolygon = L.polyline(latlngs, {
            color: '#ff9800',
            weight: 3,
            dashArray: '5, 5',
            opacity: 0.8
          }).addTo(map);
          
          // Thêm label cho đoạn hiện tại
          const p1 = areaPoints[areaPoints.length - 2];
          const p2 = areaPoints[areaPoints.length - 1];
          const segmentDistance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
          
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;
          
          const labelText = formatDistance(segmentDistance);
          const label = L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: 'area-segment-label',
              html: '<div class="area-segment-label-content">' + labelText + '</div>',
              iconSize: [100, 30],
              iconAnchor: [50, 15]
            }),
            interactive: false,
            zIndexOffset: 1000
          }).addTo(map);
          
          areaSegmentLabels.push(label);
        }
        
        updateAreaDisplay();
      };
      
      map.on('click', areaClickHandler);
    } else {
      // Tắt chế độ đo diện tích
      areaBtn.classList.remove('active');
      areaBtn.textContent = '📐 Đo diện tích';
      map.getContainer().style.cursor = '';
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      // Xóa sự kiện click
      if (areaClickHandler) {
        map.off('click', areaClickHandler);
        areaClickHandler = null;
      }
    }
  };
  
  if (clearBtn) {
    clearBtn.onclick = function() {
      clearArea(map);
      isMeasuringArea = false;
      areaBtn.classList.remove('active');
      areaBtn.textContent = '📐 Đo diện tích';
      map.getContainer().style.cursor = '';
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      if (areaClickHandler) {
        map.off('click', areaClickHandler);
        areaClickHandler = null;
      }
    };
  }
}

function updateMeasureDisplay() {
  const measureInfo = document.getElementById('measure-info');
  const measureDistance = document.getElementById('measure-distance');
  const measurePointsEl = document.getElementById('measure-points');
  
  if (measurePoints.length === 0) {
    if (measureInfo) measureInfo.style.display = 'none';
    return;
  }
  
  let totalDistance = 0;
  for (let i = 0; i < measurePoints.length - 1; i++) {
    const p1 = measurePoints[i];
    const p2 = measurePoints[i + 1];
    totalDistance += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  
  const distanceText = 'Tổng khoảng cách: ' + formatDistance(totalDistance);
  const pointsText = 'Số điểm: ' + measurePoints.length;
  
  // Cập nhật thông tin ở phần chính
  if (measureInfo) measureInfo.style.display = 'block';
  if (measureDistance) measureDistance.textContent = distanceText;
  if (measurePointsEl) measurePointsEl.textContent = pointsText;
}

function clearMeasure(map) {
  // Xóa tất cả markers
  measureMarkers.forEach(marker => map.removeLayer(marker));
  measureMarkers = [];
  
  // Xóa tất cả label đoạn
  measureSegmentLabels.forEach(label => map.removeLayer(label));
  measureSegmentLabels = [];
  
  // Xóa polyline
  if (measurePolyline) {
    map.removeLayer(measurePolyline);
    measurePolyline = null;
  }
  
  // Xóa mảng điểm
  measurePoints = [];
  
  // Ẩn thông tin
  const measureInfo = document.getElementById('measure-info');
  if (measureInfo) {
    measureInfo.style.display = 'none';
  }
  
  // Ẩn nút xóa
  const clearBtn = document.getElementById('clear-measure-btn');
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
}

function setupMeasureButton(map) {
  const measureBtn = document.getElementById('measure-btn');
  const clearBtn = document.getElementById('clear-measure-btn');
  
  if (!measureBtn) return;
  
  measureBtn.onclick = function() {
    isMeasuring = !isMeasuring;
    
    if (isMeasuring) {
      // Bật chế độ đo
      measureBtn.classList.add('active');
      measureBtn.textContent = '⏹️ Dừng đo';
      if (clearBtn) clearBtn.style.display = 'inline-block';
      
      // Tắt tương tác với GeoJSON layers để tránh nhấn nhầm
      toggleGeojsonInteractivity(false);
      
      // Thay đổi cursor
      map.getContainer().style.cursor = 'crosshair';
      
      // Thêm sự kiện click
      measureClickHandler = function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Thêm điểm vào mảng
        measurePoints.push({ lat, lng });
        
        // Tạo marker với kích thước lớn hơn
        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: '#4caf50',
          color: '#fff',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);
        
        // Thêm số thứ tự vào marker với style rõ ràng hơn
        marker.bindTooltip(measurePoints.length.toString(), {
          permanent: true,
          direction: 'center',
          className: 'measure-point-tooltip',
          offset: [0, 0]
        });
        
        measureMarkers.push(marker);
        
        // Xóa polyline và labels cũ để vẽ lại
        if (measurePolyline) {
          map.removeLayer(measurePolyline);
        }
        measureSegmentLabels.forEach(label => map.removeLayer(label));
        measureSegmentLabels = [];
        
        if (measurePoints.length > 1) {
          const latlngs = measurePoints.map(p => [p.lat, p.lng]);
          measurePolyline = L.polyline(latlngs, {
            color: '#4caf50',
            weight: 3,
            dashArray: '5, 5',
            opacity: 0.8
          }).addTo(map);
          
          // Thêm label khoảng cách cho từng đoạn
          for (let i = 0; i < measurePoints.length - 1; i++) {
            const p1 = measurePoints[i];
            const p2 = measurePoints[i + 1];
            const segmentDistance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
            
            // Tính điểm giữa của đoạn
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            
            // Tạo label hiển thị khoảng cách
            const labelText = formatDistance(segmentDistance);
            const label = L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'measure-segment-label',
                html: '<div class="measure-segment-label-content">' + labelText + '</div>',
                iconSize: [100, 30],
                iconAnchor: [50, 15]
              }),
              interactive: false,
              zIndexOffset: 1000
            }).addTo(map);
            
            measureSegmentLabels.push(label);
          }
        }
        
        updateMeasureDisplay();
      };
      
      map.on('click', measureClickHandler);
    } else {
      // Tắt chế độ đo
      measureBtn.classList.remove('active');
      measureBtn.textContent = '📏 Đo khoảng cách';
      map.getContainer().style.cursor = '';
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      // Xóa sự kiện click
      if (measureClickHandler) {
        map.off('click', measureClickHandler);
        measureClickHandler = null;
      }
    }
  };
  
  if (clearBtn) {
    clearBtn.onclick = function() {
      clearMeasure(map);
      isMeasuring = false;
      measureBtn.classList.remove('active');
      measureBtn.textContent = '📏 Đo khoảng cách';
      map.getContainer().style.cursor = '';
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      if (measureClickHandler) {
        map.off('click', measureClickHandler);
        measureClickHandler = null;
      }
    };
  }
}


// ====== MAIN ======
(function main() {
  const map = initMap();
  window.mapInstance = map; // Lưu instance để dùng trong fullscreen
  setupInfoPanel();
  setupLocateButton(map);
  loadAllGeojsons(map);
  // Tải các dự án sau một khoảng thời gian ngắn để đảm bảo chúng nằm phía trên các layer khác
  setTimeout(() => {
    loadProjects(map); // Tải các dự án với màu sắc khác nhau
  }, 500);
  setupOpacitySliderControl(map);
  setupMeasureButton(map);
  setupAreaButton(map);
})(); 