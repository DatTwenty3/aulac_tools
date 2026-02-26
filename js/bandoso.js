// ====== CẤU HÌNH CHUNG ======
const fieldMap = {
  // Định dạng cũ
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
  sdt_ct: 'SĐT Chủ tịch',
  // Định dạng mới (từ file có hậu tố " (phường xã) - 34")
  ma_xa: 'Mã xã/phường',
  ten_xa: 'Tên xã/phường',
  dtich_km2: 'Diện tích (km²)',
  matdo_km2: 'Mật độ (người/km²)',
  ma_tinh: 'Mã tỉnh',
  ten_tinh: 'Tên tỉnh',
  tru_so: 'Trụ sở'
};

let cachedGeojsonFiles = [];
// Thêm biến lưu các layer geojson để quản lý bật/tắt
let geojsonLayers = [];
let geojsonVisible = true;
let currentOverlayOpacity = 0.4;
let selectedGeojsonLayer = null; // Layer phường/xã đang được chọn

// Biến cho quản lý các file DuAn
let duanLayers = {}; // Lưu các layer theo tên file
let duanFiles = []; // Danh sách các file trong folder DuAn
let duanConfig = {}; // Cấu hình màu và độ dày nét cho từng file
let selectedDuanFeatureLayer = null; // Layer đang được chọn
let selectedDuanFeatureStyle = null; // Style gốc của layer đang được chọn
let duanFeaturesCache = {}; // Cache các feature từ DuAn theo "ten" để tìm kiếm: {ten: [{feature, filename, displayName}, ...]}
let searchResultMarkers = []; // Lưu tất cả các marker kết quả tìm kiếm

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

// Biến cho marker kết quả tìm kiếm
let searchResultMarker = null;
let searchResultMarkerTimeout = null; // Timeout để tự động xóa marker

// Biến cho tính năng đo diện tích
let isMeasuringArea = false;
let areaPoints = [];
let areaMarkers = [];
let areaPolygon = null;
let areaClickHandler = null;
let areaSegmentLabels = []; // Lưu các label hiển thị độ dài từng cạnh

// Biến cho tính năng xác định tọa độ
let isCopyingCoordinate = false;
let copyCoordinateClickHandler = null;
let selectedCoordinateSystem = 'WGS84'; // 'WGS84' hoặc 'VN2000'
let selectedProvince = null;

// Biến cho tính năng chia sẻ tọa độ
let isSelectingPoints = false;
let selectedPoints = []; // Mảng lưu các điểm đã chọn: {id, lat, lng, name, marker}
let selectPointsClickHandler = null;
let pointIdCounter = 1;

// Biến cho tính năng vẽ chú thích
let isDrawing = false;
let currentDrawingTool = null; // 'freehand', 'line', 'polygon', 'circle', 'text', 'arrow'
let drawingColor = '#FF0000';
let drawingWeight = 3;
let drawingLayers = []; // Lưu tất cả các layer đã vẽ
let currentDrawingLayer = null; // Layer đang vẽ
let drawingClickHandler = null;
let drawingMouseMoveHandler = null;
let tempDrawingPoints = []; // Điểm tạm cho vẽ tự do
let drawingStartPoint = null; // Điểm bắt đầu cho shapes
let drawingHistory = []; // Lưu lịch sử để undo
let drawingHistoryIndex = -1; // Index hiện tại trong history
let drawingIdCounter = 1; // Counter để tạo ID duy nhất cho mỗi drawing

// Biến lưu trữ các timeout IDs để cleanup (tránh memory leaks)
let selectedGeojsonLayerTimeout = null; // Timeout khôi phục style của geojson layer
let duanLayerBringToFrontTimeout = null; // Timeout bringToFront cho duan layers
let popupOpenTimeouts = []; // Mảng lưu các timeout mở popup
let notificationTimeouts = []; // Mảng lưu các timeout cho notifications
let tempMarkerTimeout = null; // Timeout xóa marker tạm
let inputFocusTimeout = null; // Timeout focus input
let markerAnimationTimeout = null; // Timeout animation marker
let initializationTimeout = null; // Timeout khởi tạo app
let popupCloseTimeout = null; // Timeout đóng popup

// Biến lưu trữ event listeners để cleanup
let documentClickHandler = null; // Handler cho document click (ẩn suggestions)

// Dữ liệu kinh tuyến trục của các tỉnh (định dạng thập phân)
const provinceCentralMeridians = {
  'An Giang': 104.75,
  'Bắc Ninh': 107.00,
  'Cà Mau': 104.50,
  'Cao Bằng': 105.75,
  'Đắk Lắk': 108.50,
  'Điện Biên': 103.00,
  'Đồng Nai': 107.75,
  'Đồng Tháp': 105.00,
  'Gia Lai': 108.25,
  'Hà Tĩnh': 105.50,
  'Hưng Yên': 105.50,
  'Khánh Hòa': 108.25,
  'Lai Châu': 104.75,
  'Lạng Sơn': 107.25,
  'Lào Cai': 104.75,
  'Lâm Đồng': 107.75,
  'Nghệ An': 104.75,
  'Ninh Bình': 105.00,
  'Phú Thọ': 104.75,
  'Quảng Ngãi': 108.00,
  'Quảng Ninh': 107.75,
  'Quảng Trị': 106.00,
  'Sơn La': 104.00,
  'Tây Ninh': 105.75,
  'Thái Nguyên': 106.50,
  'Thanh Hóa': 105.00,
  'Thành phố Cần Thơ': 105.00,
  'Thành phố Đà Nẵng': 107.75,
  'Thành phố Hà Nội': 105.00,
  'Thành phố Hải Phòng': 105.75,
  'Thành phố Hồ Chí Minh': 105.75,
  'Thành phố Huế': 107.00,
  'Tuyên Quang': 106.00,
  'Vĩnh Long': 105.50
};

