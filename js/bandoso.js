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
      const dhlvbPopup = '<div class="popup-info"><div class="popup-title">Dự án</div><div><strong>Đường hành lang ven biển</strong></div></div>';
      // Tooltip tên xã/phường
      if (feature.properties && feature.properties.ten) {
        layer.bindTooltip(feature.properties.ten, {direction: 'top', sticky: true, offset: [0, -8], className: 'custom-tooltip'});
      }
      // Popup chi tiết khi click
      layer.on('click', function() {
        // Không mở popup nếu đang ở chế độ đo khoảng cách
        if (isMeasuring) {
          return;
        }
        layer.setStyle({color: '#2ecc40', weight: 3});
        if (isDhlvb) {
          layer.bindPopup(dhlvbPopup).openPopup();
        } else {
          layer.bindPopup(createPopupContent(feature.properties)).openPopup();
        }
      });
      // Reset style khi popup đóng
      layer.on('popupclose', function() {
        layer.setStyle({
          color: baseColor, 
          weight: baseWeight
        });
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
  
  if (measureInfo) measureInfo.style.display = 'block';
  if (measureDistance) measureDistance.textContent = 'Tổng khoảng cách: ' + formatDistance(totalDistance);
  if (measurePointsEl) measurePointsEl.textContent = 'Số điểm: ' + measurePoints.length;
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
      
      // Cập nhật nút xóa trong fullscreen panel
      if (window._fullscreenClearBtn) {
        window._fullscreenClearBtn.style.display = 'block';
      }
      
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
      
      // Ẩn nút xóa trong fullscreen panel
      if (window._fullscreenClearBtn) {
        window._fullscreenClearBtn.style.display = 'none';
      }
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      if (measureClickHandler) {
        map.off('click', measureClickHandler);
        measureClickHandler = null;
      }
    };
  }
}

