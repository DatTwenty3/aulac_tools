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

// Biến cho quản lý các file DuAn
let duanLayers = {}; // Lưu các layer theo tên file
let duanFiles = []; // Danh sách các file trong folder DuAn
let duanConfig = {}; // Cấu hình màu và độ dày nét cho từng file
let selectedDuanFeatureLayer = null; // Layer đang được chọn
let selectedDuanFeatureStyle = null; // Style gốc của layer đang được chọn

// ====== MAPPING TÊN HIỂN THỊ TIẾNG VIỆT CHO CÁC FILE DUAN ======
// Tên hiển thị sẽ được đọc từ file list.json trong folder DuAn
// Fallback mapping nếu list.json không có displayName
const duanDisplayNames = {
  // Có thể thêm fallback ở đây nếu cần
};

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

// Biến cho hộp công cụ
let toolsPanel = null;
let toolsToggleBtn = null;

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

// Hàm format giá trị cho hiển thị
function formatValue(value, key = '') {
  if (value === null || value === undefined) {
    return '<span style="color: #94a3b8; font-style: italic;">Chưa có dữ liệu</span>';
  }
  
  // Format số
  if (typeof value === 'number') {
    // Format năm (nếu là số như 2.025 thì chuyển thành 2025)
    if (key === 'nam') {
      // Nếu số có phần thập phân (ví dụ: 2.025), chuyển thành số nguyên
      if (value % 1 !== 0) {
        // Chuyển thành string để xử lý
        const strValue = value.toString();
        const parts = strValue.split('.');
        if (parts.length === 2) {
          // Nối phần nguyên và phần thập phân (bỏ dấu chấm)
          // Ví dụ: "2.025" -> "2" + "025" -> "2025"
          const yearStr = parts[0] + parts[1];
          // Chuyển về số để loại bỏ số 0 đầu nếu có, sau đó chuyển lại thành string
          const yearNum = parseInt(yearStr, 10);
          return yearNum.toString();
        }
      }
      // Nếu là số nguyên, làm tròn và hiển thị
      return Math.round(value).toString();
    }
    
    // Format độ dài với đơn vị
    if (key === 'Shape_Length' || key === 'chieuDai') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} km (${value.toLocaleString('vi-VN')} m)`;
      }
      return `${value.toFixed(2)} m`;
    }
    
    // Format số lớn với dấu phẩy
    if (value >= 1000) {
      return value.toLocaleString('vi-VN');
    }
    
    // Format số nguyên
    return Math.round(value).toString();
  }
  
  // Format ngày tháng
  if (typeof value === 'string' && (value.includes('T') || value.includes('Z'))) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    } catch (e) {
      // Không phải ngày hợp lệ
    }
  }
  
  // Format loại quy hoạch
  if (key === 'loaiQuyHoach') {
    const loaiMap = {
      1: 'Quy hoạch',
      2: 'Hiện trạng',
      3: 'Định hướng'
    };
    return loaiMap[value] || value;
  }
  
  return value;
}

// Hàm format tên trường cho hiển thị
function formatFieldName(key) {
  const fieldNames = {
    'OBJECTID': 'ID',
    'maDoiTuong': 'Mã đối tượng',
    'ten': 'Tên',
    'phanLoai': 'Phân loại',
    'chieuDai': 'Chiều dài (m)',
    'quyMo': 'Quy mô',
    'capKyThuat': 'Cấp kỹ thuật',
    'loaiQuyHoach': 'Loại quy hoạch',
    'loaiHienTrang': 'Loại hiện trạng',
    'quyHoachBatDau': 'Quy hoạch bắt đầu',
    'quyHoachKetThuc': 'Quy hoạch kết thúc',
    'nguon': 'Nguồn',
    'nam': 'Năm',
    'Shape_Length': 'Độ dài (m)'
  };
  return fieldNames[key] || key;
}

// Tạo nội dung cho panel thông tin bên phải
function createInfoPanelContent(properties, isDhlvb = false, isProject = false, projectName = '', isDuanFeature = false) {
  if (isDhlvb) {
    return `
      <div class="info-panel-empty">
        <strong>Dự án: Đường hành lang ven biển</strong><br/>
        Thông tin chi tiết đang được cập nhật.
      </div>
    `;
  }
  if (isProject && projectName && !isDuanFeature) {
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
  
  // Nếu là feature từ DuAn, hiển thị thông tin chi tiết
  if (isDuanFeature) {
    let html = '<table class="info-panel-table">';
    // Sắp xếp các trường theo thứ tự ưu tiên
    const priorityFields = ['ten', 'phanLoai', 'maDoiTuong', 'OBJECTID', 'chieuDai', 'Shape_Length', 
                           'quyMo', 'capKyThuat', 'loaiQuyHoach', 'quyHoachBatDau', 'quyHoachKetThuc', 'nguon'];
    const displayedFields = new Set();
    
    // Danh sách các trường cần ẩn khi không có dữ liệu
    const fieldsToHideIfEmpty = ['chieuDai', 'Shape_Length', 'quyMo', 'capKyThuat'];
    
    // Hiển thị các trường ưu tiên trước
    priorityFields.forEach(key => {
      const value = properties[key];
      // Kiểm tra nếu trường này cần ẩn khi không có dữ liệu
      if (fieldsToHideIfEmpty.includes(key)) {
        // Bỏ qua nếu giá trị là null, undefined, hoặc rỗng
        if (value === null || value === undefined || value === '') {
          displayedFields.add(key);
          return;
        }
      }
      
      if (value !== undefined && value !== null) {
        html += `
          <tr>
            <td class="label">${formatFieldName(key)}</td>
            <td class="value">${formatValue(value, key)}</td>
          </tr>
        `;
        displayedFields.add(key);
      }
    });
    
    // Hiển thị các trường còn lại
    for (const key in properties) {
      if (!displayedFields.has(key) && key !== 'style') {
        html += `
          <tr>
            <td class="label">${formatFieldName(key)}</td>
            <td class="value">${formatValue(properties[key], key)}</td>
          </tr>
        `;
      }
    }
    
    html += '</table>';
    return html;
  }
  
  // Hiển thị thông tin xã/phường (code cũ)
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

function openInfoPanel(properties, isDhlvb = false, isProject = false, projectName = '', isDuanFeature = false) {
  if (!infoPanel || !infoPanelBody || !infoPanelTitle) return;
  let title = 'Thông tin khu vực';
  if (isDuanFeature && properties) {
    // Lấy tên từ properties, ưu tiên 'ten', sau đó 'phanLoai', cuối cùng là projectName
    if (properties.ten) {
      title = properties.ten;
      if (properties.phanLoai) {
        title += ` - ${properties.phanLoai}`;
      }
    } else if (properties.phanLoai) {
      title = properties.phanLoai;
    } else if (projectName) {
      title = projectName;
    }
  } else if (isProject && projectName) {
    title = projectName;
  } else if (properties && properties.ten) {
    title = properties.ten;
  }
  infoPanelTitle.textContent = title;
  infoPanelBody.innerHTML = createInfoPanelContent(properties, isDhlvb, isProject, projectName, isDuanFeature);
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

// Hàm ẩn/hiện thẻ thông tin
function toggleInfoCard(show) {
  const infoCard = document.getElementById('info-card');
  if (!infoCard) return;
  if (show) {
    infoCard.classList.remove('hidden');
  } else {
    infoCard.classList.add('hidden');
  }
}

// Hàm thiết lập thẻ thông tin
function setupInfoCard() {
  const infoToggleBtn = document.getElementById('info-toggle-btn');
  const infoCard = document.getElementById('info-card');
  const closeBtn = document.getElementById('info-card-close');
  
  if (infoToggleBtn && infoCard) {
    infoToggleBtn.onclick = function() {
      if (infoCard.classList.contains('hidden')) {
        toggleInfoCard(true);
      } else {
        toggleInfoCard(false);
      }
    };
  }
  
  if (closeBtn && infoCard) {
    closeBtn.onclick = function() {
      toggleInfoCard(false);
    };
  }
  
  // Mặc định hiện khi load trang
  toggleInfoCard(true);
}

// Hàm ẩn/hiện hộp công cụ
function toggleToolsPanel(show) {
  if (!toolsPanel) return;
  if (show) {
    toolsPanel.classList.add('visible');
    toolsPanel.classList.remove('hidden');
  } else {
    toolsPanel.classList.remove('visible');
    toolsPanel.classList.add('hidden');
  }
}

// Hàm thiết lập hộp công cụ
function setupToolsPanel() {
  toolsPanel = document.getElementById('tools-panel');
  toolsToggleBtn = document.getElementById('tools-toggle-btn');
  const closeBtn = document.getElementById('tools-panel-close');
  
  if (toolsToggleBtn && toolsPanel) {
    toolsToggleBtn.onclick = function() {
      if (toolsPanel.classList.contains('visible')) {
        toggleToolsPanel(false);
      } else {
        toggleToolsPanel(true);
      }
    };
  }
  
  if (closeBtn && toolsPanel) {
    closeBtn.onclick = function() {
      toggleToolsPanel(false);
    };
  }
  
  // Xử lý tab switching
  const tabButtons = document.querySelectorAll('.tools-tab-btn');
  const tabContents = document.querySelectorAll('.tools-tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Xóa active class từ tất cả tabs
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Thêm active class cho tab được chọn
      this.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });
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

  // Tạo pane riêng cho tooltip với z-index cao hơn các layer dự án (700)
  // TooltipPane mặc định của Leaflet có z-index 650, cần tăng lên để không bị che
  if (map.getPane('tooltipPane')) {
    map.getPane('tooltipPane').style.zIndex = 800;
  }

  // Lưu các layer để dùng sau
  map._baseLayers = {
    osm: osmLayer,
    satellite: satelliteLayer
  };

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
      // Xóa marker
      if (currentLocationMarker) {
        map.removeLayer(currentLocationMarker);
        currentLocationMarker = null;
      }
      // Hiện lại hộp công cụ khi dừng
      toggleToolsPanel(true);
      return;
    }
    
    // Bắt đầu theo dõi vị trí
    locateBtnDom.disabled = true;
    locateBtnDom.innerText = 'Đang xác định vị trí...';
    locateBtnDom.classList.add('active');
    
    // Ẩn hộp công cụ khi bắt đầu sử dụng
    toggleToolsPanel(false);
    
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
        
        // Tạo marker mới với icon hiện đại cho real-time
        const accuracy = pos.coords.accuracy;
        currentLocationMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-location-marker',
            html: `
              <div class="location-marker-container">
                <div class="location-marker-pulse"></div>
                <div class="location-marker-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#ef4444" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                  </svg>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          })
        }).addTo(map);
        
        // Cập nhật popup với thông tin real-time
        const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) + ' km/h' : 'Không xác định';
        const heading = pos.coords.heading ? pos.coords.heading.toFixed(0) + '°' : 'Không xác định';
        currentLocationMarker.bindPopup(
          `<div style="text-align: center; padding: 4px;">
            <strong style="color: #ef4444; font-size: 14px;">📍 Vị trí của bạn</strong><br>
            <small style="color: #666;">Độ chính xác: ${accuracy.toFixed(0)} m</small><br>
            <small style="color: #666;">Tốc độ: ${speed}</small><br>
            <small style="color: #666;">Hướng: ${heading}</small>
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
        // Hiện lại hộp công cụ khi có lỗi
        toggleToolsPanel(true);
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
        // Nếu đang ẩn ranh giới (geojsonVisible = false), không hiển thị màu khi hover
        if (geojsonVisible) {
          layer.setStyle({fillOpacity: 0.5, color: '#ff7800'});
        } else {
          // Chỉ thay đổi màu đường viền, không thay đổi fillOpacity
          layer.setStyle({color: '#ff7800'});
        }
      });
      layer.on('mouseout', function() {
        // Nếu đang ẩn ranh giới, giữ fillOpacity = 0
        if (geojsonVisible) {
          layer.setStyle({
            fillOpacity: currentOverlayOpacity, 
            color: baseColor
          });
        } else {
          // Chỉ khôi phục màu đường viền
          layer.setStyle({color: baseColor});
        }
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

// ====== QUẢN LÝ CÁC FILE DUAN ======
// Biến lưu danh sách file và tên hiển thị từ list.json
let duanFilesList = [];

// Hàm tải danh sách file GeoJSON từ folder DuAn
async function loadDuanFilesList() {
  try {
    // Thử đọc file list.json nếu có
    const response = await fetch('geo-json/DuAn/list.json');
    if (response.ok) {
      const list = await response.json();
      
      // Kiểm tra format mới (array of objects) hoặc format cũ (array of strings)
      if (Array.isArray(list) && list.length > 0) {
        if (typeof list[0] === 'object' && list[0].filename) {
          // Format mới: [{filename: "...", displayName: "..."}, ...]
          duanFilesList = list;
          return list.map(item => item.filename);
        } else if (typeof list[0] === 'string') {
          // Format cũ: ["file1.geojson", "file2.geojson", ...]
          duanFilesList = list.map(filename => ({
            filename: filename,
            displayName: duanDisplayNames[filename] || filename.replace('.geojson', '')
          }));
          return list.filter(f => f.endsWith('.geojson'));
        }
      }
    }
  } catch (e) {
    console.log('Không tìm thấy list.json trong folder DuAn, sử dụng danh sách mặc định');
  }
  
  // Danh sách file mặc định (nếu không có list.json)
  const defaultFiles = [
    'Hien Trang Mang Luoi Duong Bo.geojson',
    'Dinh Huong Phat Trien Mang Luoi Duong Bo.geojson'
  ];
  duanFilesList = defaultFiles.map(filename => ({
    filename: filename,
    displayName: duanDisplayNames[filename] || filename.replace('.geojson', '')
  }));
  return defaultFiles;
}

// Hàm lấy tên hiển thị từ danh sách đã load
function getDuanDisplayName(filename) {
  const fileInfo = duanFilesList.find(item => item.filename === filename);
  if (fileInfo && fileInfo.displayName) {
    return fileInfo.displayName;
  }
  // Fallback
  return duanDisplayNames[filename] || filename.replace('.geojson', '');
}

// Hàm tải cấu hình từ localStorage
function loadDuanConfig() {
  const saved = localStorage.getItem('duanConfig');
  if (saved) {
    try {
      duanConfig = JSON.parse(saved);
    } catch (e) {
      console.error('Lỗi đọc cấu hình:', e);
      duanConfig = {};
    }
  }
}

// Hàm lưu cấu hình vào localStorage
function saveDuanConfig() {
  localStorage.setItem('duanConfig', JSON.stringify(duanConfig));
}

// Hàm tạo màu mặc định cho file
function getDefaultColor(index) {
  const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
  return colors[index % colors.length];
}

// Hàm thêm file DuAn lên bản đồ
function addDuanFileToMap(map, filename, color, weight = 4) {
  // Tạo pane riêng cho các file DuAn nếu chưa có (z-index cao nhất)
  if (!map._duanPane) {
    map._duanPane = map.createPane('duanPane');
    map._duanPane.style.zIndex = 700; // Cao hơn projectPane (650) và overlayPane (400)
  }
  
  // Nếu layer đã tồn tại, xóa nó trước
  if (duanLayers[filename]) {
    map.removeLayer(duanLayers[filename]);
    delete duanLayers[filename];
  }
  
  const filepath = 'geo-json/DuAn/' + encodeURIComponent(filename);
  // Lấy tên hiển thị từ list.json hoặc fallback
  const displayName = getDuanDisplayName(filename);
  
  fetch(filepath)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const layer = L.geoJSON(data, {
        style: function(feature) {
          return {
            color: color,
            weight: weight,
            fillColor: color,
            fillOpacity: 0.3,
            opacity: 1.0
          };
        },
        onEachFeature: function (feature, layer) {
          // Lấy tên hiển thị cho tooltip (ưu tiên tên đường, sau đó là tên file)
          const tooltipText = (feature.properties && feature.properties.ten) 
            ? `${feature.properties.ten}${feature.properties.phanLoai ? ' - ' + feature.properties.phanLoai : ''}`
            : displayName;
          
          // Tooltip với thông tin đường
          layer.bindTooltip(tooltipText, {
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
            
            // Khôi phục style của layer trước đó nếu có
            if (selectedDuanFeatureLayer && selectedDuanFeatureLayer !== layer) {
              if (selectedDuanFeatureStyle) {
                selectedDuanFeatureLayer.setStyle(selectedDuanFeatureStyle);
              }
            }
            
            // Lưu style gốc của layer hiện tại
            selectedDuanFeatureStyle = {
              color: color,
              weight: weight,
              fillOpacity: 0.3
            };
            selectedDuanFeatureLayer = layer;
            
            // Highlight đường được chọn
            layer.setStyle({color: '#2ecc40', weight: weight + 2});
            
            // Hiển thị thông tin chi tiết từ properties
            openInfoPanel(feature.properties, false, true, displayName, true);
          });
          
          layer.on('mouseover', function() {
            layer.setStyle({fillOpacity: 0.5, color: '#ff7800', weight: weight + 2});
          });
          
          layer.on('mouseout', function() {
            // Khôi phục style ban đầu (trừ khi đang được chọn)
            if (selectedDuanFeatureLayer !== layer) {
              layer.setStyle({
                fillOpacity: 0.3, 
                color: color,
                weight: weight
              });
            }
          });
        },
        // Sử dụng pane riêng để đảm bảo nằm phía trên cùng
        pane: 'duanPane'
      });
      
      layer.addTo(map);
      // Đưa toàn bộ layer lên phía trên cùng
      layer.bringToFront();
      
      // Lưu layer vào object
      duanLayers[filename] = layer;
      
      // Đảm bảo layer luôn ở trên cùng khi có layer mới được thêm
      setTimeout(() => {
        if (duanLayers[filename]) {
          duanLayers[filename].bringToFront();
        }
      }, 100);
    })
    .catch(err => {
      console.error('Lỗi tải file DuAn', filename, err);
      // Ẩn checkbox nếu file không tải được
      const checkbox = document.querySelector(`input[data-filename="${filename}"]`);
      if (checkbox) {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = '0.5';
      }
    });
}

// Hàm cập nhật style của layer
function updateDuanLayerStyle(filename, color, weight) {
  if (duanLayers[filename]) {
    // Reset layer đang được chọn nếu nó thuộc file này
    if (selectedDuanFeatureLayer) {
      const layerGroup = duanLayers[filename];
      layerGroup.eachLayer(function(layer) {
        if (layer === selectedDuanFeatureLayer) {
          selectedDuanFeatureLayer = null;
          selectedDuanFeatureStyle = null;
        }
      });
    }
    
    // Cập nhật style cho tất cả các feature trong layer
    duanLayers[filename].eachLayer(function(layer) {
      layer.setStyle({
        color: color,
        weight: weight,
        fillColor: color,
        fillOpacity: 0.3
      });
    });
  }
}

// Hàm tạo UI cho từng file DuAn
function createDuanFileUI(filename, index) {
  // Lấy tên hiển thị từ list.json hoặc fallback
  const displayName = getDuanDisplayName(filename);
  const defaultColor = getDefaultColor(index);
  const defaultWeight = 4;
  
  // Lấy cấu hình đã lưu hoặc dùng mặc định
  const config = duanConfig[filename] || {
    color: defaultColor,
    weight: defaultWeight,
    visible: true
  };
  
  // Cập nhật lại config nếu chưa có
  if (!duanConfig[filename]) {
    duanConfig[filename] = config;
    saveDuanConfig();
  }
  
  const fileItem = document.createElement('div');
  fileItem.className = 'duan-file-item';
  fileItem.innerHTML = `
    <div class="duan-file-header">
      <label class="duan-file-checkbox">
        <input type="checkbox" data-filename="${filename}" ${config.visible ? 'checked' : ''}>
        <span class="duan-file-name">${displayName}</span>
      </label>
    </div>
    <div class="duan-file-controls">
      <div class="duan-control-group">
        <label class="duan-control-label">Màu:</label>
        <input type="color" class="duan-color-picker" data-filename="${filename}" value="${config.color}">
      </div>
      <div class="duan-control-group">
        <label class="duan-control-label">Độ dày:</label>
        <input type="range" class="duan-weight-slider" data-filename="${filename}" 
               min="1" max="10" step="0.5" value="${config.weight}">
        <span class="duan-weight-value">${config.weight}</span>
      </div>
    </div>
  `;
  
  return fileItem;
}

// Hàm tải và hiển thị các file DuAn
async function loadDuanFiles(map) {
  // Tải danh sách file
  duanFiles = await loadDuanFilesList();
  
  // Tải cấu hình đã lưu
  loadDuanConfig();
  
  // Tạo UI cho từng file
  const container = document.getElementById('duan-files-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  duanFiles.forEach((filename, index) => {
    const fileItem = createDuanFileUI(filename, index);
    container.appendChild(fileItem);
    
    // Lấy cấu hình
    const config = duanConfig[filename] || {
      color: getDefaultColor(index),
      weight: 4,
      visible: true
    };
    
    // Tải và hiển thị file nếu visible
    if (config.visible) {
      addDuanFileToMap(map, filename, config.color, config.weight);
    }
  });
  
  // Thiết lập event listeners
  setupDuanFileControls(map);
}

// Hàm thiết lập các control cho file DuAn
function setupDuanFileControls(map) {
  // Xử lý checkbox ẩn/hiện
  document.querySelectorAll('input[type="checkbox"][data-filename]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const filename = this.getAttribute('data-filename');
      const config = duanConfig[filename] || {};
      config.visible = this.checked;
      duanConfig[filename] = config;
      saveDuanConfig();
      
      if (this.checked) {
        // Hiển thị layer nếu chưa có
        if (!duanLayers[filename]) {
          const color = config.color || getDefaultColor(duanFiles.indexOf(filename));
          const weight = config.weight || 4;
          addDuanFileToMap(map, filename, color, weight);
        } else {
          map.addLayer(duanLayers[filename]);
        }
      } else {
        // Ẩn layer
        if (duanLayers[filename]) {
          map.removeLayer(duanLayers[filename]);
        }
      }
    });
  });
  
  // Xử lý color picker
  document.querySelectorAll('.duan-color-picker').forEach(picker => {
    picker.addEventListener('change', function() {
      const filename = this.getAttribute('data-filename');
      const color = this.value;
      const config = duanConfig[filename] || {};
      config.color = color;
      duanConfig[filename] = config;
      saveDuanConfig();
      
      updateDuanLayerStyle(filename, color, config.weight || 4);
    });
  });
  
  // Xử lý weight slider
  document.querySelectorAll('.duan-weight-slider').forEach(slider => {
    slider.addEventListener('input', function() {
      const filename = this.getAttribute('data-filename');
      const weight = parseFloat(this.value);
      const config = duanConfig[filename] || {};
      config.weight = weight;
      duanConfig[filename] = config;
      saveDuanConfig();
      
      // Cập nhật hiển thị giá trị
      const valueSpan = this.parentElement.querySelector('.duan-weight-value');
      if (valueSpan) {
        valueSpan.textContent = weight;
      }
      
      updateDuanLayerStyle(filename, config.color || getDefaultColor(duanFiles.indexOf(filename)), weight);
    });
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
          openInfoPanel(feature.properties, false);
        }
      })
      .catch(() => {
        alert('Lỗi khi tải dữ liệu xã/phường!');
      });
  };
}

// ====== Thiết lập các control trong hộp công cụ ======
function setupToolsPanelControls(map) {
  // Thiết lập layer control (OSM/Vệ tinh)
  const layerRadios = document.querySelectorAll('input[name="base-layer"]');
  layerRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'osm') {
        map.removeLayer(map._baseLayers.satellite);
        map.addLayer(map._baseLayers.osm);
      } else if (this.value === 'satellite') {
        map.removeLayer(map._baseLayers.osm);
        map.addLayer(map._baseLayers.satellite);
      }
    });
  });
  
  // Thiết lập nút ẩn/hiện overlay
  const toggleOverlayBtn = document.getElementById('toggle-overlay-btn-custom');
  if (toggleOverlayBtn) {
    // Cập nhật trạng thái ban đầu
    const icon = toggleOverlayBtn.querySelector('.toggle-icon');
    const text = toggleOverlayBtn.querySelector('.toggle-text');
    
    // Icon hiển thị (mắt mở)
    const visibleIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>`;
    
    // Icon ẩn (mắt đóng với gạch chéo)
    const hiddenIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>`;
    
    if (geojsonVisible) {
      icon.innerHTML = visibleIcon;
      text.textContent = 'Hiển thị ranh giới';
      toggleOverlayBtn.classList.add('active');
    } else {
      icon.innerHTML = hiddenIcon;
      text.textContent = 'Ẩn ranh giới';
      toggleOverlayBtn.classList.remove('active');
    }
    
    toggleOverlayBtn.onclick = function() {
      geojsonVisible = !geojsonVisible;
      geojsonLayers.forEach(layer => {
        // Chỉ thay đổi fillOpacity (phần tô màu), giữ nguyên đường viền
        if (geojsonVisible) {
          // Hiển thị: khôi phục fillOpacity về giá trị hiện tại
          layer.setStyle({ fillOpacity: currentOverlayOpacity });
        } else {
          // Ẩn: đặt fillOpacity = 0 (trong suốt), nhưng vẫn giữ đường viền
          layer.setStyle({ fillOpacity: 0 });
        }
      });
      if (geojsonVisible) {
        icon.innerHTML = visibleIcon;
        text.textContent = 'Hiển thị ranh giới';
        toggleOverlayBtn.classList.add('active');
      } else {
        icon.innerHTML = hiddenIcon;
        text.textContent = 'Ẩn ranh giới';
        toggleOverlayBtn.classList.remove('active');
      }
    };
  }
  
  // Thiết lập opacity slider
  const opacitySlider = document.getElementById('opacity-slider-custom');
  const opacityValueText = document.getElementById('opacity-value-text');
  if (opacitySlider && opacityValueText) {
    opacitySlider.addEventListener('input', function() {
      const val = parseFloat(this.value);
      opacityValueText.textContent = val.toFixed(2);
      currentOverlayOpacity = val;
      geojsonLayers.forEach(layer => {
        layer.setStyle({ fillOpacity: currentOverlayOpacity });
      });
    });
  }
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
// Hàm cập nhật lại polygon và labels khi di chuyển marker
function updateAreaPolygonAndLabels(map) {
  // Xóa polygon và labels cũ
  if (areaPolygon) {
    map.removeLayer(areaPolygon);
    areaPolygon = null;
  }
  areaSegmentLabels.forEach(label => map.removeLayer(label));
  areaSegmentLabels = [];
  
  // Vẽ lại polygon và labels
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
  
  // Cập nhật hiển thị thông tin
  updateAreaDisplay();
}

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
      
      // Ẩn hộp công cụ khi bắt đầu sử dụng
      toggleToolsPanel(false);
      
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
        
        // Tạo marker có thể kéo được với icon tròn
        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'draggable-area-marker',
            html: '<div class="draggable-marker-circle" style="width: 20px; height: 20px; border-radius: 50%; background-color: #ff9800; border: 4px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);
        
        // Lưu index của marker trong mảng
        const pointIndex = areaPoints.length - 1;
        
        // Thêm số thứ tự vào marker
        marker.bindTooltip(areaPoints.length.toString(), {
          permanent: true,
          direction: 'center',
          className: 'area-point-tooltip',
          offset: [0, 0]
        });
        
        // Xử lý khi marker được di chuyển
        marker.on('dragend', function(e) {
          const newLat = e.target.getLatLng().lat;
          const newLng = e.target.getLatLng().lng;
          
          // Cập nhật vị trí điểm trong mảng
          areaPoints[pointIndex] = { lat: newLat, lng: newLng };
          
          // Cập nhật lại polygon và labels
          updateAreaPolygonAndLabels(map);
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
      
      // Hiện lại hộp công cụ khi dừng
      toggleToolsPanel(true);
      
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
      
      // Hiện lại hộp công cụ khi xóa
      toggleToolsPanel(true);
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      if (areaClickHandler) {
        map.off('click', areaClickHandler);
        areaClickHandler = null;
      }
    };
  }
}

// Hàm cập nhật lại polyline và labels khi di chuyển marker
function updateMeasurePolylineAndLabels(map) {
  // Xóa polyline và labels cũ
  if (measurePolyline) {
    map.removeLayer(measurePolyline);
    measurePolyline = null;
  }
  measureSegmentLabels.forEach(label => map.removeLayer(label));
  measureSegmentLabels = [];
  
  // Vẽ lại polyline và labels
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
  
  // Cập nhật hiển thị thông tin
  updateMeasureDisplay();
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
      
      // Ẩn hộp công cụ khi bắt đầu sử dụng
      toggleToolsPanel(false);
      
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
        
        // Tạo marker với kích thước lớn hơn, có thể kéo được với icon tròn
        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'draggable-measure-marker',
            html: '<div class="draggable-marker-circle" style="width: 20px; height: 20px; border-radius: 50%; background-color: #4caf50; border: 4px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);
        
        // Lưu index của marker trong mảng
        const pointIndex = measurePoints.length - 1;
        
        // Thêm số thứ tự vào marker với style rõ ràng hơn
        marker.bindTooltip(measurePoints.length.toString(), {
          permanent: true,
          direction: 'center',
          className: 'measure-point-tooltip',
          offset: [0, 0]
        });
        
        // Xử lý khi marker được di chuyển
        marker.on('dragend', function(e) {
          const newLat = e.target.getLatLng().lat;
          const newLng = e.target.getLatLng().lng;
          
          // Cập nhật vị trí điểm trong mảng
          measurePoints[pointIndex] = { lat: newLat, lng: newLng };
          
          // Cập nhật lại polyline và labels
          updateMeasurePolylineAndLabels(map);
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
      
      // Hiện lại hộp công cụ khi dừng
      toggleToolsPanel(true);
      
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
      
      // Hiện lại hộp công cụ khi xóa
      toggleToolsPanel(true);
      
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
  setupInfoCard(); // Thiết lập thẻ thông tin
  setupToolsPanel(); // Thiết lập hộp công cụ
  setupLocateButton(map);
  loadAllGeojsons(map);
  // Tải các dự án sau một khoảng thời gian ngắn để đảm bảo chúng nằm phía trên các layer khác
  setTimeout(() => {
    loadProjects(map); // Tải các dự án với màu sắc khác nhau
    // Tải các file DuAn (nằm trên cùng)
    loadDuanFiles(map);
    // Thiết lập các control trong hộp công cụ sau khi load xong
    setupToolsPanelControls(map);
  }, 500);
  setupMeasureButton(map);
  setupAreaButton(map);
  
  // Mở hộp công cụ khi khởi động (tùy chọn)
  setTimeout(() => {
    toggleToolsPanel(true);
  }, 300);
})(); 