// Hàm chuyển đổi tọa độ từ WGS84 sang VN2000
async function convertWGS84toVN2000(lat, lng, centralMeridian) {
  try {
    const url = `https://vn2000.vn/api/wgs84tovn2000?lat=${lat}&lng=${lng}&zone_width=3&central_meridian=${centralMeridian}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success && result.data) {
      return {
        x: result.data.x,
        y: result.data.y
      };
    } else {
      throw new Error(result.message || 'Lỗi chuyển đổi tọa độ');
    }
  } catch (error) {
    console.error('Lỗi khi chuyển đổi tọa độ:', error);
    throw error;
  }
}

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

// Hàm mở popup với timeout cleanup tự động (tránh memory leak)
function openPopupWithDelay(marker, delay = 500) {
  const timeoutId = setTimeout(() => {
    if (marker && marker.openPopup) {
      marker.openPopup();
      const popup = marker.getPopup();
      if (popup && popup.getElement()) {
        popup.getElement().style.zIndex = '1000';
      }
    }
    // Xóa timeout ID khỏi mảng sau khi thực thi
    const index = popupOpenTimeouts.indexOf(timeoutId);
    if (index > -1) {
      popupOpenTimeouts.splice(index, 1);
    }
  }, delay);
  
  // Lưu timeout ID để có thể cleanup sau
  popupOpenTimeouts.push(timeoutId);
  return timeoutId;
}

// Hàm cleanup tất cả popup timeouts
function clearAllPopupTimeouts() {
  popupOpenTimeouts.forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  popupOpenTimeouts = [];
}

// Hàm cleanup tất cả timeouts để tránh memory leaks
function cleanupAllTimeouts() {
  // Clear selected geojson layer timeout
  if (selectedGeojsonLayerTimeout) {
    clearTimeout(selectedGeojsonLayerTimeout);
    selectedGeojsonLayerTimeout = null;
  }
  
  // Clear popup timeouts
  clearAllPopupTimeouts();
  
  // Clear notification timeouts
  notificationTimeouts.forEach(timeoutId => {
    clearTimeout(timeoutId);
  });
  notificationTimeouts = [];
  
  // Clear temp marker timeout
  if (tempMarkerTimeout) {
    clearTimeout(tempMarkerTimeout);
    tempMarkerTimeout = null;
  }
  
  // Clear input focus timeout
  if (inputFocusTimeout) {
    clearTimeout(inputFocusTimeout);
    inputFocusTimeout = null;
  }
  
  // Clear marker animation timeout
  if (markerAnimationTimeout) {
    clearTimeout(markerAnimationTimeout);
    markerAnimationTimeout = null;
  }
  
  // Clear popup close timeout
  if (popupCloseTimeout) {
    clearTimeout(popupCloseTimeout);
    popupCloseTimeout = null;
  }
  
  // Clear search result marker timeout
  if (searchResultMarkerTimeout) {
    clearTimeout(searchResultMarkerTimeout);
    searchResultMarkerTimeout = null;
  }
}

// Hàm cleanup tất cả event listeners
function cleanupAllEventListeners(map) {
  // Remove document click handler
  if (documentClickHandler) {
    document.removeEventListener('click', documentClickHandler);
    documentClickHandler = null;
  }
  
  // Remove map click handlers
  if (measureClickHandler) {
    map.off('click', measureClickHandler);
    measureClickHandler = null;
  }
  
  if (areaClickHandler) {
    map.off('click', areaClickHandler);
    areaClickHandler = null;
  }
  
  if (copyCoordinateClickHandler) {
    map.off('click', copyCoordinateClickHandler);
    copyCoordinateClickHandler = null;
  }
  
  if (selectPointsClickHandler) {
    map.off('click', selectPointsClickHandler);
    selectPointsClickHandler = null;
  }
}

// Hàm cleanup toàn bộ để tránh memory leaks
function cleanupAll(map) {
  cleanupAllTimeouts();
  cleanupAllEventListeners(map);
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
    'ten_xa': 'Tên xã/phường',
    'ma_xa': 'Mã xã/phường',
    'ma_tinh': 'Mã tỉnh',
    'ten_tinh': 'Tên tỉnh',
    'dtich_km2': 'Diện tích (km²)',
    'matdo_km2': 'Mật độ (người/km²)',
    'tru_so': 'Trụ sở',
    'sap_nhap': 'Sáp nhập',
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
  
  // Hiển thị thông tin xã/phường
  let html = '<table class="info-panel-table">';
  const displayedKeys = new Set();
  
  // Hiển thị các trường trong fieldMap trước (có nhãn đẹp)
  for (const key in fieldMap) {
    if (properties[key] !== undefined && properties[key] !== null && properties[key] !== '') {
      html += `
        <tr>
          <td class="label">${fieldMap[key]}</td>
          <td class="value">${formatValue(properties[key], key)}</td>
        </tr>
      `;
      displayedKeys.add(key);
    }
  }
  
  // Hiển thị các trường còn lại không có trong fieldMap
  for (const key in properties) {
    if (!displayedKeys.has(key) && key !== 'style') {
      const value = properties[key];
      if (value !== undefined && value !== null && value !== '') {
        html += `
          <tr>
            <td class="label">${formatFieldName(key)}</td>
            <td class="value">${formatValue(value, key)}</td>
          </tr>
        `;
      }
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
  } else if (properties) {
    const featureName = getFeatureName(properties);
    if (featureName) {
      title = featureName;
    }
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
  
  if (infoToggleBtn && infoCard) {
    infoToggleBtn.onclick = function() {
      if (infoCard.classList.contains('hidden')) {
        toggleInfoCard(true);
      } else {
        toggleInfoCard(false);
      }
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

  // Tạo pane riêng cho tooltip với z-index cao nhất (chỉ thấp hơn popup)
  // TooltipPane mặc định của Leaflet có z-index 650, cần tăng lên để không bị che bởi bất kỳ layer nào
  if (map.getPane('tooltipPane')) {
    map.getPane('tooltipPane').style.zIndex = 950; // Cao hơn drawingPane (880), thấp hơn popupPane (1000)
  }
  
  // Đảm bảo popupPane có z-index cao nhất để popup luôn hiển thị trên cùng
  const popupPane = map.getPane('popupPane');
  if (popupPane) {
    popupPane.style.zIndex = 1000; // Cao nhất - luôn hiển thị trên tất cả layers
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
      locateBtnDom.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>Xác định vị trí</span>
      `;
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
    locateBtnDom.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Đang xác định vị trí...</span>
    `;
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
        
        // Tạo pane riêng cho location marker với z-index cao hơn duanPane (700)
        if (!map._locationPane) {
          map._locationPane = map.createPane('locationPane');
          map._locationPane.style.zIndex = 850; // Cao hơn duanPane (700) nhưng thấp hơn searchResultPane (800) và popupPane (900)
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
          }),
          pane: 'locationPane',
          zIndexOffset: 1000
        }).addTo(map);
        
        // Cập nhật popup với thông tin real-time
        const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) + ' km/h' : 'Không xác định';
        const heading = pos.coords.heading ? pos.coords.heading.toFixed(0) + '°' : 'Không xác định';
        currentLocationMarker.bindPopup(
          `<div style="text-align: center; padding: 4px;">
            <strong style="color: #ef4444; font-size: 14px; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Vị trí của bạn
            </strong><br>
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
        locateBtnDom.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
          </svg>
          <span>Dừng theo dõi</span>
        `;
      },
      function(err) {
        if (err.code !== 1) {
          alert('Không thể xác định vị trí: ' + err.message);
        }
        locateBtnDom.disabled = false;
        locateBtnDom.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Xác định vị trí</span>
        `;
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

// Hàm kiểm tra xem hai feature có lân cận nhau không (có chung biên giới)
function areFeaturesAdjacent(feature1, feature2) {
  if (!feature1.geometry || !feature2.geometry) return false;
  
  try {
    const geom1 = feature1.geometry;
    const geom2 = feature2.geometry;
    
    // Lấy tất cả các điểm từ geometry
    const getCoordinates = (geom) => {
      if (geom.type === 'Point') return [geom.coordinates];
      if (geom.type === 'LineString') return geom.coordinates;
      if (geom.type === 'Polygon') return geom.coordinates.flat();
      if (geom.type === 'MultiLineString') return geom.coordinates.flat();
      if (geom.type === 'MultiPolygon') return geom.coordinates.flat(2);
      return [];
    };
    
    const coords1 = getCoordinates(geom1);
    const coords2 = getCoordinates(geom2);
    
    // Kiểm tra xem có điểm nào chung không (với độ chính xác ~0.0001 độ)
    const tolerance = 0.0001;
    for (const c1 of coords1) {
      for (const c2 of coords2) {
        const dist = Math.sqrt(
          Math.pow(c1[0] - c2[0], 2) + 
          Math.pow(c1[1] - c2[1], 2)
        );
        if (dist < tolerance) {
          return true;
        }
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Hàm tạo 124 màu khác nhau phân bố đều trên vòng tròn màu
// Sử dụng cả hue, saturation và lightness để tạo sự khác biệt rõ ràng
function generate124Colors() {
  const totalColors = 124;
  const colors = [];
  
  // Phân bố màu trên nhiều lớp để tăng sự khác biệt
  // Sử dụng 4 mức saturation và 4 mức lightness = 16 nhóm
  // Mỗi nhóm có khoảng 8 màu hue khác nhau
  const saturationLevels = [75, 80, 85, 90]; // 4 mức saturation
  const lightnessLevels = [65, 70, 75, 80]; // 4 mức lightness
  
  let colorIndex = 0;
  for (let s = 0; s < saturationLevels.length && colorIndex < totalColors; s++) {
    for (let l = 0; l < lightnessLevels.length && colorIndex < totalColors; l++) {
      // Mỗi nhóm có khoảng 8 màu hue, phân bố đều trên 360 độ
      const huesPerGroup = Math.ceil((totalColors - colorIndex) / ((saturationLevels.length - s) * (lightnessLevels.length - l)));
      const hueStep = 360 / huesPerGroup;
      
      for (let h = 0; h < huesPerGroup && colorIndex < totalColors; h++) {
        const hue = (h * hueStep) % 360;
        colors.push({
          hue: Math.round(hue),
          saturation: saturationLevels[s],
          lightness: lightnessLevels[l]
        });
        colorIndex++;
      }
    }
  }
  
  return colors;
}

// Mảng 124 màu được tạo sẵn
const colorPalette124 = generate124Colors();

// Hàm tạo màu cho feature đảm bảo không trùng với các feature lân cận
function assignColorToFeature(feature, allFeatures, assignedColors, index) {
  // Tạo màu cơ bản từ tên hoặc mã, sử dụng 124 màu có sẵn
  let baseColorIndex;
  const featureName = getFeatureName(feature.properties);
  if (featureName) {
    const name = featureName;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    baseColorIndex = Math.abs(hash % 124);
  } else {
    const featureCode = getFeatureCode(feature.properties);
    if (featureCode) {
      const ma = featureCode;
      let hash = 0;
      for (let i = 0; i < ma.length; i++) {
        hash = ma.charCodeAt(i) + ((hash << 5) - hash);
      }
      baseColorIndex = Math.abs(hash % 124);
    } else {
      baseColorIndex = index % 124;
    }
  }
  
  // Tìm các feature lân cận
  const adjacentFeatures = [];
  for (let i = 0; i < allFeatures.length; i++) {
    if (i !== index && areFeaturesAdjacent(feature, allFeatures[i])) {
      adjacentFeatures.push(i);
    }
  }
  
  // Tìm màu không trùng với các feature lân cận
  // Kiểm tra cả hue, saturation và lightness để đảm bảo khác biệt rõ ràng
  let colorIndex = baseColorIndex;
  let attempts = 0;
  const minHueDiff = 25; // Chênh lệch tối thiểu về hue (độ) - tăng lên để màu khác biệt hơn
  
  while (attempts < 124) {
    let conflict = false;
    const currentColor = colorPalette124[colorIndex];
    
    for (const adjIndex of adjacentFeatures) {
      if (assignedColors[adjIndex] !== null) {
        const adjColor = assignedColors[adjIndex];
        
        // Kiểm tra chênh lệch hue
        const hueDiff = Math.min(
          Math.abs(currentColor.hue - adjColor.hue),
          360 - Math.abs(currentColor.hue - adjColor.hue)
        );
        
        // Kiểm tra chênh lệch saturation và lightness
        const satDiff = Math.abs(currentColor.saturation - adjColor.saturation);
        const lightDiff = Math.abs(currentColor.lightness - adjColor.lightness);
        
        // Màu được coi là quá gần nếu:
        // - Hue quá gần (< 25 độ) VÀ (saturation hoặc lightness quá gần)
        // - Hoặc cả 3 đều quá gần
        if (hueDiff < minHueDiff && (satDiff < 10 || lightDiff < 5)) {
          conflict = true;
          break;
        }
        // Nếu hue quá gần (< 15 độ) thì cũng coi là conflict
        if (hueDiff < 15) {
          conflict = true;
          break;
        }
      }
    }
    
    if (!conflict) {
      return currentColor;
    }
    
    // Thử màu tiếp theo trong 124 màu, nhảy cách xa hơn
    colorIndex = (colorIndex + 10) % 124;
    attempts++;
  }
  
  // Nếu không tìm được màu phù hợp, dùng màu cơ bản
  return colorPalette124[baseColorIndex];
}

// ====== HELPER FUNCTION: LẤY TÊN VÀ MÃ TỪ PROPERTIES ======
// Hỗ trợ cả định dạng cũ (ten, ma) và mới (ten_xa, ma_xa)
function getFeatureName(properties) {
  if (!properties) return null;
  return properties.ten_xa || properties.ten || null;
}

function getFeatureCode(properties) {
  if (!properties) return null;
  return properties.ma_xa || properties.ma || null;
}

// ====== HIỂN THỊ GEOJSON LÊN BẢN ĐỒ ======
function addGeojsonToMap(map, data) {
  const isDhlvb = data && data.name === 'DHLVB';
  
  // Xử lý màu cho tất cả features trước để đảm bảo các feature lân cận không trùng màu
  const allFeatures = data.features || [];
  const assignedColors = new Array(allFeatures.length).fill(null);
  const featureColors = {};
  
  // Gán màu cho từng feature
  allFeatures.forEach((feature, index) => {
    const colorObj = assignColorToFeature(feature, allFeatures, assignedColors, index);
    assignedColors[index] = colorObj;
    
    // Lưu màu vào feature để sử dụng sau (sử dụng cả saturation và lightness)
    const featureId = feature.properties?.ten || feature.properties?.ma || `feature_${index}`;
    featureColors[featureId] = `hsl(${colorObj.hue}, ${colorObj.saturation}%, ${colorObj.lightness}%)`;
  });
  
  const layer = L.geoJSON(data, {
    style: function(feature) {
      // Lấy màu đã được gán
      const featureId = feature.properties?.ten || feature.properties?.ma || '';
      let fillColor = featureColors[featureId];
      
      // Fallback nếu không tìm thấy màu đã gán
      if (!fillColor) {
        let colorIndex = 0;
        const featureName = getFeatureName(feature.properties);
        const featureCode = getFeatureCode(feature.properties);
        if (featureName) {
          const name = featureName;
          let hash = 0;
          for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
          }
          colorIndex = Math.abs(hash % 124);
        } else if (featureCode) {
          const ma = featureCode;
          let hash = 0;
          for (let i = 0; i < ma.length; i++) {
            hash = ma.charCodeAt(i) + ((hash << 5) - hash);
          }
          colorIndex = Math.abs(hash % 124);
        }
        const colorObj = colorPalette124[colorIndex];
        fillColor = `hsl(${colorObj.hue}, ${colorObj.saturation}%, ${colorObj.lightness}%)`;
      }
      
      // Sử dụng màu từ GeoJSON nếu có, nếu không thì dùng màu đã gán
      const featureStyle = feature.properties.style || {};
      return {
        color: isDhlvb ? '#ff0000' : (featureStyle.color || '#3388ff'),
        weight: isDhlvb ? 4 : (featureStyle.weight || 2),
        fillColor: isDhlvb ? '#ff0000' : (featureStyle.fillColor || fillColor),
        fillOpacity: featureStyle.opacity || currentOverlayOpacity
      };
    },
    onEachFeature: function (feature, layer) {
      const featureStyle = feature.properties.style || {};
      const baseColor = isDhlvb ? '#ff0000' : (featureStyle.color || '#3388ff');
      const baseWeight = isDhlvb ? 4 : (featureStyle.weight || 2);
      
      // Lấy màu đã được gán (đảm bảo không trùng với các feature lân cận)
      const featureName = getFeatureName(feature.properties);
      const featureCode = getFeatureCode(feature.properties);
      const featureId = featureName || featureCode || '';
      let baseFillColor = featureColors[featureId];
      
      // Fallback nếu không tìm thấy màu đã gán
      if (!baseFillColor) {
        let colorIndex = 0;
        if (featureName) {
          const name = featureName;
          let hash = 0;
          for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
          }
          colorIndex = Math.abs(hash % 124);
        } else if (featureCode) {
          const ma = featureCode;
          let hash = 0;
          for (let i = 0; i < ma.length; i++) {
            hash = ma.charCodeAt(i) + ((hash << 5) - hash);
          }
          colorIndex = Math.abs(hash % 124);
        }
        if (colorIndex > 0 || featureName || featureCode) {
          const colorObj = colorPalette124[colorIndex];
          baseFillColor = `hsl(${colorObj.hue}, ${colorObj.saturation}%, ${colorObj.lightness}%)`;
        } else {
          baseFillColor = featureStyle.fillColor || '#3388ff';
        }
      }
      
      const originalStyle = {
        color: baseColor,
        weight: baseWeight,
        fillColor: baseFillColor,
        fillOpacity: featureStyle.opacity || currentOverlayOpacity
      };
      
      // Lưu style gốc vào layer
      layer._originalGeojsonStyle = originalStyle;
      
      // Tooltip tên xã/phường
      const tooltipName = getFeatureName(feature.properties);
      if (tooltipName) {
        layer.bindTooltip(tooltipName, {direction: 'top', sticky: true, offset: [0, -8], className: 'custom-tooltip'});
      }
      
      // Hiển thị panel chi tiết khi click
      layer.on('click', function() {
        // Không mở popup nếu đang ở chế độ đo khoảng cách
        if (isMeasuring) {
          return;
        }
        
        // Khôi phục style của layer trước đó nếu có
        if (selectedGeojsonLayer && selectedGeojsonLayer !== layer) {
          if (selectedGeojsonLayer._originalGeojsonStyle) {
            const prevStyle = selectedGeojsonLayer._originalGeojsonStyle;
            selectedGeojsonLayer.setStyle({
              color: prevStyle.color,
              weight: prevStyle.weight,
              fillColor: prevStyle.fillColor,
              fillOpacity: geojsonVisible ? prevStyle.fillOpacity : 0
            });
          }
        }
        
        // Highlight layer được chọn (chỉ thay đổi border, giữ nguyên fillColor)
        layer.setStyle({
          color: '#2ecc40',
          weight: 3,
          fillColor: originalStyle.fillColor, // Giữ nguyên màu fill
          fillOpacity: geojsonVisible ? originalStyle.fillOpacity : 0
        });
        
        selectedGeojsonLayer = layer;
        
        // Clear timeout cũ nếu có
        if (selectedGeojsonLayerTimeout) {
          clearTimeout(selectedGeojsonLayerTimeout);
        }
        
        // Tự động khôi phục sau 3 giây
        selectedGeojsonLayerTimeout = setTimeout(() => {
          if (layer._originalGeojsonStyle && selectedGeojsonLayer === layer) {
            const style = layer._originalGeojsonStyle;
            layer.setStyle({
              color: style.color,
              weight: style.weight,
              fillColor: style.fillColor,
              fillOpacity: geojsonVisible ? style.fillOpacity : 0
            });
            selectedGeojsonLayer = null;
          }
          selectedGeojsonLayerTimeout = null;
        }, 3000);
        
        openInfoPanel(feature.properties, isDhlvb);
      });
      
      // Đã loại bỏ hiệu ứng hover (mouseover/mouseout) để không tô đậm màu các xã khi rê chuột
      // layer.on('mouseover', function() {
      //   // Nếu đang ẩn ranh giới (geojsonVisible = false), không hiển thị màu khi hover
      //   if (geojsonVisible) {
      //     // Chỉ thay đổi border và opacity khi hover, giữ nguyên fillColor
      //     layer.setStyle({
      //       fillOpacity: 0.5,
      //       color: '#ff7800',
      //       fillColor: originalStyle.fillColor // Giữ nguyên màu fill
      //     });
      //   } else {
      //     // Chỉ thay đổi màu đường viền, không thay đổi fillOpacity và fillColor
      //     layer.setStyle({
      //       color: '#ff7800',
      //       fillColor: originalStyle.fillColor // Giữ nguyên màu fill
      //     });
      //   }
      // });
      
      // layer.on('mouseout', function() {
      //   // Không khôi phục nếu đang được chọn (highlight)
      //   if (selectedGeojsonLayer === layer) {
      //     return;
      //   }
      //   
      //   // Nếu đang ẩn ranh giới, giữ fillOpacity = 0
      //   if (geojsonVisible) {
      //     layer.setStyle({
      //       fillOpacity: originalStyle.fillOpacity,
      //       color: originalStyle.color,
      //       fillColor: originalStyle.fillColor // Giữ nguyên màu fill
      //     });
      //   } else {
      //     // Chỉ khôi phục màu đường viền và fillColor
      //     layer.setStyle({
      //       color: originalStyle.color,
      //       fillColor: originalStyle.fillColor // Giữ nguyên màu fill
      //     });
      //   }
      // });
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
  try {
    localStorage.setItem('duanConfig', JSON.stringify(duanConfig));
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình:', error);
    // Không hiển thị thông báo lỗi vì đây là operation background
    // Có thể do storage đầy hoặc bị block bởi browser settings
  }
}

// Hàm tạo màu mặc định cho file
function getDefaultColor(index) {
  const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
  return colors[index % colors.length];
}

// Hàm xóa cache của một file DuAn
function removeDuanFileFromCache(filename) {
  // Xóa tất cả các feature của file này khỏi cache
  Object.keys(duanFeaturesCache).forEach(key => {
    duanFeaturesCache[key] = duanFeaturesCache[key].filter(item => item.filename !== filename);
    // Xóa key nếu không còn feature nào
    if (duanFeaturesCache[key].length === 0) {
      delete duanFeaturesCache[key];
    }
  });
}

// Hàm tải lại cache của một file DuAn
function reloadDuanFileToCache(map, filename) {
  const filepath = 'geo-json/DuAn/' + encodeURIComponent(filename);
  const displayName = getDuanDisplayName(filename);
  
  fetch(filepath)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      // Cache các feature từ file đang được hiển thị
      if (data.features && Array.isArray(data.features)) {
        data.features.forEach(feature => {
          if (feature.properties && feature.properties.ten) {
            const ten = feature.properties.ten.toString().toLowerCase();
            if (!duanFeaturesCache[ten]) {
              duanFeaturesCache[ten] = [];
            }
            // Kiểm tra xem feature đã có trong cache chưa (tránh trùng lặp)
            const exists = duanFeaturesCache[ten].some(item => 
              item.filename === filename && 
              item.feature === feature
            );
            if (!exists) {
              duanFeaturesCache[ten].push({
                feature: feature,
                filename: filename,
                displayName: displayName
              });
            }
          }
        });
      }
    })
    .catch(err => {
      console.error('Lỗi tải lại cache file DuAn', filename, err);
    });
}

// Hàm thêm file DuAn lên bản đồ
function addDuanFileToMap(map, filename, color, weight = 4, dashArray = null) {
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
      // Chỉ cache các feature từ file đang được hiển thị
      // Kiểm tra xem file có đang visible không
      const config = duanConfig[filename] || {};
      if (config.visible !== false) {
        // Cache các feature theo "ten" để hỗ trợ tìm kiếm (lưu tất cả các feature cùng tên)
        if (data.features && Array.isArray(data.features)) {
          data.features.forEach(feature => {
            if (feature.properties && feature.properties.ten) {
              const ten = feature.properties.ten.toString().toLowerCase();
              // Lưu feature vào mảng nếu chưa có, hoặc thêm vào mảng nếu đã có
              if (!duanFeaturesCache[ten]) {
                duanFeaturesCache[ten] = [];
              }
              duanFeaturesCache[ten].push({
                feature: feature,
                filename: filename,
                displayName: displayName
              });
            }
          });
        }
      }
      
      // Scale dashArray dựa trên weight nếu có
      const scaledDashArray = dashArray ? scaleDashArray(dashArray, weight) : null;
      
      const layer = L.geoJSON(data, {
        style: function(feature) {
          return {
            color: color,
            weight: weight,
            fillColor: color,
            fillOpacity: 0.3,
            opacity: 1.0,
            dashArray: scaledDashArray
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
            
            // Lấy giá trị hiện tại từ config để đảm bảo luôn đúng với cài đặt mới nhất
            const currentConfig = duanConfig[filename] || {};
            const currentWeight = currentConfig.weight || weight;
            const currentColor = currentConfig.color || color;
            const currentDashArrayPattern = currentConfig.dashArray === '' || currentConfig.dashArray === null ? null : (currentConfig.dashArray || dashArray);
            const currentScaledDashArray = currentDashArrayPattern ? scaleDashArray(currentDashArrayPattern, currentWeight) : null;
            
            // Khôi phục style của layer trước đó nếu có
            if (selectedDuanFeatureLayer && selectedDuanFeatureLayer !== layer) {
              if (selectedDuanFeatureStyle) {
                selectedDuanFeatureLayer.setStyle(selectedDuanFeatureStyle);
              }
            }
            
            // Tính scaledDashArray cho weight + 2 (khi highlight)
            const highlightWeight = currentWeight + 2;
            const highlightDashArray = currentDashArrayPattern ? scaleDashArray(currentDashArrayPattern, highlightWeight) : null;
            
            // Lưu style gốc của layer hiện tại
            selectedDuanFeatureStyle = {
              color: currentColor,
              weight: currentWeight,
              fillOpacity: 0.3,
              dashArray: currentScaledDashArray
            };
            selectedDuanFeatureLayer = layer;
            
            // Highlight đường được chọn
            layer.setStyle({color: '#2ecc40', weight: highlightWeight, dashArray: highlightDashArray});
            
            // Hiển thị thông tin chi tiết từ properties
            openInfoPanel(feature.properties, false, true, displayName, true);
          });
          
          layer.on('mouseover', function() {
            // Lấy giá trị hiện tại từ config để đảm bảo luôn đúng với cài đặt mới nhất
            const currentConfig = duanConfig[filename] || {};
            const currentWeight = currentConfig.weight || weight;
            const currentColor = currentConfig.color || color;
            const currentDashArrayPattern = currentConfig.dashArray === '' || currentConfig.dashArray === null ? null : (currentConfig.dashArray || dashArray);
            const currentScaledDashArray = currentDashArrayPattern ? scaleDashArray(currentDashArrayPattern, currentWeight) : null;
            
            // Giữ nguyên weight và dashArray như cài đặt, chỉ thay đổi màu và opacity
            layer.setStyle({
              fillOpacity: 0.5, 
              color: '#ff7800', 
              weight: currentWeight,
              dashArray: currentScaledDashArray
            });
          });
          
          layer.on('mouseout', function() {
            // Lấy giá trị hiện tại từ config để đảm bảo luôn đúng với cài đặt mới nhất
            const currentConfig = duanConfig[filename] || {};
            const currentWeight = currentConfig.weight || weight;
            const currentColor = currentConfig.color || color;
            const currentDashArrayPattern = currentConfig.dashArray === '' || currentConfig.dashArray === null ? null : (currentConfig.dashArray || dashArray);
            const currentScaledDashArray = currentDashArrayPattern ? scaleDashArray(currentDashArrayPattern, currentWeight) : null;
            
            // Khôi phục style ban đầu (trừ khi đang được chọn)
            if (selectedDuanFeatureLayer !== layer) {
              layer.setStyle({
                fillOpacity: 0.3, 
                color: currentColor,
                weight: currentWeight,
                dashArray: currentScaledDashArray
              });
            } else {
              // Nếu đang được chọn, giữ style highlight nhưng với weight và dashArray đúng
              const highlightWeight = currentWeight + 2;
              const highlightDashArray = currentDashArrayPattern ? scaleDashArray(currentDashArrayPattern, highlightWeight) : null;
              layer.setStyle({
                color: '#2ecc40', 
                weight: highlightWeight,
                dashArray: highlightDashArray
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

// Hàm tính toán dashArray dựa trên weight để đảm bảo tỷ lệ phù hợp
// weight chuẩn là 4 (mặc định), dashArray sẽ được scale theo tỷ lệ weight/4
function scaleDashArray(dashArrayPattern, weight, baseWeight = 4) {
  if (!dashArrayPattern || dashArrayPattern === '') {
    return null;
  }
  
  // Tính tỷ lệ scale
  const scale = weight / baseWeight;
  
  // Chuyển đổi pattern thành mảng các số
  const parts = dashArrayPattern.split(',').map(part => parseFloat(part.trim()));
  
  // Scale từng phần
  const scaledParts = parts.map(part => Math.max(1, Math.round(part * scale)));
  
  // Chuyển lại thành chuỗi
  return scaledParts.join(', ');
}

// Hàm cập nhật style của layer
function updateDuanLayerStyle(filename, color, weight, dashArray = null) {
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
    
    // Scale dashArray dựa trên weight nếu có
    const scaledDashArray = dashArray ? scaleDashArray(dashArray, weight) : null;
    
    // Cập nhật style cho tất cả các feature trong layer
    duanLayers[filename].eachLayer(function(layer) {
      layer.setStyle({
        color: color,
        weight: weight,
        fillColor: color,
        fillOpacity: 0.3,
        dashArray: scaledDashArray
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
    dashArray: null,
    visible: true
  };
  
  // Cập nhật lại config nếu chưa có
  if (!duanConfig[filename]) {
    duanConfig[filename] = config;
    saveDuanConfig();
  }
  
  // Đảm bảo dashArray có giá trị mặc định nếu chưa có
  if (config.dashArray === undefined) {
    config.dashArray = null;
  }
  
  // Tạo options cho dropdown loại nét
  const dashArrayOptions = [
    { value: '', label: 'Nét liền' },
    { value: '5, 5', label: 'Nét gạch' },
    { value: '10, 5', label: 'Nét gạch dài' },
    { value: '2, 2', label: 'Nét chấm' },
    { value: '10, 5, 2, 5', label: 'Nét gạch-chấm' },
    { value: '5, 2, 2, 2', label: 'Nét gạch-chấm ngắn' }
  ];
  
  // Chuyển đổi dashArray thành giá trị cho select (null hoặc '' thành '')
  const dashArrayValue = config.dashArray === null || config.dashArray === '' ? '' : config.dashArray;
  
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
      <div class="duan-control-group">
        <label class="duan-control-label">Loại nét:</label>
        <select class="duan-dasharray-select" data-filename="${filename}">
          ${dashArrayOptions.map(opt => 
            `<option value="${opt.value}" ${dashArrayValue === opt.value ? 'selected' : ''}>${opt.label}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;
  
  return fileItem;
}

// Hàm tải và hiển thị các file DuAn
async function loadDuanFiles(map) {
  try {
    // Tải danh sách file
    duanFiles = await loadDuanFilesList();
    
    // Tải cấu hình đã lưu
    loadDuanConfig();
    
    // Tạo UI cho từng file
    const container = document.getElementById('duan-files-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Xóa cache cũ trước khi tải lại
    duanFeaturesCache = {};
    
    duanFiles.forEach((filename, index) => {
      const fileItem = createDuanFileUI(filename, index);
      container.appendChild(fileItem);
      
      // Lấy cấu hình
      const config = duanConfig[filename] || {
        color: getDefaultColor(index),
        weight: 4,
        visible: true
      };
      
      // Tải và hiển thị file nếu visible (chỉ cache các file visible)
      if (config.visible) {
        const dashArray = config.dashArray === '' ? null : config.dashArray;
        addDuanFileToMap(map, filename, config.color, config.weight, dashArray);
      }
    });
    
    // Thiết lập event listeners
    setupDuanFileControls(map);
  } catch (error) {
    console.error('Lỗi khi tải danh sách file DuAn:', error);
    // Hiển thị thông báo lỗi cho người dùng (không dùng alert để không làm gián đoạn)
    const container = document.getElementById('duan-files-container');
    if (container) {
      container.innerHTML = '<div style="color: #ef4444; padding: 10px; text-align: center;">Không thể tải danh sách dự án. Vui lòng thử lại sau.</div>';
    }
  }
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
          const dashArray = config.dashArray === '' ? null : config.dashArray;
          addDuanFileToMap(map, filename, color, weight, dashArray);
        } else {
          map.addLayer(duanLayers[filename]);
          // Thêm lại vào cache khi hiển thị
          reloadDuanFileToCache(map, filename);
        }
      } else {
        // Ẩn layer
        if (duanLayers[filename]) {
          map.removeLayer(duanLayers[filename]);
        }
        // Xóa khỏi cache khi ẩn
        removeDuanFileFromCache(filename);
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
      
      const dashArray = config.dashArray === '' ? null : config.dashArray;
      updateDuanLayerStyle(filename, color, config.weight || 4, dashArray);
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
      
      const dashArray = config.dashArray === '' ? null : config.dashArray;
      updateDuanLayerStyle(filename, config.color || getDefaultColor(duanFiles.indexOf(filename)), weight, dashArray);
    });
  });
  
  // Xử lý dashArray select
  document.querySelectorAll('.duan-dasharray-select').forEach(select => {
    select.addEventListener('change', function() {
      const filename = this.getAttribute('data-filename');
      const dashArrayValue = this.value;
      const config = duanConfig[filename] || {};
      // Lưu '' thay vì null để dễ xử lý trong JSON
      config.dashArray = dashArrayValue === '' ? null : dashArrayValue;
      duanConfig[filename] = config;
      saveDuanConfig();
      
      const dashArray = config.dashArray === '' || config.dashArray === null ? null : config.dashArray;
      updateDuanLayerStyle(filename, config.color || getDefaultColor(duanFiles.indexOf(filename)), config.weight || 4, dashArray);
    });
  });
}

// ====== XỬ LÝ TÌM KIẾM ======
function setupSearch(map) {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const suggestionsContainer = document.getElementById('search-suggestions');
  if (!searchBtn || !searchInput) return;
  
  let selectedSuggestionIndex = -1;
  let currentSuggestions = [];

  // Hàm tìm kiếm và trả về danh sách gợi ý
  function getSearchSuggestions(keyword) {
    if (!keyword || keyword.length < 1) {
      return [];
    }
    
    const normalizedKeyword = removeVietnameseTones(keyword.toLowerCase());
    const suggestions = [];
    
    // Tìm trong các file GeoJSON thông thường
    cachedGeojsonFiles.forEach(filename => {
      const name = removeVietnameseTones(filename.replace('.geojson', '').toLowerCase());
      if (name.includes(normalizedKeyword)) {
        suggestions.push({
          type: 'xaphuong',
          title: filename.replace('.geojson', ''),
          subtitle: 'Xã/Phường',
          value: filename.replace('.geojson', ''),
          isFile: true,
          filename: filename
        });
      }
    });
    
    // Tìm trong các feature của DuAn (chỉ hiển thị 1 lần cho mỗi tên, kèm số lượng)
    Object.keys(duanFeaturesCache).forEach(key => {
      const normalizedKey = removeVietnameseTones(key.toLowerCase());
      if (normalizedKey.includes(normalizedKeyword)) {
        const cachedDataArray = duanFeaturesCache[key];
        // Chỉ thêm 1 lần vào suggestions, không lặp lại
        if (cachedDataArray.length > 0) {
          const firstFeature = cachedDataArray[0].feature;
          const ten = firstFeature.properties && firstFeature.properties.ten ? firstFeature.properties.ten : '';
          const phanLoai = firstFeature.properties && firstFeature.properties.phanLoai ? firstFeature.properties.phanLoai : '';
          
          const title = cachedDataArray.length > 1 
            ? `${ten} (${cachedDataArray.length} kết quả)`
            : ten;
          
          suggestions.push({
            type: 'duan',
            title: title,
            subtitle: phanLoai || 'Đường',
            value: ten,
            isFile: false,
            feature: firstFeature,
            cachedData: cachedDataArray[0],
            totalCount: cachedDataArray.length,
            allFeatures: cachedDataArray.length > 1 ? cachedDataArray : null
          });
        }
      }
    });
    
    // Giới hạn số lượng gợi ý
    return suggestions.slice(0, 10);
  }
  
  // Hàm hiển thị gợi ý
  function showSuggestions(suggestions) {
    currentSuggestions = suggestions;
    selectedSuggestionIndex = -1;
    
    if (suggestions.length === 0) {
      suggestionsContainer.classList.remove('show');
      return;
    }
    
    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'search-suggestion-item';
      item.dataset.index = index;
      
      const icon = suggestion.type === 'xaphuong' 
        ? '<svg class="search-suggestion-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>'
        : '<svg class="search-suggestion-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
      
      item.innerHTML = `
        ${icon}
        <div class="search-suggestion-content">
          <div class="search-suggestion-title">${suggestion.title}</div>
          <div class="search-suggestion-subtitle">${suggestion.subtitle}</div>
        </div>
        <span class="search-suggestion-type">${suggestion.type === 'xaphuong' ? 'Xã/Phường' : 'Dự án'}</span>
      `;
      
      item.addEventListener('click', () => {
        selectSuggestion(suggestion);
      });
      
      item.addEventListener('mouseenter', () => {
        selectedSuggestionIndex = index;
        updateSuggestionHighlight();
      });
      
      suggestionsContainer.appendChild(item);
    });
    
    suggestionsContainer.classList.add('show');
  }
  
  // Hàm cập nhật highlight cho gợi ý
  function updateSuggestionHighlight() {
    const items = suggestionsContainer.querySelectorAll('.search-suggestion-item');
    items.forEach((item, index) => {
      if (index === selectedSuggestionIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  // Hàm chọn gợi ý
  function selectSuggestion(suggestion) {
    searchInput.value = suggestion.title;
    suggestionsContainer.classList.remove('show');
    performSearch(suggestion);
  }
  
  // Hàm kiểm tra và parse tọa độ
  function parseCoordinates(input) {
    const trimmed = input.trim();
    // Regex để tìm pattern: số, có thể có dấu phẩy hoặc khoảng trắng, số
    const coordPattern = /^(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)$/;
    const match = trimmed.match(coordPattern);
    
    if (!match) return null;
    
    const first = parseFloat(match[1]);
    const second = parseFloat(match[2]);
    
    // Kiểm tra phạm vi hợp lệ cho tọa độ Việt Nam
    // Latitude: khoảng 8-24 (Bắc)
    // Longitude: khoảng 102-110 (Đông)
    
    // Nếu số đầu tiên trong khoảng 102-110, đó là longitude (lng, lat)
    if (first >= 102 && first <= 110 && second >= 8 && second <= 24) {
      return { lat: second, lng: first };
    }
    // Nếu số đầu tiên trong khoảng 8-24, đó là latitude (lat, lng)
    else if (first >= 8 && first <= 24 && second >= 102 && second <= 110) {
      return { lat: first, lng: second };
    }
    // Nếu không rõ, thử cả hai cách (ưu tiên lat, lng)
    else if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
      // Nếu số đầu nhỏ hơn hoặc bằng 90, có thể là lat
      if (Math.abs(first) <= 90) {
        return { lat: first, lng: second };
      } else {
        return { lat: second, lng: first };
      }
    }
    
    return null;
  }

  // Hàm thực hiện tìm kiếm
  function performSearch(suggestion = null) {
    const inputValue = searchInput.value.trim();
    if (!inputValue) {
      alert('Vui lòng nhập từ khóa tìm kiếm hoặc tọa độ!');
      return;
    }
    
    // Kiểm tra xem input có phải là tọa độ không
    const coordinates = parseCoordinates(inputValue);
    if (coordinates) {
      const { lat, lng } = coordinates;
      
      // Xóa marker cũ nếu có
      if (searchResultMarker) {
        map.removeLayer(searchResultMarker);
        searchResultMarker = null;
      }
      
      // Tạo marker tại vị trí tọa độ
      const latlng = L.latLng(lat, lng);
      const coordText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      searchResultMarker = createSearchResultMarker(map, latlng, `Tọa độ: ${coordText}`);
      searchResultMarker.addTo(map);
      
      // Di chuyển bản đồ đến vị trí tọa độ
      map.flyTo(latlng, 15, {
        animate: true,
        duration: 1.0
      });
      
      // Mở popup sau khi di chuyển
      openPopupWithDelay(searchResultMarker, 500);
      
      // Tự động xóa marker sau 5 giây
      autoRemoveMarker(map, searchResultMarker, 5000);
      
      showSearchNotification(`Đã tìm thấy tọa độ: ${coordText}`, 'success');
      return;
    }
    
    const keyword = removeVietnameseTones(inputValue.toLowerCase());
    
    // Nếu có suggestion được chọn, sử dụng nó
    if (suggestion) {
      if (suggestion.isFile) {
        // Tìm file GeoJSON
        fetch('geo-json/' + encodeURIComponent(suggestion.filename))
          .then(res => res.json())
          .then(data => {
            let bounds = L.geoJSON(data).getBounds();
            let center = bounds.getCenter();
            
            if (searchResultMarker) {
              map.removeLayer(searchResultMarker);
              searchResultMarker = null;
            }
            
            searchResultMarker = createSearchResultMarker(map, center, suggestion.title);
            searchResultMarker.addTo(map);
            
            map.flyTo(center, 12, {
              animate: true,
              duration: 1.0
            });
            
            openPopupWithDelay(searchResultMarker, 500);
            
            // Tự động xóa marker sau 3 giây
            autoRemoveMarker(map, searchResultMarker, 3000);
            
            let feature = data.features && data.features[0];
            if (feature && feature.properties) {
              openInfoPanel(feature.properties, false);
            }
            
            showSearchNotification('Đã tìm thấy: ' + suggestion.title, 'success');
          })
          .catch((error) => {
            console.error('Lỗi khi tải dữ liệu GeoJSON:', error);
            showSearchNotification('Không thể tải dữ liệu địa điểm. Vui lòng thử lại.', 'error');
          });
        return;
      } else {
        // Tìm feature DuAn
        const cachedData = suggestion.cachedData;
        const feature = suggestion.feature;
        
        // Nếu có nhiều feature cùng tên, hiển thị tất cả
        if (suggestion.allFeatures && suggestion.allFeatures.length > 1) {
          const ten = feature.properties && feature.properties.ten 
            ? feature.properties.ten.toString().toLowerCase() 
            : '';
          const foundFeatureKeys = [ten];
          showAllMatchingFeatures(map, foundFeatureKeys, ten);
          return;
        }
        
        if (!duanLayers[cachedData.filename]) {
          const config = duanConfig[cachedData.filename] || {
            color: getDefaultColor(duanFiles.indexOf(cachedData.filename)),
            weight: 4,
            dashArray: null,
            visible: true
          };
          if (config.visible) {
            const dashArray = config.dashArray === '' ? null : config.dashArray;
            addDuanFileToMap(map, cachedData.filename, config.color, config.weight, dashArray);
            setTimeout(() => {
              zoomToDuanFeature(map, feature, cachedData);
            }, 500);
            return;
          }
        }
        
        zoomToDuanFeature(map, feature, cachedData);
        return;
      }
    }
    
    // Nếu không có suggestion, tìm kiếm như bình thường
    const foundFile = cachedGeojsonFiles.find(f => {
      const name = removeVietnameseTones(f.replace('.geojson','').toLowerCase());
      return name.includes(keyword);
    });
    
    if (foundFile) {
      fetch('geo-json/' + encodeURIComponent(foundFile))
        .then(res => res.json())
        .then(data => {
          let bounds = L.geoJSON(data).getBounds();
          let center = bounds.getCenter();
          
          if (searchResultMarker) {
            map.removeLayer(searchResultMarker);
            searchResultMarker = null;
          }
          
          searchResultMarker = createSearchResultMarker(map, center, foundFile.replace('.geojson', ''));
          searchResultMarker.addTo(map);
          
          map.flyTo(center, 12, {
            animate: true,
            duration: 1.0
          });
          
          openPopupWithDelay(searchResultMarker, 500);
          
          // Tự động xóa marker sau 3 giây
          autoRemoveMarker(map, searchResultMarker, 3000);
          
          let feature = data.features && data.features[0];
          if (feature && feature.properties) {
            openInfoPanel(feature.properties, false);
          }
          
          showSearchNotification('Đã tìm thấy: ' + foundFile.replace('.geojson', ''), 'success');
        })
        .catch((error) => {
          console.error('Lỗi khi tải dữ liệu GeoJSON:', error);
          showSearchNotification('Không thể tải dữ liệu địa điểm. Vui lòng thử lại.', 'error');
        });
      return;
    }
    
    // Tìm tất cả các feature trùng tên
    const foundFeatureKeys = Object.keys(duanFeaturesCache).filter(key => {
      const normalizedKey = removeVietnameseTones(key);
      return normalizedKey.includes(keyword);
    });
    
    if (foundFeatureKeys.length > 0) {
      // Hiển thị tất cả các feature trùng tên
      showAllMatchingFeatures(map, foundFeatureKeys, keyword);
      return;
    }
    
    showSearchNotification('Không tìm thấy kết quả phù hợp!', 'error');
  }
  
  // Hàm hiển thị tất cả các feature trùng tên
  function showAllMatchingFeatures(map, foundFeatureKeys, keyword) {
    // Xóa tất cả các marker cũ
    clearAllSearchMarkers(map);
    
    const allFeatures = [];
    const allBounds = [];
    
    // Thu thập tất cả các feature trùng tên
    foundFeatureKeys.forEach(key => {
      const cachedDataArray = duanFeaturesCache[key];
      cachedDataArray.forEach(cachedData => {
        allFeatures.push({
          feature: cachedData.feature,
          cachedData: cachedData,
          ten: cachedData.feature.properties && cachedData.feature.properties.ten 
            ? cachedData.feature.properties.ten 
            : 'Đường'
        });
        
        // Đảm bảo file DuAn được hiển thị
        if (!duanLayers[cachedData.filename]) {
          const config = duanConfig[cachedData.filename] || {
            color: getDefaultColor(duanFiles.indexOf(cachedData.filename)),
            weight: 4,
            dashArray: null,
            visible: true
          };
          if (config.visible) {
            const dashArray = config.dashArray === '' ? null : config.dashArray;
            addDuanFileToMap(map, cachedData.filename, config.color, config.weight, dashArray);
          }
        }
      });
    });
    
    if (allFeatures.length === 0) {
      showSearchNotification('Không tìm thấy kết quả phù hợp!', 'error');
      return;
    }
    
    // Tạo marker cho mỗi feature và highlight
    const markers = [];
    const highlightedLayers = [];
    
    allFeatures.forEach((item, index) => {
      const feature = item.feature;
      const cachedData = item.cachedData;
      const markerPoint = getBestPointForMarker(feature);
      
      // Tạo marker
      const ten = item.ten;
      const phanLoai = feature.properties && feature.properties.phanLoai 
        ? feature.properties.phanLoai 
        : '';
      const displayText = `${ten}${phanLoai ? ' - ' + phanLoai : ''}${allFeatures.length > 1 ? ` (${index + 1}/${allFeatures.length})` : ''}`;
      
      const marker = createSearchResultMarker(map, markerPoint, displayText);
      marker.addTo(map);
      markers.push(marker);
      
      // Lưu bounds để zoom
      const tempLayer = L.geoJSON(feature);
      allBounds.push(tempLayer.getBounds());
    });
    
    // Lưu các marker để có thể xóa sau
    searchResultMarkers = markers;
    
    // Zoom để hiển thị tất cả các feature
    if (allBounds.length > 0) {
      const groupBounds = L.latLngBounds(allBounds);
      map.flyToBounds(groupBounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 1.0
      });
    }
    
    // Mở popup của marker đầu tiên sau khi zoom
    if (markers.length > 0) {
      openPopupWithDelay(markers[0], 600);
    }
    
    // Hiển thị thông báo
    const countText = allFeatures.length > 1 
      ? `Đã tìm thấy ${allFeatures.length} kết quả trùng tên: ${allFeatures[0].ten}`
      : `Đã tìm thấy: ${allFeatures[0].ten}`;
    showSearchNotification(countText, 'success');
    
    // Hiển thị panel danh sách kết quả nếu có nhiều hơn 1
    if (allFeatures.length > 1) {
      showSearchResultsPanel(allFeatures, markers, highlightedLayers);
    }
    
    // Tự động xóa tất cả markers sau 3 giây và khôi phục highlight
    autoRemoveAllMarkers(map, markers, 3000, highlightedLayers);
  }
  
  // Hàm xóa tất cả các marker kết quả tìm kiếm
  function clearAllSearchMarkers(map) {
    // Xóa timeout nếu có
    if (searchResultMarkerTimeout) {
      clearTimeout(searchResultMarkerTimeout);
      searchResultMarkerTimeout = null;
    }
    
    if (searchResultMarker) {
      map.removeLayer(searchResultMarker);
      searchResultMarker = null;
    }
    searchResultMarkers.forEach(marker => {
      if (marker && marker._map) {
        map.removeLayer(marker);
      }
    });
    searchResultMarkers = [];
  }
  
  // Hàm tự động xóa marker sau 3 giây và khôi phục highlight
  function autoRemoveMarker(map, marker, delay = 3000, highlightedLayer = null) {
    // Xóa timeout cũ nếu có
    if (searchResultMarkerTimeout) {
      clearTimeout(searchResultMarkerTimeout);
    }
    
    // Tạo timeout mới để xóa marker sau 3 giây và khôi phục style
    searchResultMarkerTimeout = setTimeout(() => {
      // Khôi phục style của layer đã highlight nếu có
      if (highlightedLayer && highlightedLayer.layer && highlightedLayer.originalStyle) {
        highlightedLayer.layer.setStyle(highlightedLayer.originalStyle);
        // Reset selectedDuanFeatureLayer nếu đây là layer đang được chọn
        if (selectedDuanFeatureLayer === highlightedLayer.layer) {
          selectedDuanFeatureLayer = null;
          selectedDuanFeatureStyle = null;
        }
      }
      
      if (marker && marker._map) {
        // Đóng popup trước khi xóa marker
        if (marker.getPopup && marker.getPopup()) {
          marker.closePopup();
        }
        map.removeLayer(marker);
        if (marker === searchResultMarker) {
          searchResultMarker = null;
        }
      }
      searchResultMarkerTimeout = null;
    }, delay);
  }
  
  // Hàm tự động xóa tất cả markers sau 3 giây và khôi phục highlight
  function autoRemoveAllMarkers(map, markers, delay = 3000, highlightedLayers = []) {
    // Xóa timeout cũ nếu có
    if (searchResultMarkerTimeout) {
      clearTimeout(searchResultMarkerTimeout);
    }
    
    // Tạo timeout mới để xóa tất cả markers sau 3 giây và khôi phục style
    searchResultMarkerTimeout = setTimeout(() => {
      // Khôi phục style của các layer đã highlight
      highlightedLayers.forEach(({ layer, originalStyle }) => {
        if (layer && layer.setStyle && originalStyle) {
          // Đảm bảo khôi phục đầy đủ các thuộc tính
          layer.setStyle({
            color: originalStyle.color || '#3388ff',
            weight: originalStyle.weight || 4,
            fillOpacity: originalStyle.fillOpacity !== undefined ? originalStyle.fillOpacity : 0.3,
            opacity: originalStyle.opacity !== undefined ? originalStyle.opacity : 1.0
          });
        }
      });
      
      // Reset selectedDuanFeatureLayer nếu có
      if (selectedDuanFeatureLayer) {
        selectedDuanFeatureLayer = null;
        selectedDuanFeatureStyle = null;
      }
      
      // Xóa markers
      markers.forEach(marker => {
        if (marker && marker._map) {
          // Đóng popup trước khi xóa marker
          if (marker.getPopup && marker.getPopup()) {
            marker.closePopup();
          }
          map.removeLayer(marker);
        }
      });
      if (searchResultMarker) {
        map.removeLayer(searchResultMarker);
        searchResultMarker = null;
      }
      searchResultMarkers = [];
      searchResultMarkerTimeout = null;
    }, delay);
  }
  
  // Hàm hiển thị panel danh sách kết quả
  function showSearchResultsPanel(features, markers, highlightedLayers = []) {
    // Xóa panel cũ nếu có
    const oldPanel = document.getElementById('search-results-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    // Tạo panel mới
    const panel = document.createElement('div');
    panel.id = 'search-results-panel';
    panel.className = 'search-results-panel';
    panel.innerHTML = `
      <div class="search-results-panel-header">
        <h3>Tìm thấy ${features.length} kết quả</h3>
        <button class="search-results-close" onclick="document.getElementById('search-results-panel').remove()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="search-results-list">
        ${features.map((item, index) => {
          const phanLoai = item.feature.properties && item.feature.properties.phanLoai 
            ? item.feature.properties.phanLoai 
            : 'Đường';
          return `
            <div class="search-result-item" data-index="${index}">
              <div class="search-result-item-number">${index + 1}</div>
              <div class="search-result-item-content">
                <div class="search-result-item-title">${item.ten}</div>
                <div class="search-result-item-subtitle">${phanLoai}</div>
              </div>
              <button class="search-result-item-btn" data-index="${index}">Xem</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Xử lý click vào các item
    panel.querySelectorAll('.search-result-item, .search-result-item-btn').forEach(element => {
      element.addEventListener('click', function(e) {
        e.stopPropagation();
        const index = parseInt(this.dataset.index || this.closest('.search-result-item').dataset.index);
        if (index >= 0 && index < markers.length && index < features.length) {
          const item = features[index];
          const marker = markers[index];
          const feature = item.feature;
          const cachedData = item.cachedData;
          
          // Khôi phục style của layer trước đó nếu có
          if (selectedDuanFeatureLayer && selectedDuanFeatureLayer !== highlightedLayers[index]?.layer) {
            if (selectedDuanFeatureStyle) {
              selectedDuanFeatureLayer.setStyle(selectedDuanFeatureStyle);
            }
          }
          
          // Tìm layer tương ứng với feature này trong TẤT CẢ các file DuAn
          let foundLayer = findLayerInAllDuanFiles(feature);
          
          // Nếu không tìm thấy bằng cách so sánh feature, thử tìm bằng tên
          if (!foundLayer && feature.properties && feature.properties.ten) {
            const allLayersWithSameName = findAllLayersWithSameName(feature.properties.ten);
            // Lấy layer đầu tiên có cùng tên
            if (allLayersWithSameName.length > 0) {
              foundLayer = allLayersWithSameName[0];
            }
          }
          
          // Xóa marker cũ nếu có
          if (searchResultMarker) {
            map.removeLayer(searchResultMarker);
            searchResultMarker = null;
          }
          
          // Tạo marker mới tại vị trí feature với hiệu ứng chớp chớp
          const markerPoint = getBestPointForMarker(feature);
          const ten = feature.properties && feature.properties.ten ? feature.properties.ten : 'Đường';
          const phanLoai = feature.properties && feature.properties.phanLoai 
            ? feature.properties.phanLoai 
            : '';
          const displayText = `${ten}${phanLoai ? ' - ' + phanLoai : ''}`;
          
          searchResultMarker = createSearchResultMarker(map, markerPoint, displayText);
          searchResultMarker.addTo(map);
          
          // Đóng tất cả popup
          markers.forEach(m => m.closePopup());
          // Mở popup của marker mới
          openPopupWithDelay(searchResultMarker, 100);
          
          // Zoom đến marker đó với animation
          map.flyTo(markerPoint, Math.max(map.getZoom(), 13), { 
            animate: true,
            duration: 0.5
          });
          
          // Tự động xóa marker sau 3 giây
          if (searchResultMarkerTimeout) {
            clearTimeout(searchResultMarkerTimeout);
          }
          searchResultMarkerTimeout = setTimeout(() => {
            if (searchResultMarker && searchResultMarker._map) {
              if (searchResultMarker.getPopup && searchResultMarker.getPopup()) {
                searchResultMarker.closePopup();
              }
              map.removeLayer(searchResultMarker);
              searchResultMarker = null;
            }
            searchResultMarkerTimeout = null;
          }, 3000);
        }
      });
    });
  }

  // Xử lý khi người dùng gõ
  searchInput.addEventListener('input', function(e) {
    const keyword = e.target.value.trim();
    if (keyword.length >= 1) {
      const suggestions = getSearchSuggestions(keyword);
      showSuggestions(suggestions);
    } else {
      suggestionsContainer.classList.remove('show');
    }
  });
  
  // Xử lý khi người dùng nhấn phím
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentSuggestions.length > 0) {
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
        updateSuggestionHighlight();
        const items = suggestionsContainer.querySelectorAll('.search-suggestion-item');
        if (items[selectedSuggestionIndex]) {
          items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentSuggestions.length > 0) {
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        updateSuggestionHighlight();
        if (selectedSuggestionIndex >= 0) {
          const items = suggestionsContainer.querySelectorAll('.search-suggestion-item');
          if (items[selectedSuggestionIndex]) {
            items[selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && currentSuggestions[selectedSuggestionIndex]) {
        selectSuggestion(currentSuggestions[selectedSuggestionIndex]);
      } else {
        performSearch();
      }
    } else if (e.key === 'Escape') {
      suggestionsContainer.classList.remove('show');
      selectedSuggestionIndex = -1;
    }
  });
  
  // Ẩn gợi ý khi click ra ngoài
  // Xóa event listener cũ nếu có
  if (documentClickHandler) {
    document.removeEventListener('click', documentClickHandler);
  }
  documentClickHandler = function(e) {
    if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
      suggestionsContainer.classList.remove('show');
    }
  };
  document.addEventListener('click', documentClickHandler);

  searchBtn.onclick = function() {
    performSearch();
  };
}

// Hàm tạo marker kết quả tìm kiếm với icon đặc biệt
function createSearchResultMarker(map, latlng, title) {
  // Xóa marker cũ nếu có
  if (searchResultMarker) {
    if (searchResultMarker._map) {
      searchResultMarker._map.removeLayer(searchResultMarker);
    }
  }
  
  // Tạo pane riêng cho search results với z-index cao hơn DuAn (700)
  if (!map._searchResultPane) {
    map._searchResultPane = map.createPane('searchResultPane');
    map._searchResultPane.style.zIndex = 800; // Cao hơn duanPane (700)
  }
  
  // Đảm bảo popupPane có z-index cao nhất để popup luôn hiển thị trên cùng
  const popupPane = map.getPane('popupPane');
  if (popupPane) {
    popupPane.style.zIndex = 1000; // Cao nhất - luôn hiển thị trên tất cả layers
  }
  
  const marker = L.marker(latlng, {
    icon: L.divIcon({
      className: 'search-result-marker',
      html: `
        <div class="search-marker-container">
          <div class="search-marker-pulse"></div>
          <div class="search-marker-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ff4444"/>
              <circle cx="12" cy="9" r="3" fill="white"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -45]
    }),
    pane: 'searchResultPane',
    zIndexOffset: 1000
  });
  
  // Tạo popup với thông tin
  const popupContent = `
    <div class="search-result-popup">
      <div class="search-result-popup-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align: middle; margin-right: 8px;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ff4444"/>
        </svg>
        <strong>Đã tìm thấy</strong>
      </div>
      <div class="search-result-popup-content">${title}</div>
    </div>
  `;
  
  marker.bindPopup(popupContent, {
    className: 'search-result-popup-container',
    closeButton: true,
    autoClose: false,
    autoPan: true,
    offset: [0, -10]
  });
  
  return marker;
}

// Hàm lấy điểm tốt nhất trên geometry để đặt marker
function getBestPointForMarker(feature) {
  const geom = feature.geometry;
  
  if (geom.type === 'Point') {
    return L.latLng(geom.coordinates[1], geom.coordinates[0]);
  }
  
  if (geom.type === 'LineString') {
    const coords = geom.coordinates;
    const midIndex = Math.floor(coords.length / 2);
    return L.latLng(coords[midIndex][1], coords[midIndex][0]);
  }
  
  if (geom.type === 'MultiLineString') {
    // Lấy điểm giữa của line đầu tiên
    const firstLine = geom.coordinates[0];
    const midIndex = Math.floor(firstLine.length / 2);
    return L.latLng(firstLine[midIndex][1], firstLine[midIndex][0]);
  }
  
  if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
    // Lấy center của bounds
    const tempLayer = L.geoJSON(feature);
    return tempLayer.getBounds().getCenter();
  }
  
  // Fallback: lấy center của bounds
  const tempLayer = L.geoJSON(feature);
  return tempLayer.getBounds().getCenter();
}

// Hàm helper tìm layer trong tất cả các file DuAn đã load
function findLayerInAllDuanFiles(feature) {
  let foundLayer = null;
  // Duyệt qua tất cả các file DuAn đã load
  for (const filename in duanLayers) {
    const duanLayer = duanLayers[filename];
    if (duanLayer) {
      duanLayer.eachLayer(function(layer) {
        try {
          // So sánh feature bằng cách so sánh geometry và properties
          if (layer.feature === feature || 
              (layer.feature && feature && 
               JSON.stringify(layer.feature.geometry) === JSON.stringify(feature.geometry) &&
               layer.feature.properties && feature.properties &&
               layer.feature.properties.ten === feature.properties.ten)) {
            foundLayer = layer;
          }
        } catch (error) {
          // Bỏ qua lỗi stringify và tiếp tục so sánh các layer khác
          // Có thể xảy ra nếu geometry quá lớn hoặc có circular reference
          console.debug('Lỗi khi so sánh geometry:', error);
        }
      });
      if (foundLayer) break; // Tìm thấy rồi thì dừng
    }
  }
  return foundLayer;
}

// Hàm helper tìm tất cả các layers có cùng tên trong tất cả các file DuAn
function findAllLayersWithSameName(ten) {
  const foundLayers = [];
  // Duyệt qua tất cả các file DuAn đã load
  for (const filename in duanLayers) {
    const duanLayer = duanLayers[filename];
    if (duanLayer) {
      duanLayer.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties && 
            layer.feature.properties.ten === ten) {
          foundLayers.push(layer);
        }
      });
    }
  }
  return foundLayers;
}

// Hàm zoom đến feature DuAn và hiển thị thông tin
function zoomToDuanFeature(map, feature, cachedData) {
  if (!feature || !feature.geometry) {
    alert('Không tìm thấy dữ liệu địa lý!');
    return;
  }
  
  // Tạo layer tạm để lấy bounds
  const tempLayer = L.geoJSON(feature);
  const bounds = tempLayer.getBounds();
  
  // Lấy điểm tốt nhất để đặt marker (điểm giữa của đường thay vì center của bounds)
  const markerPoint = getBestPointForMarker(feature);
  
  // Xóa marker kết quả cũ nếu có
  if (searchResultMarker) {
    map.removeLayer(searchResultMarker);
    searchResultMarker = null;
  }
  
  // Tạo marker tại vị trí tìm thấy
  const ten = feature.properties && feature.properties.ten ? feature.properties.ten : 'Đường';
  const displayText = `${ten}${feature.properties && feature.properties.phanLoai ? ' - ' + feature.properties.phanLoai : ''}`;
  searchResultMarker = createSearchResultMarker(map, markerPoint, displayText);
  searchResultMarker.addTo(map);
  
  // Zoom đến feature với animation
  map.flyToBounds(bounds, {
    padding: [50, 50],
    maxZoom: 15,
    animate: true,
    duration: 1.0
  });
  
  
  // Mở popup sau khi zoom và đảm bảo nó ở trên cùng
  const popupTimeoutId = setTimeout(() => {
    if (searchResultMarker && searchResultMarker.openPopup) {
      searchResultMarker.openPopup();
      // Đảm bảo popup được hiển thị trên cùng
      const popup = searchResultMarker.getPopup();
      if (popup && popup.getElement()) {
        popup.getElement().style.zIndex = '1000';
        // Đảm bảo popup tip cũng có z-index cao
        const popupTip = popup.getElement().parentElement?.querySelector('.leaflet-popup-tip');
        if (popupTip) {
          popupTip.style.zIndex = '1000';
        }
      }
    }
    // Xóa khỏi mảng sau khi thực thi
    const index = popupOpenTimeouts.indexOf(popupTimeoutId);
    if (index > -1) {
      popupOpenTimeouts.splice(index, 1);
    }
  }, 600);
  popupOpenTimeouts.push(popupTimeoutId);
  
  // Tự động xóa marker sau 3 giây (không phụ thuộc vào highlight)
  // Clear timeout cũ nếu có
  if (tempMarkerTimeout) {
    clearTimeout(tempMarkerTimeout);
  }
  tempMarkerTimeout = setTimeout(() => {
    // Xóa marker
    if (searchResultMarker && searchResultMarker._map) {
      if (searchResultMarker.getPopup && searchResultMarker.getPopup()) {
        searchResultMarker.closePopup();
      }
      map.removeLayer(searchResultMarker);
      searchResultMarker = null;
    }
    tempMarkerTimeout = null;
  }, 3000);
  
  // Hiển thị thông tin
  if (feature.properties) {
    openInfoPanel(feature.properties, false, true, cachedData.displayName, true);
  }
  
  // Hiển thị thông báo thành công
  showSearchNotification(`Đã tìm thấy: ${displayText}`, 'success');
}

// Hàm hiển thị thông báo tìm kiếm
function showSearchNotification(message, type = 'success') {
  // Xóa thông báo cũ nếu có
  const oldNotification = document.getElementById('search-notification');
  if (oldNotification) {
    oldNotification.remove();
  }
  
  // Tạo thông báo mới
  const notification = document.createElement('div');
  notification.id = 'search-notification';
  notification.className = `search-notification search-notification-${type}`;
  notification.innerHTML = `
    <div class="search-notification-content">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align: middle; margin-right: 8px;">
        ${type === 'success' 
          ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>'
          : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>'
        }
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Hiển thị với animation
  const showTimeoutId = setTimeout(() => {
    notification.classList.add('show');
    // Xóa khỏi mảng sau khi thực thi
    const index = notificationTimeouts.indexOf(showTimeoutId);
    if (index > -1) {
      notificationTimeouts.splice(index, 1);
    }
  }, 10);
  notificationTimeouts.push(showTimeoutId);
  
  // Tự động ẩn sau 4 giây
  const hideTimeoutId = setTimeout(() => {
    notification.classList.remove('show');
    const removeTimeoutId = setTimeout(() => {
      notification.remove();
      // Xóa khỏi mảng sau khi thực thi
      const index = notificationTimeouts.indexOf(removeTimeoutId);
      if (index > -1) {
        notificationTimeouts.splice(index, 1);
      }
    }, 300);
    notificationTimeouts.push(removeTimeoutId);
    // Xóa khỏi mảng sau khi thực thi
    const index = notificationTimeouts.indexOf(hideTimeoutId);
    if (index > -1) {
      notificationTimeouts.splice(index, 1);
    }
  }, 4000);
  notificationTimeouts.push(hideTimeoutId);
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
    if (map.hasLayer(areaPolygon)) {
      map.removeLayer(areaPolygon);
    }
    areaPolygon = null;
  }
  // Xóa tất cả labels một cách an toàn
  areaSegmentLabels.forEach(label => {
    if (label && map.hasLayer(label)) {
      map.removeLayer(label);
    }
  });
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
  areaMarkers.forEach(marker => {
    if (marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
  areaMarkers = [];
  
  // Xóa tất cả label đoạn
  areaSegmentLabels.forEach(label => {
    if (label && map.hasLayer(label)) {
      map.removeLayer(label);
    }
  });
  areaSegmentLabels = [];
  
  // Xóa polygon
  if (areaPolygon) {
    if (map.hasLayer(areaPolygon)) {
      map.removeLayer(areaPolygon);
    }
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
    
    // Tắt chế độ xác định tọa độ nếu đang bật
    if (isCopyingCoordinate) {
      const copyBtn = document.getElementById('copy-coordinate-btn');
      if (copyBtn) copyBtn.click();
    }
    
    isMeasuringArea = !isMeasuringArea;
    
    if (isMeasuringArea) {
      // Bật chế độ đo diện tích
      areaBtn.classList.add('active');
      areaBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
        <span>Dừng đo</span>
      `;
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
          if (map.hasLayer(areaPolygon)) {
            map.removeLayer(areaPolygon);
          }
          areaPolygon = null;
        }
        // Xóa tất cả labels một cách an toàn
        areaSegmentLabels.forEach(label => {
          if (label && map.hasLayer(label)) {
            map.removeLayer(label);
          }
        });
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
      areaBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
        <span>Đo diện tích</span>
      `;
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
      areaBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
        <span>Đo diện tích</span>
      `;
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
    if (map.hasLayer(measurePolyline)) {
      map.removeLayer(measurePolyline);
    }
    measurePolyline = null;
  }
  // Xóa tất cả labels một cách an toàn
  measureSegmentLabels.forEach(label => {
    if (label && map.hasLayer(label)) {
      map.removeLayer(label);
    }
  });
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
  measureMarkers.forEach(marker => {
    if (marker && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
  measureMarkers = [];
  
  // Xóa tất cả label đoạn
  measureSegmentLabels.forEach(label => {
    if (label && map.hasLayer(label)) {
      map.removeLayer(label);
    }
  });
  measureSegmentLabels = [];
  
  // Xóa polyline
  if (measurePolyline) {
    if (map.hasLayer(measurePolyline)) {
      map.removeLayer(measurePolyline);
    }
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
    // Tắt chế độ đo diện tích nếu đang bật
    if (isMeasuringArea) {
      const areaBtn = document.getElementById('area-btn');
      if (areaBtn) areaBtn.click();
    }
    
    // Tắt chế độ xác định tọa độ nếu đang bật
    if (isCopyingCoordinate) {
      const copyBtn = document.getElementById('copy-coordinate-btn');
      if (copyBtn) copyBtn.click();
    }
    
    isMeasuring = !isMeasuring;
    
    if (isMeasuring) {
      // Bật chế độ đo
      measureBtn.classList.add('active');
      measureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <circle cx="5" cy="12" r="2"></circle>
          <circle cx="19" cy="12" r="2"></circle>
          <line x1="3" y1="6" x2="7" y2="6"></line>
          <line x1="3" y1="8" x2="7" y2="8"></line>
          <line x1="17" y1="6" x2="21" y2="6"></line>
          <line x1="17" y1="8" x2="21" y2="8"></line>
        </svg>
        <span>Dừng đo</span>
      `;
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
          if (map.hasLayer(measurePolyline)) {
            map.removeLayer(measurePolyline);
          }
          measurePolyline = null;
        }
        // Xóa tất cả labels một cách an toàn
        measureSegmentLabels.forEach(label => {
          if (label && map.hasLayer(label)) {
            map.removeLayer(label);
          }
        });
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
      measureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <circle cx="5" cy="12" r="2"></circle>
          <circle cx="19" cy="12" r="2"></circle>
          <line x1="3" y1="6" x2="7" y2="6"></line>
          <line x1="3" y1="8" x2="7" y2="8"></line>
          <line x1="17" y1="6" x2="21" y2="6"></line>
          <line x1="17" y1="8" x2="21" y2="8"></line>
        </svg>
        <span>Đo khoảng cách</span>
      `;
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
      measureBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <circle cx="5" cy="12" r="2"></circle>
          <circle cx="19" cy="12" r="2"></circle>
          <line x1="3" y1="6" x2="7" y2="6"></line>
          <line x1="3" y1="8" x2="7" y2="8"></line>
          <line x1="17" y1="6" x2="21" y2="6"></line>
          <line x1="17" y1="8" x2="21" y2="8"></line>
        </svg>
        <span>Đo khoảng cách</span>
      `;
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

// ====== XỬ LÝ XÁC ĐỊNH TỌA ĐỘ ======
function setupCopyCoordinateButton(map) {
  const copyBtn = document.getElementById('copy-coordinate-btn');
  const coordinateSystemSelect = document.getElementById('coordinate-system-select');
  const provinceSelector = document.getElementById('province-selector');
  const provinceSelect = document.getElementById('province-select');
  
  if (!copyBtn) return;
  
  // Xử lý thay đổi hệ tọa độ
  if (coordinateSystemSelect) {
    coordinateSystemSelect.addEventListener('change', function() {
      selectedCoordinateSystem = this.value;
      
      // Hiện/ẩn dropdown chọn tỉnh khi chọn VN2000 với animation mượt
      if (provinceSelector) {
        if (selectedCoordinateSystem === 'VN2000') {
          provinceSelector.style.display = 'block';
          // Trigger reflow để animation hoạt động
          provinceSelector.offsetHeight;
        } else {
          provinceSelector.style.display = 'none';
        }
      }
    });
  }
  
  // Xử lý thay đổi tỉnh
  if (provinceSelect) {
    provinceSelect.addEventListener('change', function() {
      selectedProvince = this.value;
    });
  }
  
  copyBtn.onclick = function() {
    // Tắt chế độ đo khoảng cách nếu đang bật
    if (isMeasuring) {
      const measureBtn = document.getElementById('measure-btn');
      if (measureBtn) measureBtn.click();
    }
    
    // Tắt chế độ đo diện tích nếu đang bật
    if (isMeasuringArea) {
      const areaBtn = document.getElementById('area-btn');
      if (areaBtn) areaBtn.click();
    }
    
    isCopyingCoordinate = !isCopyingCoordinate;
    
    if (isCopyingCoordinate) {
      // Bật chế độ xác định tọa độ
      copyBtn.classList.add('active');
      copyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="12" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="12" y2="12"></line>
          <line x1="12" y1="12" x2="16" y2="12"></line>
          <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
        </svg>
        <span>Dừng xác định</span>
      `;
      
      // Ẩn hộp công cụ khi bắt đầu sử dụng
      toggleToolsPanel(false);
      
      // Tắt tương tác với GeoJSON layers để tránh nhấn nhầm
      toggleGeojsonInteractivity(false);
      
      // Thay đổi cursor
      map.getContainer().style.cursor = 'crosshair';
      
      // Thêm sự kiện click
      copyCoordinateClickHandler = async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        let coordinateText = '';
        let displayText = '';
        
        try {
          if (selectedCoordinateSystem === 'WGS84') {
            // Format tọa độ WGS84: "lat, lng"
            coordinateText = `${lat}, ${lng}`;
            displayText = `<strong>Đã xác định tọa độ!</strong><br>WGS84: ${coordinateText}`;
          } else if (selectedCoordinateSystem === 'VN2000') {
            // Kiểm tra xem đã chọn tỉnh chưa
            if (!selectedProvince) {
              alert('Vui lòng chọn tỉnh/thành phố để sử dụng hệ tọa độ VN2000!');
              return;
            }
            
            // Lấy kinh tuyến trục của tỉnh đã chọn
            const centralMeridian = provinceCentralMeridians[selectedProvince];
            
            if (!centralMeridian) {
              alert('Không tìm thấy kinh tuyến trục cho tỉnh đã chọn!');
              return;
            }
            
            // Hiển thị thông báo đang chuyển đổi
            const loadingPopup = L.popup({
              closeButton: false,
              autoClose: false,
              className: 'coordinate-copy-notification'
            })
            .setLatLng([lat, lng])
            .setContent('<div style="text-align: center; padding: 8px;"><strong>Đang chuyển đổi...</strong></div>')
            .openOn(map);
            
            // Chuyển đổi tọa độ sang VN2000
            const vn2000Coords = await convertWGS84toVN2000(lat, lng, centralMeridian);
            
            // Đóng popup loading
            map.closePopup(loadingPopup);
            
            // Format tọa độ VN2000: "x, y"
            coordinateText = `${vn2000Coords.x}, ${vn2000Coords.y}`;
            displayText = `<strong>Đã xác định tọa độ!</strong><br>VN2000: ${coordinateText}<br><small>(${selectedProvince})</small>`;
          }
          
          // Copy vào clipboard
          await navigator.clipboard.writeText(coordinateText);
          
          // Hiển thị thông báo thành công
          const notification = L.popup({
            closeButton: false,
            autoClose: 3000,
            className: 'coordinate-copy-notification'
          })
          .setLatLng([lat, lng])
          .setContent(`<div style="text-align: center; padding: 8px;">${displayText}</div>`)
          .openOn(map);
          
          // Tạo marker tạm thời để đánh dấu điểm đã chọn
          const tempMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'coordinate-copy-marker',
              html: '<div style="width: 16px; height: 16px; border-radius: 50%; background-color: #2196F3; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(map);
          
          // Xóa marker sau 3 giây
          // Clear timeout cũ nếu có
          if (tempMarkerTimeout) {
            clearTimeout(tempMarkerTimeout);
          }
          tempMarkerTimeout = setTimeout(function() {
            if (tempMarker && map.hasLayer(tempMarker)) {
              map.removeLayer(tempMarker);
            }
            tempMarkerTimeout = null;
          }, 3000);
          
        } catch (err) {
          console.error('Lỗi khi xác định tọa độ:', err);
          alert('Không thể xác định tọa độ. Vui lòng thử lại.\n\nLỗi: ' + err.message);
        }
      };
      
      map.on('click', copyCoordinateClickHandler);
    } else {
      // Tắt chế độ xác định tọa độ
      copyBtn.classList.remove('active');
      copyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
        </svg>
        <span>Xác định tọa độ</span>
      `;
      map.getContainer().style.cursor = '';
      
      // Hiện lại hộp công cụ khi dừng
      toggleToolsPanel(true);
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      // Xóa sự kiện click
      if (copyCoordinateClickHandler) {
        map.off('click', copyCoordinateClickHandler);
        copyCoordinateClickHandler = null;
      }
    }
  };
}

// ====== XỬ LÝ CHIA SẺ TỌA ĐỘ ======

// Hỏi tên điểm từ người dùng
function promptForPointName(pointNumber) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 90%;
        animation: slideUp 0.3s ease;
      ">
        <h3 style="
          margin: 0 0 16px 0;
          font-size: 1.2rem;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          Đặt tên điểm
        </h3>
        <input 
          type="text" 
          id="new-point-name-input" 
          value="Điểm ${pointNumber}"
          placeholder="Nhập tên điểm..."
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            margin-bottom: 16px;
            box-sizing: border-box;
            transition: all 0.2s ease;
          "
          onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
          onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';"
        />
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button 
            id="cancel-new-point-btn"
            style="
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              background: #f3f4f6;
              color: #6b7280;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='#e5e7eb'"
            onmouseout="this.style.background='#f3f4f6'"
          >
            Hủy
          </button>
          <button 
            id="save-new-point-btn"
            style="
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
              color: white;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
          >
            Tạo điểm
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('new-point-name-input');
    const saveBtn = document.getElementById('save-new-point-btn');
    const cancelBtn = document.getElementById('cancel-new-point-btn');
    
    // Focus vào input và select text
    // Clear timeout cũ nếu có
    if (inputFocusTimeout) {
      clearTimeout(inputFocusTimeout);
    }
    inputFocusTimeout = setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
      inputFocusTimeout = null;
    }, 100);
    
    // Xử lý lưu tên
    const saveName = () => {
      const newName = input.value.trim();
      document.body.removeChild(modal);
      resolve(newName || `Điểm ${pointNumber}`);
    };
    
    // Xử lý hủy
    const cancel = () => {
      document.body.removeChild(modal);
      resolve(null);
    };
    
    // Event listeners
    saveBtn.onclick = saveName;
    cancelBtn.onclick = cancel;
    
    // Enter để lưu, Escape để hủy
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveName();
      } else if (e.key === 'Escape') {
        cancel();
      }
    };
    
    // Click outside để hủy
    modal.onclick = (e) => {
      if (e.target === modal) {
        cancel();
      }
    };
  });
}

// Cập nhật danh sách điểm đã chọn
function updatePointsList() {
  const pointsCountText = document.getElementById('points-count-text');
  const pointsList = document.getElementById('points-list');
  const selectedPointsInfo = document.getElementById('selected-points-info');
  const exportKmlBtn = document.getElementById('export-kml-btn');
  const exportKmzBtn = document.getElementById('export-kmz-btn');
  const clearPointsBtn = document.getElementById('clear-points-btn');
  
  if (!pointsCountText || !pointsList) return;
  
  // Cập nhật số lượng điểm
  pointsCountText.textContent = `Đã chọn: ${selectedPoints.length} điểm`;
  
  // Hiển thị/ẩn thông tin và các nút
  if (selectedPoints.length > 0) {
    selectedPointsInfo.style.display = 'block';
    exportKmlBtn.style.display = 'block';
    exportKmzBtn.style.display = 'block';
    clearPointsBtn.style.display = 'block';
  } else {
    selectedPointsInfo.style.display = 'none';
    exportKmlBtn.style.display = 'none';
    exportKmzBtn.style.display = 'none';
    clearPointsBtn.style.display = 'none';
  }
  
  // Xóa danh sách cũ
  pointsList.innerHTML = '';
  
  // Thêm các điểm vào danh sách
  selectedPoints.forEach((point, index) => {
    const pointItem = document.createElement('div');
    pointItem.className = 'point-item';
    pointItem.innerHTML = `
      <div class="point-item-content" onclick="editPointName(${index})" style="cursor: pointer;" title="Click để đổi tên">
        <div class="point-item-name">${point.name}</div>
        <div class="point-item-coords">${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</div>
      </div>
      <div class="point-item-actions">
        <button class="point-item-btn" onclick="editPointName(${index})" title="Đổi tên điểm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="point-item-btn" onclick="flyToPoint(${index})" title="Bay đến điểm này">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 16 16 12 12 8"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
        <button class="point-item-btn delete" onclick="removePoint(${index})" title="Xóa điểm này">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
    pointsList.appendChild(pointItem);
  });
}

// Đổi tên điểm
window.editPointName = function editPointName(index) {
  if (index >= 0 && index < selectedPoints.length) {
    const point = selectedPoints[index];
    const currentName = point.name;
    
    // Tạo modal để nhập tên mới
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 90%;
        animation: slideUp 0.3s ease;
      ">
        <h3 style="
          margin: 0 0 16px 0;
          font-size: 1.2rem;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Đổi tên điểm
        </h3>
        <input 
          type="text" 
          id="point-name-input" 
          value="${currentName.replace(/"/g, '&quot;')}"
          placeholder="Nhập tên điểm..."
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            margin-bottom: 16px;
            box-sizing: border-box;
            transition: all 0.2s ease;
          "
          onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
          onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';"
        />
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button 
            id="cancel-btn"
            style="
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              background: #f3f4f6;
              color: #6b7280;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='#e5e7eb'"
            onmouseout="this.style.background='#f3f4f6'"
          >
            Hủy
          </button>
          <button 
            id="save-btn"
            style="
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
              color: white;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
          >
            Lưu
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('point-name-input');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    // Focus vào input và select text
    // Clear timeout cũ nếu có
    if (inputFocusTimeout) {
      clearTimeout(inputFocusTimeout);
    }
    inputFocusTimeout = setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
      inputFocusTimeout = null;
    }, 100);
    
    // Xử lý lưu tên
    const saveName = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        point.name = newName;
        
        // Cập nhật popup của marker
        if (point.marker && window.mapInstance) {
          point.marker.setPopupContent(`
            <div style="text-align: center; padding: 10px; min-width: 180px;">
              <strong style="font-size: 1.1em; color: #8b5cf6;">${newName}</strong><br>
              <small style="color: #6b7280; font-family: 'Courier New', monospace;">${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</small>
              <div style="margin-top: 8px; display: flex; gap: 6px; justify-content: center;">
                <button 
                  onclick="editPointName(${index})" 
                  style="
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color: white;
                    font-size: 0.8em;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                  "
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'"
                  title="Đổi tên điểm"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Đổi tên
                </button>
              </div>
            </div>
          `);
        }
        
        // Cập nhật danh sách
        updatePointsList();
      }
      document.body.removeChild(modal);
    };
    
    // Xử lý hủy
    const cancelEdit = () => {
      document.body.removeChild(modal);
    };
    
    // Event listeners
    saveBtn.onclick = saveName;
    cancelBtn.onclick = cancelEdit;
    
    // Enter để lưu, Escape để hủy
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        saveName();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    };
    
    // Click outside để hủy
    modal.onclick = (e) => {
      if (e.target === modal) {
        cancelEdit();
      }
    };
  }
}

// Bay đến điểm
window.flyToPoint = function flyToPoint(index) {
  if (index >= 0 && index < selectedPoints.length && window.mapInstance) {
    const point = selectedPoints[index];
    window.mapInstance.flyTo([point.lat, point.lng], 16, {
      duration: 1.5
    });
    
    // Làm nổi bật marker
    if (point.marker) {
      const markerElement = point.marker.getElement();
      if (markerElement) {
        markerElement.style.transform = 'scale(1.5)';
        // Clear timeout cũ nếu có
        if (markerAnimationTimeout) {
          clearTimeout(markerAnimationTimeout);
        }
        markerAnimationTimeout = setTimeout(() => {
          if (markerElement) {
            markerElement.style.transform = 'scale(1)';
          }
          markerAnimationTimeout = null;
        }, 500);
      }
    }
  }
}

// Xóa một điểm
window.removePoint = function removePoint(index) {
  if (index >= 0 && index < selectedPoints.length && window.mapInstance) {
    const point = selectedPoints[index];
    
    // Xóa marker khỏi bản đồ
    if (point.marker) {
      window.mapInstance.removeLayer(point.marker);
    }
    
    // Xóa khỏi mảng
    selectedPoints.splice(index, 1);
    
    // Cập nhật số thứ tự trên các marker còn lại
    selectedPoints.forEach((p, i) => {
      if (p.marker) {
        const markerElement = p.marker.getElement();
        if (markerElement) {
          markerElement.textContent = (i + 1).toString();
        }
      }
    });
    
    // Cập nhật danh sách
    updatePointsList();
  }
}

// Tạo nội dung file KML
function generateKML() {
  const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Các điểm đã chọn - Bản đồ AULAC</name>
    <description>Tọa độ được xuất từ Bản đồ số Vĩnh Long - AULAC</description>
    <Style id="pointStyle">
      <IconStyle>
        <color>ffB469FF</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/pink-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;

  let placemarks = '';
  selectedPoints.forEach(point => {
    // Escape XML special characters trong tên để tránh lỗi parse
    const escapedName = (point.name || 'Điểm')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    // Validate tọa độ
    const lat = typeof point.lat === 'number' ? point.lat : 0;
    const lng = typeof point.lng === 'number' ? point.lng : 0;
    
    placemarks += `
    <Placemark>
      <name>${escapedName}</name>
      <description>Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}</description>
      <styleUrl>#pointStyle</styleUrl>
      <Point>
        <coordinates>${lng.toFixed(6)},${lat.toFixed(6)},0</coordinates>
      </Point>
    </Placemark>
`;
  });

  const kmlFooter = `  </Document>
</kml>`;

  return kmlHeader + placemarks + kmlFooter;
}

// Xuất file KML
function exportKML() {
  if (selectedPoints.length === 0) {
    alert('Chưa có điểm nào được chọn!');
    return;
  }

  try {
    const kmlContent = generateKML();
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diem_da_chon_${new Date().getTime()}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Hiển thị thông báo thành công
    if (window.mapInstance) {
      const notification = L.popup({
        closeButton: false,
        autoClose: 3000,
        className: 'coordinate-copy-notification'
      })
      .setLatLng(window.mapInstance.getCenter())
      .setContent(`<div style="text-align: center; padding: 8px;"><strong>✓ Đã xuất file KML!</strong><br>${selectedPoints.length} điểm</div>`)
      .openOn(window.mapInstance);
    }
  } catch (error) {
    console.error('Lỗi khi xuất file KML:', error);
    alert('Không thể tạo file KML. Vui lòng thử lại.');
  }
}

// Xuất file KMZ (KML được nén)
async function exportKMZ() {
  if (selectedPoints.length === 0) {
    alert('Chưa có điểm nào được chọn!');
    return;
  }
  
  // Kiểm tra xem JSZip có sẵn không
  if (typeof JSZip === 'undefined') {
    alert('Đang tải thư viện nén... Vui lòng thử lại sau vài giây.');
    
    // Tải JSZip nếu chưa có
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = function() {
      setTimeout(exportKMZ, 500);
    };
    document.head.appendChild(script);
    return;
  }
  
  try {
    const kmlContent = generateKML();
    const zip = new JSZip();
    zip.file('doc.kml', kmlContent);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diem_da_chon_${new Date().getTime()}.kmz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Hiển thị thông báo thành công
    if (window.mapInstance) {
      const notification = L.popup({
        closeButton: false,
        autoClose: 3000,
        className: 'coordinate-copy-notification'
      })
      .setLatLng(window.mapInstance.getCenter())
      .setContent(`<div style="text-align: center; padding: 8px;"><strong>✓ Đã xuất file KMZ!</strong><br>${selectedPoints.length} điểm</div>`)
      .openOn(window.mapInstance);
    }
  } catch (err) {
    console.error('Lỗi khi tạo file KMZ:', err);
    alert('Không thể tạo file KMZ. Vui lòng thử xuất file KML.');
  }
}

// Xóa tất cả các điểm
function clearAllPoints() {
  if (selectedPoints.length === 0) return;
  
  if (!confirm(`Xóa tất cả ${selectedPoints.length} điểm đã chọn?`)) {
    return;
  }
  
  // Xóa tất cả marker khỏi bản đồ
  if (window.mapInstance) {
    selectedPoints.forEach(point => {
      if (point.marker) {
        window.mapInstance.removeLayer(point.marker);
      }
    });
  }
  
  // Xóa mảng
  selectedPoints = [];
  pointIdCounter = 1;
  
  // Cập nhật danh sách
  updatePointsList();
}

// Thiết lập nút chọn điểm
function setupSharePointsButton(map) {
  const selectPointsBtn = document.getElementById('select-points-btn');
  const exportKmlBtn = document.getElementById('export-kml-btn');
  const exportKmzBtn = document.getElementById('export-kmz-btn');
  const clearPointsBtn = document.getElementById('clear-points-btn');
  const pointNamingOption = document.getElementById('point-naming-option');
  
  if (!selectPointsBtn) return;
  
  // Xử lý nút chọn điểm
  selectPointsBtn.onclick = function() {
    if (!isSelectingPoints) {
      // Bật chế độ chọn điểm
      isSelectingPoints = true;
      selectPointsBtn.classList.add('active');
      selectPointsBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>Dừng chọn</span>
      `;
      map.getContainer().style.cursor = 'crosshair';
      
      // Hiển thị tùy chọn đặt tên
      if (pointNamingOption) {
        pointNamingOption.style.display = 'block';
      }
      
      // Ẩn hộp công cụ khi bắt đầu sử dụng
      toggleToolsPanel(false);
      
      // Tắt tương tác với GeoJSON layers để có thể click vào bản đồ
      toggleGeojsonInteractivity(false);
      
      // Xử lý click trên bản đồ
      selectPointsClickHandler = async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Tạo marker mới
        const pointNumber = pointIdCounter;
        const autoNameCheckbox = document.getElementById('auto-name-checkbox');
        const autoName = autoNameCheckbox ? autoNameCheckbox.checked : true;
        
        // Nếu không tự động đặt tên, hỏi người dùng
        let pointName = `Điểm ${pointNumber}`;
        if (!autoName) {
          pointName = await promptForPointName(pointNumber);
          if (pointName === null) {
            // Người dùng hủy, không tạo điểm
            return;
          }
        }
        
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'share-point-marker',
            html: `${pointNumber}`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }),
          draggable: true
        }).addTo(map);
        
        // Hàm tạo nội dung popup
        const createPopupContent = (name, lat, lng, pointIndex) => {
          return `
            <div style="text-align: center; padding: 10px; min-width: 180px;">
              <strong style="font-size: 1.1em; color: #8b5cf6;">${name}</strong><br>
              <small style="color: #6b7280; font-family: 'Courier New', monospace;">${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
              <div style="margin-top: 8px; display: flex; gap: 6px; justify-content: center;">
                <button 
                  onclick="editPointName(${pointIndex})" 
                  style="
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color: white;
                    font-size: 0.8em;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                  "
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'"
                  title="Đổi tên điểm"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Đổi tên
                </button>
              </div>
            </div>
          `;
        };
        
        // Thêm popup cho marker
        marker.bindPopup(createPopupContent(pointName, lat, lng, -1));
        
        // Xử lý kéo thả marker
        marker.on('dragend', function(e) {
          const newLat = e.target.getLatLng().lat;
          const newLng = e.target.getLatLng().lng;
          
          // Cập nhật tọa độ trong mảng
          const pointIndex = selectedPoints.findIndex(p => p.id === pointNumber);
          if (pointIndex !== -1) {
            selectedPoints[pointIndex].lat = newLat;
            selectedPoints[pointIndex].lng = newLng;
            const pointName = selectedPoints[pointIndex].name;
            updatePointsList();
            
            // Cập nhật popup
            marker.setPopupContent(createPopupContent(pointName, newLat, newLng, pointIndex));
          }
        });
        
        // Lưu điểm vào mảng
        selectedPoints.push({
          id: pointNumber,
          lat: lat,
          lng: lng,
          name: pointName,
          marker: marker
        });
        
        pointIdCounter++;
        
        // Cập nhật popup với index đúng
        const currentIndex = selectedPoints.length - 1;
        marker.setPopupContent(createPopupContent(pointName, lat, lng, currentIndex));
        
        // Cập nhật danh sách
        updatePointsList();
        
        // Hiển thị popup ngắn
        marker.openPopup();
        // Clear timeout cũ nếu có
        if (popupCloseTimeout) {
          clearTimeout(popupCloseTimeout);
        }
        popupCloseTimeout = setTimeout(() => {
          if (marker && marker.closePopup) {
            marker.closePopup();
          }
          popupCloseTimeout = null;
        }, 2000);
      };
      
      map.on('click', selectPointsClickHandler);
    } else {
      // Tắt chế độ chọn điểm
      isSelectingPoints = false;
      selectPointsBtn.classList.remove('active');
      selectPointsBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>Chọn điểm</span>
      `;
      map.getContainer().style.cursor = '';
      
      // Ẩn tùy chọn đặt tên
      if (pointNamingOption) {
        pointNamingOption.style.display = 'none';
      }
      
      // Hiện lại hộp công cụ khi dừng
      toggleToolsPanel(true);
      
      // Bật lại tương tác với GeoJSON layers
      toggleGeojsonInteractivity(true);
      
      // Xóa sự kiện click
      if (selectPointsClickHandler) {
        map.off('click', selectPointsClickHandler);
        selectPointsClickHandler = null;
      }
    }
  };
  
  // Xử lý nút xuất KML
  if (exportKmlBtn) {
    exportKmlBtn.onclick = exportKML;
  }
  
  // Xử lý nút xuất KMZ
  if (exportKmzBtn) {
    exportKmzBtn.onclick = exportKMZ;
  }
  
  // Xử lý nút xóa điểm
  if (clearPointsBtn) {
    clearPointsBtn.onclick = clearAllPoints;
  }
}

// ====== TÍNH NĂNG VẼ CHÚ THÍCH ======
// Hàm tính diện tích của polygon (m²)
function calculatePolygonArea(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  
  // Nếu là nested array (polygon với holes)
  const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
  
  // Công thức Shoelace (Gauss area formula) cho polygon trên mặt phẳng
  // Chuyển lat/lng sang meters
  const R = 6371000; // Bán kính trái đất (meters)
  let area = 0;
  
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = coords[i].lat * Math.PI / 180;
    const lat2 = coords[j].lat * Math.PI / 180;
    const lng1 = coords[i].lng * Math.PI / 180;
    const lng2 = coords[j].lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * R * R / 2);
  return area;
}

// Hàm tính chiều dài polyline (m)
function calculatePolylineLength(latlngs) {
  if (!latlngs || latlngs.length < 2) return 0;
  
  let length = 0;
  for (let i = 0; i < latlngs.length - 1; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[i + 1];
    
    // Haversine formula
    const R = 6371000; // meters
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    length += R * c;
  }
  
  return length;
}

// Hàm format diện tích/chiều dài
function formatMeasurement(value, type) {
  if (type === 'area') {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)} ha`;
    } else {
      return `${value.toFixed(2)} m²`;
    }
  } else { // length
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} km`;
    } else {
      return `${value.toFixed(2)} m`;
    }
  }
}

// Hàm thêm khả năng xóa và chỉnh sửa cho drawing layer
function makeDrawingDeletable(layer, map) {
  // Gán ID duy nhất cho layer nếu chưa có
  if (!layer._drawingId) {
    layer._drawingId = drawingIdCounter++;
  }
  
  // Đảm bảo layer có thể tương tác
  if (layer.setStyle) {
    layer.setStyle({ interactive: true });
  }
  
  // Khởi tạo giá trị mặc định
  if (!layer._drawingLabel) layer._drawingLabel = '';
  if (layer._drawingOpacity === undefined) layer._drawingOpacity = 0.2;
  
  const drawingTypeName = {
    'freehand': 'Vẽ tự do',
    'line': 'Đường gấp khúc',
    'arrow': 'Mũi tên',
    'polygon': 'Hình đa giác',
    'circle': 'Hình tròn',
    'text': 'Chú thích'
  };
  
  const typeName = drawingTypeName[layer._drawingType] || 'Ghi chú';
  
  // Tất cả các loại đều có thể chỉnh sửa
  const isEditable = true;
  
  // Các loại có fillOpacity (polygon, circle)
  const hasFillOpacity = layer._drawingType === 'polygon' || layer._drawingType === 'circle';
  
  // Loại text có thể chỉnh sửa nội dung
  const isText = layer._drawingType === 'text';
  
  // Hiển thị tên tùy chỉnh nếu có, nếu không hiển thị tên mặc định
  // Với text, hiển thị nội dung text làm tên
  let displayName;
  if (isText) {
    displayName = layer._drawingText || typeName;
  } else {
    displayName = layer._drawingLabel || typeName;
  }
  
  let popupContent = '';
  
  if (isEditable) {
    let formControls = '';
    let measurementInfo = '';
    
    // Tính toán và hiển thị thông tin đo đạc
    if (layer._drawingType === 'polygon') {
      // Tính diện tích cho polygon
      const latlngs = layer.getLatLngs()[0] || layer.getLatLngs();
      const area = calculatePolygonArea(latlngs);
      measurementInfo = `<div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-bottom: 12px; text-align: center;">
        <span style="font-size: 0.85em; color: #6b7280;">📐 Diện tích:</span>
        <strong style="color: #1f2937; font-size: 1em; margin-left: 6px;">${formatMeasurement(area, 'area')}</strong>
      </div>`;
    } else if (layer._drawingType === 'circle') {
      // Tính diện tích cho circle
      const radius = layer.getRadius();
      const area = Math.PI * radius * radius;
      measurementInfo = `<div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-bottom: 12px; text-align: center;">
        <span style="font-size: 0.85em; color: #6b7280;">📐 Diện tích:</span>
        <strong style="color: #1f2937; font-size: 1em; margin-left: 6px;">${formatMeasurement(area, 'area')}</strong>
        <br>
        <span style="font-size: 0.85em; color: #6b7280;">⭕ Bán kính:</span>
        <strong style="color: #1f2937; font-size: 1em; margin-left: 6px;">${formatMeasurement(radius, 'length')}</strong>
      </div>`;
    } else if (layer._drawingType === 'freehand' || layer._drawingType === 'line' || layer._drawingType === 'arrow') {
      // Tính chiều dài cho freehand, line và arrow
      const latlngs = layer.getLatLngs();
      const length = calculatePolylineLength(latlngs);
      measurementInfo = `<div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-bottom: 12px; text-align: center;">
        <span style="font-size: 0.85em; color: #6b7280;">📏 Chiều dài:</span>
        <strong style="color: #1f2937; font-size: 1em; margin-left: 6px;">${formatMeasurement(length, 'length')}</strong>
      </div>`;
    }
    
    // Input tên (cho tất cả các loại trừ text)
    if (!isText) {
      formControls += `
        <div id="name-input-${layer._drawingId}" style="margin-bottom: 12px; display: none;">
          <label style="display: block; font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">Tên:</label>
          <input 
            type="text" 
            id="drawing-label-${layer._drawingId}" 
            value="${layer._drawingLabel || ''}"
            placeholder="${typeName}"
            style="
              width: 100%;
              padding: 6px 10px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              font-size: 0.9em;
              box-sizing: border-box;
            "
          />
        </div>
      `;
    }
    
    // Text content input (chỉ cho text)
    if (isText) {
      formControls += `
        <div id="name-input-${layer._drawingId}" style="margin-bottom: 12px; display: none;">
          <label style="display: block; font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">Nội dung:</label>
          <input 
            type="text" 
            id="drawing-text-${layer._drawingId}" 
            value="${layer._drawingText || ''}"
            placeholder="Nhập nội dung..."
            style="
              width: 100%;
              padding: 6px 10px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              font-size: 0.9em;
              box-sizing: border-box;
            "
          />
        </div>
      `;
    }
    
    // Độ trong suốt (chỉ cho polygon và circle)
    if (hasFillOpacity) {
      const opacityPercent = Math.round((1 - (layer._drawingOpacity || 0.2)) * 100);
      formControls += `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">
            Độ trong suốt: <span id="opacity-value-${layer._drawingId}" style="font-weight: 600;">${opacityPercent}%</span>
          </label>
          <input 
            type="range" 
            id="drawing-opacity-${layer._drawingId}" 
            min="0" 
            max="100" 
            value="${opacityPercent}"
            style="width: 100%;"
            oninput="updateDrawingStyleRealtime(${layer._drawingId}, 'opacity', this.value)"
          />
        </div>
      `;
    }
    
    // Độ dày nét (cho tất cả loại trừ text)
    if (!isText) {
      formControls += `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">
            Độ dày nét: <span id="weight-value-${layer._drawingId}" style="font-weight: 600;">${layer._drawingWeight}px</span>
          </label>
          <input 
            type="range" 
            id="drawing-weight-${layer._drawingId}" 
            min="1" 
            max="10" 
            value="${layer._drawingWeight}"
            style="width: 100%;"
            oninput="updateDrawingStyleRealtime(${layer._drawingId}, 'weight', this.value)"
          />
        </div>
      `;
    }
    
    // Popup với form chỉnh sửa
    popupContent = `
      <div style="padding: 12px; min-width: 250px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <strong style="color: ${layer._drawingColor}; font-size: 15px;">${displayName}</strong>
          <a 
            href="javascript:void(0)" 
            onclick="toggleDrawingNameInput(${layer._drawingId})"
            style="font-size: 0.75em; color: #3b82f6; text-decoration: none; font-weight: 600;"
            title="${isText ? 'Sửa nội dung' : 'Đổi tên'}"
          >
            ✏️ ${isText ? 'Sửa' : 'Đổi tên'}
          </a>
        </div>
        
        ${measurementInfo}
        
        ${formControls}
        
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button 
            onclick="updateDrawingLayer(this)" 
            data-layer-id="${layer._drawingId}"
            style="
              flex: 1;
              padding: 8px 12px;
              border: none;
              border-radius: 6px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              font-size: 0.85em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
            title="Lưu"
          >
            💾 Lưu
          </button>
          <button 
            onclick="deleteDrawingLayer(this)" 
            data-layer-id="${layer._drawingId}"
            style="
              flex: 1;
              padding: 8px 12px;
              border: none;
              border-radius: 6px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              font-size: 0.85em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
            title="Xóa ghi chú này"
          >
            🗑️ Xóa
          </button>
        </div>
      </div>
    `;
  } else {
    // Popup đơn giản với nút xóa cho các loại khác
    popupContent = `
      <div style="text-align: center; padding: 8px; min-width: 150px;">
        <strong style="color: ${layer._drawingColor}; font-size: 14px;">${typeName}</strong>
        ${layer._drawingText ? `<br><small style="color: #6b7280;">"${layer._drawingText}"</small>` : ''}
        <div style="margin-top: 10px;">
          <button 
            onclick="deleteDrawingLayer(this)" 
            data-layer-id="${layer._drawingId}"
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              font-size: 0.85em;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
            title="Xóa ghi chú này"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Xóa
          </button>
        </div>
      </div>
    `;
  }
  
  // Bind popup
  layer.bindPopup(popupContent, { maxWidth: 300 });
  
  // Thêm click event
  layer.on('click', function(e) {
    L.DomEvent.stopPropagation(e);
    this.openPopup();
  });
  
  // Highlight khi hover (nếu không phải text marker)
  if (layer.setStyle) {
    layer.on('mouseover', function() {
      if (!isDrawing) {
        const currentStyle = {
          weight: (layer._drawingWeight || 3) + 2,
          color: '#FFD700',
          fillOpacity: 0.4
        };
        this.setStyle(currentStyle);
      }
    });
    
    layer.on('mouseout', function() {
      if (!isDrawing) {
        this.setStyle({
          weight: layer._drawingWeight || 3,
          color: layer._drawingColor || '#FF0000',
          fillOpacity: layer._drawingOpacity || 0.2
        });
      }
    });
  }
}

// Hàm toggle hiển thị input tên/text
window.toggleDrawingNameInput = function(layerId) {
  const nameInputDiv = document.getElementById(`name-input-${layerId}`);
  if (nameInputDiv) {
    const isHidden = nameInputDiv.style.display === 'none';
    nameInputDiv.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      // Focus vào input khi hiển thị (label hoặc text)
      const labelInput = document.getElementById(`drawing-label-${layerId}`);
      const textInput = document.getElementById(`drawing-text-${layerId}`);
      const input = labelInput || textInput;
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }
};

// Hàm cập nhật style realtime khi kéo slider
window.updateDrawingStyleRealtime = function(layerId, type, value) {
  const map = window.mapInstance;
  if (!map) return;
  
  const layer = drawingLayers.find(l => l._drawingId === layerId);
  if (!layer || !layer.setStyle) return;
  
  if (type === 'opacity') {
    // Đảo ngược: 100% slider = 0% fillOpacity (trong suốt nhất)
    const opacityValue = (100 - parseFloat(value)) / 100;
    layer._drawingOpacity = opacityValue;
    layer.setStyle({ fillOpacity: opacityValue });
    
    // Cập nhật hiển thị
    const opacitySpan = document.getElementById(`opacity-value-${layerId}`);
    if (opacitySpan) opacitySpan.textContent = value + '%';
    
  } else if (type === 'weight') {
    const weightValue = parseInt(value);
    layer._drawingWeight = weightValue;
    layer.setStyle({ weight: weightValue });
    
    // Cập nhật hiển thị
    const weightSpan = document.getElementById(`weight-value-${layerId}`);
    if (weightSpan) weightSpan.textContent = value + 'px';
  }
  
  // Lưu ngay lập tức
  saveDrawings();
};

// Hàm cập nhật drawing layer (được gọi từ popup button - chỉ cập nhật tên)
window.updateDrawingLayer = function(buttonElement) {
  const map = window.mapInstance;
  if (!map) return;
  
  const layerId = parseInt(buttonElement.getAttribute('data-layer-id'));
  const layer = drawingLayers.find(l => l._drawingId === layerId);
  
  if (layer) {
    // Xử lý tùy theo loại
    if (layer._drawingType === 'text') {
      // Với text, cập nhật nội dung
      const textInput = document.getElementById(`drawing-text-${layerId}`);
      if (textInput && textInput.value) {
        layer._drawingText = textInput.value;
        
        // Cập nhật icon với text mới
        if (layer.setIcon) {
          layer.setIcon(L.divIcon({
            className: 'drawing-text-marker',
            html: `<div style="color: ${layer._drawingColor}; font-size: 16px; font-weight: bold; white-space: nowrap; text-shadow: 1px 1px 2px white, -1px -1px 2px white;">${layer._drawingText}</div>`,
            iconSize: null
          }));
        }
      }
    } else {
      // Với các loại khác, cập nhật tên/label
      const labelInput = document.getElementById(`drawing-label-${layerId}`);
      if (labelInput) {
        layer._drawingLabel = labelInput.value;
      }
    }
    
    // Lưu lại
    saveDrawings();
    
    // Đóng popup và hiển thị thông báo
    layer.closePopup();
    showSearchNotification('Đã lưu!', 'success');
    
    // Refresh popup để hiển thị thay đổi mới
    setTimeout(() => {
      makeDrawingDeletable(layer, map);
    }, 100);
  }
};

// Hàm xóa drawing layer (được gọi từ popup button)
window.deleteDrawingLayer = function(buttonElement) {
  const map = window.mapInstance;
  if (!map) return;
  
  const layerId = parseInt(buttonElement.getAttribute('data-layer-id'));
  
  // Tìm TẤT CẢ layers có cùng ID (cho trường hợp mũi tên có 3 phần)
  const layersToRemove = drawingLayers.filter(l => l._drawingId === layerId);
  
  if (layersToRemove.length > 0) {
    // Xóa tất cả layers có cùng ID
    layersToRemove.forEach(l => {
      try {
        if (l && map.hasLayer(l)) {
          map.removeLayer(l);
        }
      } catch (error) {
        console.error('Lỗi khi xóa layer:', error);
      }
    });
    
    // Xóa khỏi mảng drawingLayers
    drawingLayers = drawingLayers.filter(l => l._drawingId !== layerId);
    
    // Lưu lại
    saveDrawings();
    
    showSearchNotification('Đã xóa ghi chú!', 'success');
  }
};

// Hàm lưu drawings vào localStorage
function saveDrawings() {
  try {
    const drawingsData = drawingLayers.map(layer => {
      const layerData = {
        type: layer._drawingType,
        color: layer._drawingColor,
        weight: layer._drawingWeight,
        label: layer._drawingLabel || '',
        opacity: layer._drawingOpacity !== undefined ? layer._drawingOpacity : 0.2
      };
      
      if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
        // Polygon (không phải Rectangle cũ)
        layerData.latlngs = layer.getLatLngs();
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // Polyline (line, freehand, arrow) nhưng không phải Polygon
        layerData.latlngs = layer.getLatLngs();
      } else if (layer instanceof L.Circle) {
        layerData.center = layer.getLatLng();
        layerData.radius = layer.getRadius();
      } else if (layer instanceof L.Rectangle) {
        // Hỗ trợ legacy rectangle - chuyển thành polygon
        layerData.bounds = layer.getBounds();
        layerData.type = 'polygon'; // Convert sang polygon
      } else if (layer instanceof L.Marker) {
        layerData.latlng = layer.getLatLng();
        layerData.text = layer._drawingText;
      }
      
      return layerData;
    });
    
    localStorage.setItem('mapDrawings', JSON.stringify(drawingsData));
  } catch (error) {
    console.error('Lỗi khi lưu vẽ:', error);
  }
}

// Hàm tải drawings từ localStorage
function loadDrawings(map) {
  try {
    const saved = localStorage.getItem('mapDrawings');
    if (!saved) return;
    
    const drawingsData = JSON.parse(saved);
    drawingsData.forEach(data => {
      let layer = null;
      
      if (data.type === 'freehand' || data.type === 'line') {
        layer = L.polyline(data.latlngs, {
          color: data.color,
          weight: data.weight,
          pane: 'drawingPane'
        }).addTo(map);
      } else if (data.type === 'arrow') {
        layer = L.polyline(data.latlngs, {
          color: data.color,
          weight: data.weight,
          pane: 'drawingPane'
        }).addTo(map);
        // Thêm mũi tên decorator
        if (L.polylineDecorator) {
          L.polylineDecorator(layer, {
            patterns: [
              {
                offset: '100%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                  pixelSize: 15,
                  polygon: false,
                  pathOptions: { color: data.color, weight: data.weight }
                })
              }
            ]
          }).addTo(map);
        }
      } else if (data.type === 'polygon') {
        layer = L.polygon(data.latlngs, {
          color: data.color,
          weight: data.weight,
          fillOpacity: data.opacity !== undefined ? data.opacity : 0.2,
          pane: 'drawingPane'
        }).addTo(map);
      } else if (data.type === 'rectangle') {
        // Hỗ trợ legacy rectangle - convert thành polygon
        if (data.bounds) {
          const bounds = L.latLngBounds(data.bounds);
          const coords = [
            [bounds.getSouth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getEast()],
            [bounds.getSouth(), bounds.getEast()]
          ];
          layer = L.polygon(coords, {
            color: data.color,
            weight: data.weight,
            fillOpacity: data.opacity !== undefined ? data.opacity : 0.2,
            pane: 'drawingPane'
          }).addTo(map);
          layer._drawingType = 'polygon'; // Convert type
        }
      } else if (data.type === 'circle') {
        layer = L.circle(data.center, {
          radius: data.radius,
          color: data.color,
          weight: data.weight,
          fillOpacity: data.opacity !== undefined ? data.opacity : 0.2,
          pane: 'drawingPane'
        }).addTo(map);
      } else if (data.type === 'text') {
        layer = L.marker(data.latlng, {
          icon: L.divIcon({
            className: 'drawing-text-marker',
            html: `<div style="color: ${data.color}; font-size: 16px; font-weight: bold; white-space: nowrap; text-shadow: 1px 1px 2px white, -1px -1px 2px white;">${data.text}</div>`,
            iconSize: null
          }),
          pane: 'drawingPane'
        }).addTo(map);
        layer._drawingText = data.text;
      }
      
      if (layer) {
        layer._drawingType = data.type;
        layer._drawingColor = data.color;
        layer._drawingWeight = data.weight;
        layer._drawingLabel = data.label || '';
        layer._drawingOpacity = data.opacity !== undefined ? data.opacity : 0.2;
        layer._drawingId = drawingIdCounter++;
        
        drawingLayers.push(layer);
        // Thêm khả năng xóa và chỉnh sửa
        makeDrawingDeletable(layer, map);
      }
    });
  } catch (error) {
    console.error('Lỗi khi tải vẽ:', error);
  }
}

