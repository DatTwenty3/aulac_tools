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

// Danh sách tên file geojson (tự động sinh từ thư mục geo-json)
// const geojsonFiles = [
//   "An Bình.geojson",
//   "An Định.geojson",
//   "An Hiệp.geojson",
//   "An Hội.geojson",
//   "An Phú Tân.geojson",
//   "An Qui.geojson",
//   "An Trường.geojson",
//   "Ba Tri.geojson",
//   "Bảo Thạnh.geojson",
//   "Bến Tre.geojson",
//   "Bình Đại.geojson",
//   "Bình Minh.geojson",
//   "Bình Phú.geojson",
//   "Bình Phước.geojson",
//   "Cái Ngang.geojson",
//   "Cái Nhum.geojson",
//   "Cái Vồn.geojson",
//   "Càng Long.geojson",
//   "Cầu Kè.geojson",
//   "Cầu Ngang.geojson",
//   "Châu Hòa.geojson",
//   "Châu Hưng.geojson",
//   "Châu Thành.geojson",
//   "Chợ Lách.geojson",
//   "Đại An.geojson",
//   "Đại Điền.geojson",
//   "Đôn Châu.geojson",
//   "Đông Hải.geojson",
//   "Đông Thành.geojson",
//   "Đồng Khởi.geojson",
//   "Duyên Hải.geojson",
//   "Giao Long.geojson",
//   "Giồng Trôm.geojson",
//   "Hàm Giang.geojson",
//   "Hiệp Mỹ.geojson",
//   "Hiếu Phụng.geojson",
//   "Hiếu Thành.geojson",
//   "Hòa Bình.geojson",
//   "Hòa Hiệp.geojson",
//   "Hòa Minh.geojson",
//   "Hòa Thuận.geojson",
//   "Hùng Hòa.geojson",
//   "Hưng Khánh Trung.geojson",
//   "Hưng Mỹ.geojson",
//   "Hưng Nhượng.geojson",
//   "Hương Mỹ.geojson",
//   "Long Châu.geojson",
//   "Long Đức.geojson",
//   "Long Hiệp.geojson",
//   "Long Hồ.geojson",
//   "Long Hòa.geojson",
//   "Long Hữu.geojson",
//   "Long Thành.geojson",
//   "Long Vĩnh.geojson",
//   "Lộc Thuận.geojson",
//   "Lục Sỹ Thành.geojson",
//   "Lương Hòa.geojson",
//   "Lương Phú.geojson",
//   "Lưu Nghiệp Anh.geojson",
//   "Mỏ Cày.geojson",
//   "Mỹ Chánh Hòa.geojson",
//   "Mỹ Long.geojson",
//   "Mỹ Thuận.geojson",
//   "Ngãi Tứ.geojson",
//   "Ngũ Lạc.geojson",
//   "Nguyệt Hóa.geojson",
//   "Nhị Long.geojson",
//   "Nhị Trường.geojson",
//   "Nhơn Phú.geojson",
//   "Nhuận Phú Tân.geojson",
//   "Phong Thạnh.geojson",
//   "Phú Khương.geojson",
//   "Phú Phụng.geojson",
//   "Phú Quới.geojson",
//   "Phú Tân.geojson",
//   "Phú Thuận.geojson",
//   "Phú Túc.geojson",
//   "Phước Hậu.geojson",
//   "Phước Long.geojson",
//   "Phước Mỹ Trung.geojson",
//   "Quới An.geojson",
//   "Quới Điền.geojson",
//   "Quới Thiện.geojson",
//   "Sơn Đông.geojson",
//   "Song Lộc.geojson",
//   "Song Phú.geojson",
//   "Tam Bình.geojson",
//   "Tam Ngãi.geojson",
//   "Tân An.geojson",
//   "Tân Hạnh.geojson",
//   "Tân Hào.geojson",
//   "Tân Hòa.geojson",
//   "Tân Long Hội.geojson",
//   "Tân Lược.geojson",
//   "Tân Ngãi.geojson",
//   "Tân Phú.geojson",
//   "Tân Quới.geojson",
//   "Tân Thành Bình.geojson",
//   "Tân Thủy.geojson",
//   "Tân Xuân.geojson",
//   "Tập Ngãi.geojson",
//   "Tập Sơn.geojson",
//   "Thanh Đức.geojson",
//   "Thạnh Hải.geojson",
//   "Thạnh Phong.geojson",
//   "Thạnh Phú.geojson",
//   "Thạnh Phước.geojson",
//   "Thạnh Trị.geojson",
//   "Thành Thới.geojson",
//   "Thới Thuận.geojson",
//   "Tiên Thủy.geojson",
//   "Trà Cú.geojson",
//   "Trà Côn.geojson",
//   "Trà Ôn.geojson",
//   "Trà Vinh.geojson",
//   "Trường Long Hòa.geojson",
//   "Trung Hiệp.geojson",
//   "Trung Ngãi.geojson",
//   "Trung Thành.geojson",
//   "Vĩnh Thành.geojson"
// ];

fetch('geo-json/list.json')
  .then(res => res.json())
  .then(geojsonFiles => {
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
  })
  .catch(err => {
    console.error('Không thể tải danh sách geojson:', err);
  });

// === Tìm kiếm xã/phường ===
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

if (searchBtn && searchInput) {
  searchBtn.onclick = function() {
    const keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) {
      alert('Vui lòng nhập tên xã/phường!');
      return;
    }
    // Tìm file geojson phù hợp
    const foundFile = geojsonFiles.find(f => f.replace('.geojson','').toLowerCase() === keyword);
    if (!foundFile) {
      alert('Không tìm thấy xã/phường này!');
      return;
    }
    // Tải geojson và zoom đến
    fetch('geo-json/' + encodeURIComponent(foundFile))
      .then(res => res.json())
      .then(data => {
        // Tính toạ độ trung tâm
        let bounds = L.geoJSON(data).getBounds();
        let center = bounds.getCenter();
        map.setView(center, 12);
        // Hiển thị popup thông tin
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
          L.popup()
            .setLatLng(center)
            .setContent(popupContent)
            .openOn(map);
        }
      })
      .catch(() => {
        alert('Lỗi khi tải dữ liệu xã/phường!');
      });
  };
} 