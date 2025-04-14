// script.js

let oldDataGlobal = {}; // Lưu dữ liệu phường/xã cũ từ oldData.json
let newDataGlobal = {}; // Lưu dữ liệu phường/xã mới từ newData.json

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

      districtData[districtName].forEach(unitName => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ name: unitName });
        option.textContent = unitName;
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

// Xử lý khi nhấn nút tìm kết quả
function handleFindResult() {
  const oldUnitSelect = document.getElementById('old-unit-select');
  const selectedValue = oldUnitSelect.value;
  const resultDisplay = document.getElementById('result-display');

  if (selectedValue) {
    const oldUnit = JSON.parse(selectedValue); // Chuyển chuỗi JSON thành object
    const newWard = findNewWardForOldUnit(oldUnit);
    if (newWard) {
      resultDisplay.innerHTML = `
        <p><strong>Xã/Phường cũ:</strong> ${oldUnit.name}</p>
        <p><strong>Xã/Phường mới:</strong> ${newWard}</p>
      `;
    } else {
      resultDisplay.innerHTML = `<p>Không tìm thấy phường mới tương ứng !!!</p>`;
    }
  } else {
    resultDisplay.innerHTML = `<p>Vui lòng chọn xã/phường cũ.</p>`;
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