// Hàm xóa tất cả drawings
function clearAllDrawings(map) {
  if (drawingLayers.length === 0) {
    showSearchNotification('Chưa có vẽ nào trên bản đồ!', 'error');
    return;
  }
  
  if (!confirm(`Xóa tất cả ${drawingLayers.length} vẽ?`)) {
    return;
  }
  
  drawingLayers.forEach(layer => {
    map.removeLayer(layer);
  });
  
  drawingLayers = [];
  drawingHistory = [];
  drawingHistoryIndex = -1;
  
  saveDrawings();
  showSearchNotification('Đã xóa tất cả vẽ!', 'success');
}

// Hàm undo
function undoDrawing(map) {
  if (drawingLayers.length === 0) {
    showSearchNotification('Không có gì để hoàn tác!', 'error');
    return;
  }
  
  const lastLayer = drawingLayers.pop();
  if (lastLayer) {
    map.removeLayer(lastLayer);
    saveDrawings();
    showSearchNotification('Đã hoàn tác!', 'success');
  }
}

// Hàm export drawings sang GeoJSON
// Hàm tạo polygon từ circle (để xuất KML)
function circleToPolygon(center, radiusInMeters, numPoints = 64) {
  const points = [];
  const earthRadius = 6371000; // meters
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    
    // Tính toán điểm mới dựa trên bearing và distance
    const lat1 = center.lat * Math.PI / 180;
    const lng1 = center.lng * Math.PI / 180;
    const angularDistance = radiusInMeters / earthRadius;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(angle)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(angle) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    points.push({
      lat: lat2 * 180 / Math.PI,
      lng: lng2 * 180 / Math.PI
    });
  }
  
  return points;
}

