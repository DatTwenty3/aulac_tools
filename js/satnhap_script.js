// script.js

let oldDataGlobal = {}; // Lưu dữ liệu phường/xã cũ từ satnhap_old_data.json
let newDataGlobal = {}; // Lưu dữ liệu phường/xã mới từ satnhap_new_data.json

// Hàm load dữ liệu JSON từ file
async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu từ ${url}: ${response.statusText}`);
  }
  return await response.json();
}

// Hàm điền danh sách tỉnh vào dropdown
function populateProvinceSelect(oldData) {
  const provinceSelect = document.getElementById('province-select');
  provinceSelect.innerHTML = '<option value="">-- Chọn tỉnh --</option>';

  Object.keys(oldData).forEach(province => {
    const option = document.createElement('option');
    option.value = province;
    option.textContent = province;
    provinceSelect.appendChild(option);
  });
}

// Hàm cập nhật dropdown xã/phường cũ khi chọn tỉnh
function updateOldUnitSelect(province) {
  const oldUnitSelect = document.getElementById('old-unit-select');
  oldUnitSelect.innerHTML = '<option value="">-- Chọn xã/phường --</option>';

  if (province && oldDataGlobal[province]) {
    const districtData = oldDataGlobal[province];

    Object.keys(districtData).forEach(districtName => {
      const group = document.createElement('optgroup');
      group.label = districtName;

      // Giả sử mỗi phần tử bây giờ là đối tượng có cấu trúc { name, mapApi }
      districtData[districtName].forEach(unitObj => {
        const option = document.createElement('option');
        option.value = JSON.stringify(unitObj);
        option.textContent = unitObj.name;
        group.appendChild(option);
      });

      oldUnitSelect.appendChild(group);
    });

    oldUnitSelect.disabled = false;
  } else {
    oldUnitSelect.disabled = true;
  }

  document.getElementById('find-btn').disabled = true;
}

// Hàm tìm phường/xã mới dựa trên đơn vị cũ (so sánh theo tên)
function findNewWardForOldUnit(oldUnit) {
  // So sánh dựa trên tên (name)
  for (const ward in newDataGlobal) {
    const units = newDataGlobal[ward];
    for (const item of units) {
      if (item.oldUnit === oldUnit.name) {
        return ward;
      }
    }
  }
  return null;
}

// Hàm cập nhật khung bản đồ dựa trên api của phường/xã cũ đã chọn
function updateMapDisplay(oldUnit) {
  const mapContainer = document.getElementById('map-container');
  if (oldUnit && oldUnit.mapApi) {
    mapContainer.innerHTML = `
      <iframe src="${oldUnit.mapApi}" 
              width="100%" 
              height="360" 
              style="border:0; border-radius:8px;" 
              allowfullscreen="" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    `;
  } else {
    mapContainer.innerHTML = `<p>Vui lòng chọn xã/phường cũ để xem bản đồ.</p>`;
  }
}

// Xử lý khi nhấn nút tìm kết quả
function handleFindResult() {
  const oldUnitSelect = document.getElementById('old-unit-select');
  const selectedValue = oldUnitSelect.value;
  const resultDisplay = document.getElementById('result-display');

  if (selectedValue) {
    const oldUnit = JSON.parse(selectedValue); // Chuyển chuỗi JSON thành object có { name, mapApi }
    const newWard = findNewWardForOldUnit(oldUnit);
    if (newWard) {
      resultDisplay.innerHTML = `
        <p><strong>Xã/Phường cũ:</strong> ${oldUnit.name}</p>
        <p><strong>Xã/Phường mới:</strong> ${newWard}</p>
      `;
    } else {
      resultDisplay.innerHTML = `<p>Không tìm thấy phường mới tương ứng !!!</p>`;
    }
    // Cập nhật bản đồ theo API của phường/xã đã chọn
    updateMapDisplay(oldUnit);
  } else {
    resultDisplay.innerHTML = `<p>Vui lòng chọn xã/phường cũ.</p>`;
    updateMapDisplay(null);
  }
}

// Thiết lập các sự kiện cho form
function setupEvents() {
  const provinceSelect = document.getElementById('province-select');
  const oldUnitSelect = document.getElementById('old-unit-select');
  const findBtn = document.getElementById('find-btn');

  // Khi chọn tỉnh, cập nhật dropdown xã/phường cũ
  provinceSelect.addEventListener('change', () => {
    const selectedProvince = provinceSelect.value;
    updateOldUnitSelect(selectedProvince);
    // Reset khung bản đồ khi thay đổi tỉnh
    updateMapDisplay(null);
  });

  // Khi chọn xã/phường cũ, kích hoạt nút tìm nếu có giá trị
  oldUnitSelect.addEventListener('change', () => {
    findBtn.disabled = (oldUnitSelect.value === '');
  });

  // Khi nhấn nút tìm kết quả
  findBtn.addEventListener('click', handleFindResult);
}

// Hàm khởi tạo: load dữ liệu và cấu hình form
async function init() {
  try {
    // Load dữ liệu cũ và mới song song
    const [oldData, newData] = await Promise.all([
      loadJSON('data/satnhap_old_data.json'),
      loadJSON('data/satnhap_new_data.json')
    ]);

    oldDataGlobal = oldData;
    newDataGlobal = newData;

    // Điền danh sách tỉnh vào dropdown
    populateProvinceSelect(oldDataGlobal);
    // Setup các sự kiện cho form
    setupEvents();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error);
  }
}

// Chạy khi trang được load xong
window.addEventListener('DOMContentLoaded', init);
