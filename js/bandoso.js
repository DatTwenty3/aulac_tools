// Khởi tạo bản đồ tại vị trí trung tâm tỉnh Vĩnh Long
const map = L.map('map').setView([10.2536, 105.9722], 10);

// Thêm layer bản đồ nền
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Danh sách tên file geojson (tự động sinh từ thư mục geo-json)
const geojsonFiles = [
  "An Bình.geojson","An Định.geojson","An Hiệp.geojson","An Hội.geojson","An Phú Tân.geojson","An Qui.geojson","An Trường.geojson","Ba Tri.geojson","Bảo Thạnh.geojson","Bến Tre.geojson","Bình Đại.geojson","Bình Minh.geojson","Bình Phú.geojson","Bình Phước.geojson","Cái Ngang.geojson","Cái Nhum.geojson","Cái Vồn.geojson","Càng Long.geojson","Cầu Kè.geojson","Cầu Ngang.geojson","Châu Hòa.geojson","Châu Hưng.geojson","Châu Thành.geojson","Chợ Lách.geojson","Đại An.geojson","Đại Điền.geojson","Đôn Châu.geojson","Đông Hải.geojson","Đồng Khởi.geojson","Đông Thành.geojson","Duyên Hải.geojson","Giao Long.geojson","Giồng Trôm.geojson","Hàm Giang.geojson","Hiệp Mỹ.geojson","Hiếu Phụng.geojson","Hiếu Thành.geojson","Hòa Bình.geojson","Hòa Hiệp.geojson","Hòa Minh.geojson","Hòa Thuận.geojson","Hùng Hòa.geojson","Hưng Khánh Trung.geojson","Hưng Mỹ.geojson","Hưng Nhượng.geojson","Hương Mỹ.geojson","Lộc Thuận.geojson","Long Châu.geojson","Long Đức.geojson","Long Hiệp.geojson","Long Hồ.geojson","Long Hòa.geojson","Long Hữu.geojson","Long Thành.geojson","Long Vĩnh.geojson","Lục Sỹ Thành.geojson","Lương Hòa.geojson","Lương Phú.geojson","Lưu Nghiệp Anh.geojson","Mỏ Cày.geojson","Mỹ Chánh Hòa.geojson","Mỹ Long.geojson","Mỹ Thuận.geojson","Ngãi Tứ.geojson","Ngũ Lạc.geojson","Nguyệt Hóa.geojson","Nhị Long.geojson","Nhị Trường.geojson","Nhơn Phú.geojson","Nhuận Phú Tân.geojson","Phong Thạnh.geojson","Phú Khương.geojson","Phú Phụng.geojson","Phú Quới.geojson","Phú Tân.geojson","Phú Thuận.geojson","Phú Túc.geojson","Phước Hậu.geojson","Phước Long.geojson","Phước Mỹ Trung.geojson","Quới An.geojson","Quới Điền.geojson","Quới Thiện.geojson","Sơn Đông.geojson","Song Lộc.geojson","Song Phú.geojson","Tam Bình.geojson","Tam Ngãi.geojson","Tân An.geojson","Tân Hạnh.geojson","Tân Hào.geojson","Tân Hòa.geojson","Tân Long Hội.geojson","Tân Lược.geojson","Tân Ngãi.geojson","Tân Phú.geojson","Tân Quới.geojson","Tân Thành Bình.geojson","Tân Thủy.geojson","Tân Xuân.geojson","Tập Ngãi.geojson","Tập Sơn.geojson","Thanh Đức.geojson","Thạnh Hải.geojson","Thạnh Phong.geojson","Thành Thới.geojson"
];

// Hàm tải và hiển thị từng file geojson
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