// Hàm escape XML
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Hàm chuyển màu hex sang KML color (aabbggrr)
function hexToKmlColor(hex, opacity = 1) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Convert opacity to hex (0-1 to 00-ff)
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  
  // KML format: aabbggrr
  return alpha + 
         b.toString(16).padStart(2, '0') + 
         g.toString(16).padStart(2, '0') + 
         r.toString(16).padStart(2, '0');
}

function exportDrawings() {
  if (drawingLayers.length === 0) {
    alert('Chưa có vẽ nào để xuất!');
    return;
  }

  try {
    // KML header
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Chú thích bản đồ</name>
    <description>Xuất từ ứng dụng bản đồ</description>
`;

    // Tạo styles
    const styles = new Set();
    drawingLayers.forEach(layer => {
      const styleId = `style_${layer._drawingColor.replace('#', '')}`;
      if (!styles.has(styleId)) {
        styles.add(styleId);
        const kmlColor = hexToKmlColor(layer._drawingColor, 0.8);
        const fillOpacity = layer._drawingOpacity !== undefined ? layer._drawingOpacity : 0.2;
        const fillColor = hexToKmlColor(layer._drawingColor, fillOpacity);
        
        kml += `    <Style id="${styleId}">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>${layer._drawingWeight || 3}</width>
      </LineStyle>
      <PolyStyle>
        <color>${fillColor}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
`;
      }
    });

    // Tạo placemarks
    drawingLayers.forEach((layer, index) => {
      const drawingTypeName = {
        'freehand': 'Vẽ tự do',
        'line': 'Đường thẳng',
        'arrow': 'Mũi tên',
        'polygon': 'Hình đa giác',
        'circle': 'Hình tròn',
        'text': 'Chú thích'
      };
      
      const name = layer._drawingLabel || layer._drawingText || drawingTypeName[layer._drawingType] || `Ghi chú ${index + 1}`;
      const styleId = `style_${layer._drawingColor.replace('#', '')}`;
      
      let description = `Loại: ${drawingTypeName[layer._drawingType] || layer._drawingType}`;
      if (layer._drawingType === 'polygon') {
        const latlngs = layer.getLatLngs()[0] || layer.getLatLngs();
        const area = calculatePolygonArea(latlngs);
        description += `\nDiện tích: ${formatMeasurement(area, 'area')}`;
      } else if (layer._drawingType === 'circle') {
        const radius = layer.getRadius();
        const area = Math.PI * radius * radius;
        description += `\nDiện tích: ${formatMeasurement(area, 'area')}`;
        description += `\nBán kính: ${formatMeasurement(radius, 'length')}`;
      } else if (layer._drawingType === 'freehand' || layer._drawingType === 'line' || layer._drawingType === 'arrow') {
        const latlngs = layer.getLatLngs();
        const length = calculatePolylineLength(latlngs);
        description += `\nChiều dài: ${formatMeasurement(length, 'length')}`;
      }

      kml += `    <Placemark>
      <name>${escapeXml(name)}</name>
      <description>${escapeXml(description)}</description>
      <styleUrl>#${styleId}</styleUrl>
`;

      // Geometry
      if (layer instanceof L.Circle) {
        // Circle - chuyển thành polygon
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const circleCoords = circleToPolygon(center, radius);
        const coordString = circleCoords.map(ll => `${ll.lng},${ll.lat},0`).join(' ');
        kml += `      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
`;
      } else if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
        // Polygon
        let coords = layer.getLatLngs()[0];
        if (Array.isArray(coords[0])) {
          coords = coords[0];
        }
        
        // Đảm bảo polygon đóng kín (điểm cuối trùng điểm đầu)
        const coordsArray = Array.from(coords);
        const first = coordsArray[0];
        const last = coordsArray[coordsArray.length - 1];
        if (first.lat !== last.lat || first.lng !== last.lng) {
          coordsArray.push(first);
        }
        
        const coordString = coordsArray.map(ll => `${ll.lng},${ll.lat},0`).join(' ');
        kml += `      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
`;
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // LineString
        const coords = layer.getLatLngs();
        const coordString = coords.map(ll => `${ll.lng},${ll.lat},0`).join(' ');
        kml += `      <LineString>
        <coordinates>${coordString}</coordinates>
      </LineString>
`;
      } else if (layer instanceof L.Marker) {
        // Point
        const latlng = layer.getLatLng();
        kml += `      <Point>
        <coordinates>${latlng.lng},${latlng.lat},0</coordinates>
      </Point>
`;
      }

      kml += `    </Placemark>
`;
    });

    kml += `  </Document>
</kml>`;

    // Xuất file
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chuThich_${new Date().getTime()}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSearchNotification('Đã xuất file KML!', 'success');
  } catch (error) {
    console.error('Lỗi khi xuất vẽ:', error);
    alert('Không thể xuất file. Vui lòng thử lại.');
  }
}

// Hàm setup drawing tools
function setupDrawingTools(map) {
  const drawingToolsContainer = document.getElementById('drawing-tools-container');
  if (!drawingToolsContainer) return;
  
  // Tạo pane riêng cho drawings với z-index cao
  // Z-index hierarchy: overlayPane(400) < projectPane(650) < duanPane(700) < searchResultPane(800)
  //                    < locationPane(850) < drawingPane(880) < tooltipPane(950) < popupPane(1000)
  if (!map._drawingPane) {
    map._drawingPane = map.createPane('drawingPane');
    map._drawingPane.style.zIndex = 880; // Cao hơn các layer nhưng thấp hơn popup
  }
  
  // Đảm bảo popupPane có z-index cao nhất để popup luôn hiển thị trên cùng
  const popupPane = map.getPane('popupPane');
  if (popupPane) {
    popupPane.style.zIndex = 1000; // Cao nhất - đảm bảo popup luôn hiển thị trên tất cả
  }
  
  // Tải drawings đã lưu
  loadDrawings(map);

  // Thêm event listener cho phím ESC để thoát khỏi chế độ vẽ
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      if (isDrawing) {
        // Xóa layer tạm thời nếu có
        if (currentDrawingLayer && map.hasLayer(currentDrawingLayer)) {
          map.removeLayer(currentDrawingLayer);
        }
        
        // Tắt chế độ vẽ
        disableAllDrawingTools();
        
        // Hiển thị thông báo
        showSearchNotification('Đã hủy vẽ', 'info');
      }
    }
  });

  // Các nút công cụ vẽ
  const freehandBtn = document.getElementById('draw-freehand-btn');
  const lineBtn = document.getElementById('draw-line-btn');
  const polygonBtn = document.getElementById('draw-polygon-btn');
  const circleBtn = document.getElementById('draw-circle-btn');
  const arrowBtn = document.getElementById('draw-arrow-btn');
  const textBtn = document.getElementById('draw-text-btn');
  const colorPicker = document.getElementById('drawing-color-picker');
  const weightSlider = document.getElementById('drawing-weight-slider');
  const undoBtn = document.getElementById('drawing-undo-btn');
  const clearBtn = document.getElementById('drawing-clear-btn');
  const exportBtn = document.getElementById('drawing-export-btn');
  
  // Hàm tắt tất cả các chế độ vẽ
  function disableAllDrawingTools() {
    isDrawing = false;
    currentDrawingTool = null;
    tempDrawingPoints = [];
    drawingStartPoint = null;
    currentDrawingLayer = null;
    
    map.getContainer().style.cursor = '';
    
    // Xóa event handlers
    if (drawingClickHandler) {
      map.off('click', drawingClickHandler);
      drawingClickHandler = null;
    }
    if (drawingMouseMoveHandler) {
      map.off('mousemove', drawingMouseMoveHandler);
      drawingMouseMoveHandler = null;
    }
    
    // Xóa mousedown và mouseup handlers cho freehand
    map.off('mousedown');
    map.off('mouseup');
    
    // Xóa dblclick handler cho polygon
    map.off('dblclick');

    // Bật lại map dragging và các interactions
    if (map.dragging) {
      map.dragging.enable();
    }
    if (map.touchZoom) {
      map.touchZoom.enable();
    }
    if (map.scrollWheelZoom) {
      map.scrollWheelZoom.enable();
    }
    if (map.boxZoom) {
      map.boxZoom.enable();
    }
    if (map.keyboard) {
      map.keyboard.enable();
    }
    
    // Bật lại tương tác với GeoJSON layers
    toggleGeojsonInteractivity(true);
    
    // Remove active class từ tất cả buttons
    [freehandBtn, lineBtn, polygonBtn, circleBtn, arrowBtn, textBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
  }
  
  // Hàm bắt đầu vẽ tự do
  if (freehandBtn) {
    freehandBtn.onclick = function() {
      if (currentDrawingTool === 'freehand') {
        disableAllDrawingTools();
        return;
      }
      
      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'freehand';
      freehandBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);
      
      // Disable scrollWheelZoom để tránh zoom khi vẽ
      if (map.scrollWheelZoom) {
        map.scrollWheelZoom.disable();
      }
      
      let isMouseDown = false;
      
      map.on('mousedown', function(e) {
        // Disable map dragging khi bắt đầu vẽ
        if (map.dragging) {
          map.dragging.disable();
        }
        
        isMouseDown = true;
        tempDrawingPoints = [e.latlng];
        currentDrawingLayer = L.polyline([e.latlng], {
          color: drawingColor,
          weight: drawingWeight,
          pane: 'drawingPane'
        }).addTo(map);
        
        // Prevent map from panning
        L.DomEvent.stopPropagation(e.originalEvent);
      });
      
      drawingMouseMoveHandler = function(e) {
        if (isMouseDown && currentDrawingLayer) {
          tempDrawingPoints.push(e.latlng);
          currentDrawingLayer.setLatLngs(tempDrawingPoints);
        }
      };
      map.on('mousemove', drawingMouseMoveHandler);
      
      map.on('mouseup', function() {
        if (isMouseDown && currentDrawingLayer) {
          isMouseDown = false;
          currentDrawingLayer._drawingType = 'freehand';
          currentDrawingLayer._drawingColor = drawingColor;
          currentDrawingLayer._drawingWeight = drawingWeight;
          currentDrawingLayer._drawingLabel = '';
          currentDrawingLayer._drawingId = drawingIdCounter++;
          drawingLayers.push(currentDrawingLayer);
          makeDrawingDeletable(currentDrawingLayer, map);
          saveDrawings();
          currentDrawingLayer = null;
          tempDrawingPoints = [];
          
          // Enable lại map dragging sau khi vẽ xong
          if (map.dragging) {
            map.dragging.enable();
          }
        }
      });
    };
  }
  
  // Hàm vẽ đường gấp khúc (polyline)
  if (lineBtn) {
    lineBtn.onclick = function() {
      if (currentDrawingTool === 'line') {
        disableAllDrawingTools();
        return;
      }

      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'line';
      lineBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);

      let linePoints = [];

      drawingClickHandler = function(e) {
        linePoints.push(e.latlng);

        if (linePoints.length === 1) {
          // Điểm đầu tiên - tạo polyline tạm
          currentDrawingLayer = L.polyline([linePoints[0], linePoints[0]], {
            color: drawingColor,
            weight: drawingWeight,
            pane: 'drawingPane'
          }).addTo(map);

          drawingMouseMoveHandler = function(e) {
            if (currentDrawingLayer && linePoints.length > 0) {
              // Cập nhật polyline với các điểm đã click + vị trí chuột hiện tại
              const tempPoints = [...linePoints, e.latlng];
              currentDrawingLayer.setLatLngs(tempPoints);
            }
          };
          map.on('mousemove', drawingMouseMoveHandler);
          
          showSearchNotification('Click để thêm điểm, double-click để hoàn thành', 'info');
        } else {
          // Các điểm tiếp theo - cập nhật polyline
          currentDrawingLayer.setLatLngs(linePoints);
        }
      };

      map.on('click', drawingClickHandler);

      // Double-click để hoàn thành polyline
      map.on('dblclick', function(e) {
        L.DomEvent.stopPropagation(e);
        
        if (linePoints.length >= 2) {
          map.off('mousemove', drawingMouseMoveHandler);
          map.off('click', drawingClickHandler);

          // Hoàn thành polyline
          currentDrawingLayer.setLatLngs(linePoints);
          currentDrawingLayer._drawingType = 'line';
          currentDrawingLayer._drawingColor = drawingColor;
          currentDrawingLayer._drawingWeight = drawingWeight;
          currentDrawingLayer._drawingLabel = '';
          currentDrawingLayer._drawingId = drawingIdCounter++;
          drawingLayers.push(currentDrawingLayer);
          makeDrawingDeletable(currentDrawingLayer, map);
          saveDrawings();

          linePoints = [];
          currentDrawingLayer = null;
          disableAllDrawingTools();
          showSearchNotification('Đã vẽ đường gấp khúc!', 'success');
        } else {
          showSearchNotification('Cần ít nhất 2 điểm để tạo đường!', 'error');
        }
      });
    };
  }
  
  // Hàm vẽ mũi tên
  if (arrowBtn) {
    arrowBtn.onclick = function() {
      if (currentDrawingTool === 'arrow') {
        disableAllDrawingTools();
        return;
      }
      
      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'arrow';
      arrowBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);
      
      let clickCount = 0;
      let arrowPoints = [];
      
      drawingClickHandler = function(e) {
        clickCount++;
        arrowPoints.push(e.latlng);
        
        if (clickCount === 1) {
          currentDrawingLayer = L.polyline([e.latlng, e.latlng], {
            color: drawingColor,
            weight: drawingWeight,
            dashArray: '5, 5',
            pane: 'drawingPane'
          }).addTo(map);
          
          drawingMouseMoveHandler = function(e) {
            if (currentDrawingLayer) {
              currentDrawingLayer.setLatLngs([arrowPoints[0], e.latlng]);
            }
          };
          map.on('mousemove', drawingMouseMoveHandler);
        } else if (clickCount === 2) {
          map.off('mousemove', drawingMouseMoveHandler);
          map.removeLayer(currentDrawingLayer);
          
          const arrow = L.polyline(arrowPoints, {
            color: drawingColor,
            weight: drawingWeight,
            pane: 'drawingPane'
          }).addTo(map);
          
          // Thêm mũi tên
          const arrowHead = L.polyline([
            arrowPoints[1],
            L.latLng(
              arrowPoints[1].lat + (arrowPoints[0].lat - arrowPoints[1].lat) * 0.15 - (arrowPoints[1].lng - arrowPoints[0].lng) * 0.08,
              arrowPoints[1].lng + (arrowPoints[0].lng - arrowPoints[1].lng) * 0.15 + (arrowPoints[1].lat - arrowPoints[0].lat) * 0.08
            )
          ], {
            color: drawingColor,
            weight: drawingWeight,
            pane: 'drawingPane'
          }).addTo(map);
          
          const arrowHead2 = L.polyline([
            arrowPoints[1],
            L.latLng(
              arrowPoints[1].lat + (arrowPoints[0].lat - arrowPoints[1].lat) * 0.15 + (arrowPoints[1].lng - arrowPoints[0].lng) * 0.08,
              arrowPoints[1].lng + (arrowPoints[0].lng - arrowPoints[1].lng) * 0.15 - (arrowPoints[1].lat - arrowPoints[0].lat) * 0.08
            )
          ], {
            color: drawingColor,
            weight: drawingWeight,
            pane: 'drawingPane'
          }).addTo(map);
          
          arrow._drawingType = 'arrow';
          arrow._drawingColor = drawingColor;
          arrow._drawingWeight = drawingWeight;
          arrow._drawingLabel = '';
          arrowHead._drawingType = 'arrow';
          arrowHead._drawingColor = drawingColor;
          arrowHead._drawingWeight = drawingWeight;
          arrowHead._drawingLabel = '';
          arrowHead2._drawingType = 'arrow';
          arrowHead2._drawingColor = drawingColor;
          arrowHead2._drawingWeight = drawingWeight;
          arrowHead2._drawingLabel = '';
          
          // Gán cùng một ID cho tất cả các phần của mũi tên
          const arrowId = drawingIdCounter++;
          arrow._drawingId = arrowId;
          arrowHead._drawingId = arrowId;
          arrowHead2._drawingId = arrowId;
          
          // Liên kết các phần của mũi tên với nhau
          arrow._arrowParts = [arrowHead, arrowHead2];
          arrowHead._mainArrow = arrow;
          arrowHead2._mainArrow = arrow;
          
          drawingLayers.push(arrow, arrowHead, arrowHead2);
          makeDrawingDeletable(arrow, map);
          makeDrawingDeletable(arrowHead, map);
          makeDrawingDeletable(arrowHead2, map);
          saveDrawings();
          
          clickCount = 0;
          arrowPoints = [];
          currentDrawingLayer = null;
          disableAllDrawingTools();
          showSearchNotification('Đã vẽ mũi tên!', 'success');
        }
      };
      
      map.on('click', drawingClickHandler);
    };
  }
  
  // Hàm vẽ hình đa giác
  if (polygonBtn) {
    polygonBtn.onclick = function() {
      if (currentDrawingTool === 'polygon') {
        disableAllDrawingTools();
        return;
      }

      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'polygon';
      polygonBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);

      let polygonPoints = [];

      drawingClickHandler = function(e) {
        polygonPoints.push(e.latlng);

        if (polygonPoints.length === 1) {
          // Điểm đầu tiên - tạo polygon
          currentDrawingLayer = L.polygon([polygonPoints[0], polygonPoints[0], polygonPoints[0]], {
            color: drawingColor,
            weight: drawingWeight,
            fillOpacity: 0.2,
            pane: 'drawingPane'
          }).addTo(map);

          drawingMouseMoveHandler = function(e) {
            if (currentDrawingLayer && polygonPoints.length > 0) {
              // Cập nhật polygon với các điểm đã click + vị trí chuột hiện tại
              const tempPoints = [...polygonPoints, e.latlng];
              currentDrawingLayer.setLatLngs(tempPoints);
            }
          };
          map.on('mousemove', drawingMouseMoveHandler);
          
          showSearchNotification('Click để thêm điểm, double-click để hoàn thành', 'info');
        } else {
          // Các điểm tiếp theo - cập nhật polygon
          currentDrawingLayer.setLatLngs(polygonPoints);
        }
      };

      map.on('click', drawingClickHandler);

      // Double-click để hoàn thành polygon
      map.on('dblclick', function(e) {
        L.DomEvent.stopPropagation(e);
        
        if (polygonPoints.length >= 3) {
          map.off('mousemove', drawingMouseMoveHandler);
          map.off('click', drawingClickHandler);

          // Hoàn thành polygon
          currentDrawingLayer.setLatLngs(polygonPoints);
          currentDrawingLayer._drawingType = 'polygon';
          currentDrawingLayer._drawingColor = drawingColor;
          currentDrawingLayer._drawingWeight = drawingWeight;
          currentDrawingLayer._drawingLabel = '';
          currentDrawingLayer._drawingOpacity = 0.2;
          currentDrawingLayer._drawingId = drawingIdCounter++;
          drawingLayers.push(currentDrawingLayer);
          makeDrawingDeletable(currentDrawingLayer, map);
          saveDrawings();

          polygonPoints = [];
          currentDrawingLayer = null;
          disableAllDrawingTools();
          showSearchNotification('Đã vẽ hình đa giác!', 'success');
        } else {
          showSearchNotification('Cần ít nhất 3 điểm để tạo hình đa giác!', 'error');
        }
      });
    };
  }
  
  // Hàm vẽ hình tròn
  if (circleBtn) {
    circleBtn.onclick = function() {
      if (currentDrawingTool === 'circle') {
        disableAllDrawingTools();
        return;
      }
      
      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'circle';
      circleBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);
      
      let clickCount = 0;
      
      drawingClickHandler = function(e) {
        clickCount++;
        
        if (clickCount === 1) {
          drawingStartPoint = e.latlng;
          currentDrawingLayer = L.circle(drawingStartPoint, {
            radius: 1,
            color: drawingColor,
            weight: drawingWeight,
            fillOpacity: 0.2,
            pane: 'drawingPane'
          }).addTo(map);
          
          drawingMouseMoveHandler = function(e) {
            if (currentDrawingLayer) {
              const radius = drawingStartPoint.distanceTo(e.latlng);
              currentDrawingLayer.setRadius(radius);
            }
          };
          map.on('mousemove', drawingMouseMoveHandler);
        } else if (clickCount === 2) {
          map.off('mousemove', drawingMouseMoveHandler);
          
          currentDrawingLayer._drawingType = 'circle';
          currentDrawingLayer._drawingColor = drawingColor;
          currentDrawingLayer._drawingWeight = drawingWeight;
          currentDrawingLayer._drawingLabel = '';
          currentDrawingLayer._drawingOpacity = 0.2;
          currentDrawingLayer._drawingId = drawingIdCounter++;
          drawingLayers.push(currentDrawingLayer);
          makeDrawingDeletable(currentDrawingLayer, map);
          saveDrawings();
          
          clickCount = 0;
          drawingStartPoint = null;
          currentDrawingLayer = null;
          disableAllDrawingTools();
          showSearchNotification('Đã vẽ hình tròn!', 'success');
        }
      };
      
      map.on('click', drawingClickHandler);
    };
  }
  
  // Hàm thêm text
  if (textBtn) {
    textBtn.onclick = function() {
      if (currentDrawingTool === 'text') {
        disableAllDrawingTools();
        return;
      }
      
      disableAllDrawingTools();
      isDrawing = true;
      currentDrawingTool = 'text';
      textBtn.classList.add('active');
      map.getContainer().style.cursor = 'crosshair';
      toggleGeojsonInteractivity(false);
      
      drawingClickHandler = function(e) {
        const text = prompt('Nhập chú thích:', 'Ghi chú');
        if (text) {
          const marker = L.marker(e.latlng, {
            icon: L.divIcon({
              className: 'drawing-text-marker',
              html: `<div style="color: ${drawingColor}; font-size: 16px; font-weight: bold; white-space: nowrap; text-shadow: 1px 1px 2px white, -1px -1px 2px white;">${text}</div>`,
              iconSize: null
            }),
            pane: 'drawingPane'
          }).addTo(map);
          
          marker._drawingType = 'text';
          marker._drawingColor = drawingColor;
          marker._drawingWeight = drawingWeight;
          marker._drawingText = text;
          marker._drawingId = drawingIdCounter++;
          drawingLayers.push(marker);
          makeDrawingDeletable(marker, map);
          saveDrawings();
          
          showSearchNotification('Đã thêm chú thích!', 'success');
        }
        
        disableAllDrawingTools();
      };
      
      map.on('click', drawingClickHandler);
    };
  }
  
  // Color picker
  if (colorPicker) {
    colorPicker.value = drawingColor;
    colorPicker.addEventListener('change', function() {
      drawingColor = this.value;
    });
  }
  
  // Weight slider
  if (weightSlider) {
    weightSlider.value = drawingWeight;
    const weightValue = document.getElementById('drawing-weight-value');
    if (weightValue) {
      weightValue.textContent = drawingWeight + 'px';
    }
    
    weightSlider.addEventListener('input', function() {
      drawingWeight = parseInt(this.value);
      if (weightValue) {
        weightValue.textContent = drawingWeight + 'px';
      }
    });
  }
  
  // Undo button
  if (undoBtn) {
    undoBtn.onclick = function() {
      undoDrawing(map);
    };
  }
  
  // Clear button
  if (clearBtn) {
    clearBtn.onclick = function() {
      clearAllDrawings(map);
    };
  }
  
  // Export button
  if (exportBtn) {
    exportBtn.onclick = exportDrawings;
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
  const projectLoadTimeoutId = setTimeout(() => {
    loadProjects(map); // Tải các dự án với màu sắc khác nhau
    // Tải các file DuAn (nằm trên cùng)
    loadDuanFiles(map);
    // Thiết lập các control trong hộp công cụ sau khi load xong
    setupToolsPanelControls(map);
  }, 500);
  setupMeasureButton(map);
  setupAreaButton(map);
  setupCopyCoordinateButton(map);
  setupSharePointsButton(map);
  setupDrawingTools(map);
  
  // Mở hộp công cụ khi khởi động (tùy chọn)
  const toolsPanelTimeoutId = setTimeout(() => {
    toggleToolsPanel(true);
  }, 300);
  
  // Lưu các initialization timeouts (không cần cleanup vì chỉ chạy một lần)
  // Tuy nhiên lưu lại để có thể cancel nếu cần khi reload page
  initializationTimeout = { projectLoadTimeoutId, toolsPanelTimeoutId };
})(); 