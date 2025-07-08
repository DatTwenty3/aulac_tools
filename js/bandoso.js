// Khởi tạo bản đồ tại vị trí trung tâm tỉnh Vĩnh Long
const map = L.map('map').setView([10.2536, 105.9722], 10);

// Thêm layer bản đồ nền
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Thêm nút xác định vị trí hiện tại
const locateBtnDom = document.getElementById('locate-btn');
if (locateBtnDom) {
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
      const marker = L.marker([lat, lng], {
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
      // Nếu bị từ chối quyền truy cập vị trí thì không hiện alert
      if (err.code !== 1) {
        alert('Không thể xác định vị trí: ' + err.message);
      }
      locateBtnDom.disabled = false;
      locateBtnDom.innerText = '📍 Xác định vị trí của bạn';
    });
  };
}

// === Tìm kiếm xã/phường thông minh ===
function removeVietnameseTones(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

let cachedGeojsonFiles = [];
fetch('geo-json/list.json')
  .then(res => res.json())
  .then(geojsonFiles => {
    cachedGeojsonFiles = geojsonFiles;
    geojsonFiles.forEach(filename => {
      fetch('geo-json/' + encodeURIComponent(filename))
        .then(res => res.json())
        .then(data => {
          L.geoJSON(data, {
            style: function(feature) {
              // Sinh màu ngẫu nhiên cho mỗi xã
              const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
              return {
                color: '#3388ff',
                weight: 2,
                fillColor: randomColor,
                fillOpacity: 0.4
              };
            },
            onEachFeature: function (feature, layer) {
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
              let popupContent = '<div class="popup-info">';
              popupContent += '<div class="popup-title">Thông tin xã/phường</div>';
              if (feature.properties) {
                popupContent += '<table class="popup-table">';
                for (const key in fieldMap) {
                  if (feature.properties[key] !== undefined) {
                    popupContent += `<tr><td class='popup-label'>${fieldMap[key]}</td><td>${feature.properties[key]}</td></tr>`;
                  }
                }
                popupContent += '</table>';
              } else {
                popupContent += 'Không có thông tin.';
              }
              popupContent += '</div>';
              layer.on('click', function() {
                layer.bindPopup(popupContent).openPopup();
              });
              layer.on('mouseover', function() {
                layer.setStyle({fillOpacity: 0.5, color: '#ff7800'});
              });
              layer.on('mouseout', function() {
                layer.setStyle({fillOpacity: 0.2, color: '#3388ff'});
              });
            }
          }).addTo(map);
        })
        .catch(err => {
          console.error('Lỗi tải file', filename, err);
        });
    });

    // Gắn sự kiện tìm kiếm
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn && searchInput) {
      searchBtn.onclick = function() {
        const keyword = removeVietnameseTones(searchInput.value.trim().toLowerCase());
        if (!keyword) {
          alert('Vui lòng nhập tên xã/phường!');
          return;
        }
        // Tìm file phù hợp (không dấu, không phân biệt hoa thường, chỉ cần chứa từ khoá)
        const foundFile = cachedGeojsonFiles.find(f => {
          const name = removeVietnameseTones(f.replace('.geojson','').toLowerCase());
          return name.includes(keyword);
        });
        if (!foundFile) {
          alert('Không tìm thấy xã/phường phù hợp!');
          return;
        }
        // Tải geojson và zoom đến
        fetch('geo-json/' + encodeURIComponent(foundFile))
          .then(res => res.json())
          .then(data => {
            let bounds = L.geoJSON(data).getBounds();
            let center = bounds.getCenter();
            map.setView(center, 12);
            let feature = data.features && data.features[0];
            if (feature && feature.properties) {
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
              let popupContent = '<div class="popup-info">';
              popupContent += '<div class="popup-title">Thông tin xã/phường</div>';
              popupContent += '<table class="popup-table">';
              for (const key in fieldMap) {
                if (feature.properties[key] !== undefined) {
                  popupContent += `<tr><td class='popup-label'>${fieldMap[key]}</td><td>${feature.properties[key]}</td></tr>`;
                }
              }
              popupContent += '</table></div>';
              const popup = L.popup()
                .setLatLng(center)
                .setContent(popupContent);
              map.openPopup(popup);
            }
          })
          .catch(() => {
            alert('Lỗi khi tải dữ liệu xã/phường!');
          });
      };
    }
  })
  .catch(err => {
    console.error('Không thể tải danh sách geojson:', err);
  }); 