// ====== TÍNH NĂNG TOÀN MÀN HÌNH ======
function setupFullscreenButton(map) {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (!fullscreenBtn) return;
  
  const mapContainer = document.getElementById('map');
  const container = document.querySelector('.container');
  
  // Kiểm tra hỗ trợ Fullscreen API
  const isFullscreenSupported = document.fullscreenEnabled || 
                                 document.webkitFullscreenEnabled || 
                                 document.mozFullScreenEnabled || 
                                 document.msFullscreenEnabled;
  
  // Tạo các control trên bản đồ cho fullscreen
  let fullscreenControls = {
    exitBtn: null,
    toolsPanel: null
  };
  
  function createFullscreenControls() {
    // Tạo nút thoát fullscreen
    if (!fullscreenControls.exitBtn) {
      fullscreenControls.exitBtn = L.control({position: 'topright'});
      fullscreenControls.exitBtn.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', 'fullscreen-exit-btn', div);
        btn.href = '#';
        btn.title = 'Thoát toàn màn hình (ESC)';
        btn.innerHTML = '⛶';
        btn.style.cssText = 'background: rgba(156,39,176,0.9); color: white; font-size: 18px; font-weight: bold; width: 36px; height: 36px; line-height: 36px; text-align: center; border-radius: 4px;';
        L.DomEvent.on(btn, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          exitFullscreen();
        });
        return div;
      };
      fullscreenControls.exitBtn.addTo(map);
    }
    
    // Tạo panel chứa các nút chức năng
    if (!fullscreenControls.toolsPanel) {
      fullscreenControls.toolsPanel = L.control({position: 'bottomleft'});
      fullscreenControls.toolsPanel.onAdd = function() {
        const div = L.DomUtil.create('div', 'fullscreen-tools-panel');
        div.style.cssText = 'background: rgba(255,255,255,0.95); padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 6px;';
        
        // Nút Xác định vị trí
        const locateBtn = L.DomUtil.create('button', 'fullscreen-locate-btn', div);
        locateBtn.innerHTML = '📍 Xác định vị trí';
        locateBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 6px; background: linear-gradient(90deg, #1976d2 0%, #ff9800 100%); color: white; font-weight: 600; cursor: pointer; font-size: 13px;';
        L.DomEvent.on(locateBtn, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          const locateBtnDom = document.getElementById('locate-btn');
          if (locateBtnDom) locateBtnDom.click();
        });
        
        // Nút Đo khoảng cách
        const measureBtn = L.DomUtil.create('button', 'fullscreen-measure-btn', div);
        measureBtn.innerHTML = '📏 Đo khoảng cách';
        measureBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 6px; background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%); color: white; font-weight: 600; cursor: pointer; font-size: 13px;';
        L.DomEvent.on(measureBtn, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          const measureBtnDom = document.getElementById('measure-btn');
          if (measureBtnDom) measureBtnDom.click();
        });
        
        // Nút Xóa đo (sẽ hiển thị khi cần)
        const clearBtn = L.DomUtil.create('button', 'fullscreen-clear-btn', div);
        clearBtn.innerHTML = '🗑️ Xóa đo';
        clearBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 6px; background: linear-gradient(90deg, #ff5722 0%, #ff8a65 100%); color: white; font-weight: 600; cursor: pointer; font-size: 13px; display: none;';
        L.DomEvent.on(clearBtn, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          const clearBtnDom = document.getElementById('clear-measure-btn');
          if (clearBtnDom) clearBtnDom.click();
        });
        window._fullscreenClearBtn = clearBtn;
        
        // Thanh tìm kiếm
        const searchDiv = L.DomUtil.create('div', 'fullscreen-search', div);
        searchDiv.style.cssText = 'display: flex; gap: 4px; margin-top: 4px;';
        const searchInput = L.DomUtil.create('input', 'fullscreen-search-input', searchDiv);
        searchInput.type = 'text';
        searchInput.placeholder = 'Tìm xã/phường...';
        searchInput.style.cssText = 'padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; flex: 1;';
        const searchBtn = L.DomUtil.create('button', 'fullscreen-search-btn', searchDiv);
        searchBtn.innerHTML = '🔍';
        searchBtn.style.cssText = 'padding: 6px 12px; border: none; border-radius: 4px; background: #1877f2; color: white; cursor: pointer;';
        L.DomEvent.on(searchBtn, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          const searchBtnDom = document.getElementById('search-btn');
          if (searchBtnDom && searchInput.value) {
            document.getElementById('search-input').value = searchInput.value;
            searchBtnDom.click();
          }
        });
        
        L.DomEvent.disableClickPropagation(div);
        return div;
      };
      fullscreenControls.toolsPanel.addTo(map);
    }
  }
  
  function removeFullscreenControls() {
    if (fullscreenControls.exitBtn) {
      map.removeControl(fullscreenControls.exitBtn);
      fullscreenControls.exitBtn = null;
    }
    if (fullscreenControls.toolsPanel) {
      map.removeControl(fullscreenControls.toolsPanel);
      fullscreenControls.toolsPanel = null;
    }
    window._fullscreenClearBtn = null;
  }
  
  // Cập nhật nút xóa đo trong panel
  function updateFullscreenClearBtn() {
    if (window._fullscreenClearBtn) {
      const clearBtnDom = document.getElementById('clear-measure-btn');
      if (clearBtnDom && clearBtnDom.style.display !== 'none') {
        window._fullscreenClearBtn.style.display = 'block';
      } else {
        window._fullscreenClearBtn.style.display = 'none';
      }
    }
  }
  
  function enterFullscreen() {
    // Thử dùng Fullscreen API trước
    if (mapContainer.requestFullscreen) {
      mapContainer.requestFullscreen().catch(err => {
        console.log('Fullscreen API không khả dụng, dùng CSS fallback');
        updateFullscreenState();
      });
    } else if (mapContainer.webkitRequestFullscreen) {
      mapContainer.webkitRequestFullscreen();
    } else if (mapContainer.mozRequestFullScreen) {
      mapContainer.mozRequestFullScreen();
    } else if (mapContainer.msRequestFullscreen) {
      mapContainer.msRequestFullscreen();
    } else {
      // Fallback: dùng CSS để mô phỏng fullscreen
      updateFullscreenState();
    }
  }
  
  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
  
  function isInFullscreen() {
    return !!(document.fullscreenElement || 
              document.webkitFullscreenElement || 
              document.mozFullScreenElement || 
              document.msFullscreenElement);
  }
  
  function updateFullscreenState() {
    const isFullscreen = isInFullscreen() || isFullscreenMode;
    
    if (isFullscreen) {
      // Ẩn các phần khác nhưng giữ bản đồ
      const header = container.querySelector('header');
      const searchBar = container.querySelector('.search-bar-modern');
      const buttonsDivs = container.querySelectorAll('div[style*="display: flex"]');
      const measureInfo = document.getElementById('measure-info');
      
      // Lưu trạng thái display ban đầu
      if (!window._originalDisplayStates) {
        window._originalDisplayStates = {};
      }
      
      if (header) {
        window._originalDisplayStates.header = header.style.display || '';
        header.style.display = 'none';
      }
      if (searchBar) {
        window._originalDisplayStates.searchBar = searchBar.style.display || '';
        searchBar.style.display = 'none';
      }
      
      // Ẩn các div chứa buttons (trừ search bar)
      buttonsDivs.forEach((div, index) => {
        if (!div.classList.contains('search-bar-modern')) {
          const key = 'buttonsDiv' + index;
          window._originalDisplayStates[key] = div.style.display || '';
          div.style.display = 'none';
        }
      });
      
      if (measureInfo) {
        window._originalDisplayStates.measureInfo = measureInfo.style.display || '';
        measureInfo.style.display = 'none';
      }
      
      // Đặt style cho container và map
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.margin = '0';
      container.style.padding = '0';
      container.style.borderRadius = '0';
      container.style.maxWidth = '100%';
      container.style.zIndex = '9999';
      container.style.background = '#fff';
      
      mapContainer.style.width = '100vw';
      mapContainer.style.height = '100vh';
      mapContainer.style.margin = '0';
      mapContainer.style.borderRadius = '0';
      mapContainer.style.border = 'none';
      
      // Hiển thị các control trên bản đồ
      createFullscreenControls();
      fullscreenBtn.textContent = '⛶ Thoát toàn màn hình';
      fullscreenBtn.classList.add('active');
      
      // Cập nhật nút xóa đo
      setTimeout(updateFullscreenClearBtn, 100);
    } else {
      // Hiển thị lại các phần
      const header = container.querySelector('header');
      const searchBar = container.querySelector('.search-bar-modern');
      const buttonsDivs = container.querySelectorAll('div[style*="display: flex"]');
      const measureInfo = document.getElementById('measure-info');
      
      if (window._originalDisplayStates) {
        if (header && window._originalDisplayStates.header !== undefined) {
          header.style.display = window._originalDisplayStates.header;
        }
        if (searchBar && window._originalDisplayStates.searchBar !== undefined) {
          searchBar.style.display = window._originalDisplayStates.searchBar;
        }
        
        buttonsDivs.forEach((div, index) => {
          if (!div.classList.contains('search-bar-modern')) {
            const key = 'buttonsDiv' + index;
            if (window._originalDisplayStates[key] !== undefined) {
              div.style.display = window._originalDisplayStates[key];
            }
          }
        });
        
        if (measureInfo) {
          if (window._originalDisplayStates.measureInfo !== undefined) {
            measureInfo.style.display = window._originalDisplayStates.measureInfo;
          } else if (measurePoints.length > 0) {
            measureInfo.style.display = 'block';
          }
        }
      }
      
      // Khôi phục style cho container và map
      container.style.position = '';
      container.style.top = '';
      container.style.left = '';
      container.style.width = '';
      container.style.height = '';
      container.style.margin = '';
      container.style.padding = '';
      container.style.borderRadius = '';
      container.style.maxWidth = '';
      container.style.zIndex = '';
      container.style.background = '';
      
      mapContainer.style.width = '';
      mapContainer.style.height = '';
      mapContainer.style.margin = '';
      mapContainer.style.borderRadius = '';
      mapContainer.style.border = '';
      
      // Xóa các control
      removeFullscreenControls();
      fullscreenBtn.textContent = '⛶ Toàn màn hình';
      fullscreenBtn.classList.remove('active');
    }
    // Điều chỉnh lại kích thước bản đồ
    setTimeout(() => {
      if (window.mapInstance) {
        window.mapInstance.invalidateSize();
      }
    }, 100);
  }
  
  // Biến để theo dõi trạng thái fullscreen (cho fallback)
  let isFullscreenMode = false;
  
  fullscreenBtn.onclick = function() {
    if (isInFullscreen() || isFullscreenMode) {
      exitFullscreen();
      isFullscreenMode = false;
    } else {
      enterFullscreen();
      // Nếu không có Fullscreen API, dùng CSS fallback
      if (!isFullscreenSupported) {
        isFullscreenMode = true;
        updateFullscreenState();
      }
    }
  };
  
  // Lắng nghe sự kiện thay đổi fullscreen
  if (isFullscreenSupported) {
    document.addEventListener('fullscreenchange', function() {
      if (!isInFullscreen()) {
        isFullscreenMode = false;
      }
      updateFullscreenState();
    });
    document.addEventListener('webkitfullscreenchange', function() {
      if (!isInFullscreen()) {
        isFullscreenMode = false;
      }
      updateFullscreenState();
    });
    document.addEventListener('mozfullscreenchange', function() {
      if (!isInFullscreen()) {
        isFullscreenMode = false;
      }
      updateFullscreenState();
    });
    document.addEventListener('MSFullscreenChange', function() {
      if (!isInFullscreen()) {
        isFullscreenMode = false;
      }
      updateFullscreenState();
    });
  }
  
  // Lắng nghe phím ESC để thoát fullscreen
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && (isInFullscreen() || isFullscreenMode)) {
      exitFullscreen();
      if (isFullscreenMode) {
        isFullscreenMode = false;
        updateFullscreenState();
      }
    }
  });
}

// ====== MAIN ======
(function main() {
  const map = initMap();
  window.mapInstance = map; // Lưu instance để dùng trong fullscreen
  setupLocateButton(map);
  loadAllGeojsons(map);
  setupOpacitySliderControl(map);
  setupMeasureButton(map);
  setupFullscreenButton(map);
})(); 