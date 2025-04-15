// Mảng lưu danh sách nhân viên
let people = [];

// Tham chiếu DOM
const fullnameEl = document.getElementById("fullname");
const departmentEl = document.getElementById("department");
const maxDaysEl = document.getElementById("maxDays");
const addPersonBtn = document.getElementById("addPersonBtn");
const peopleListEl = document.getElementById("peopleList");
const assignScheduleBtn = document.getElementById("assignScheduleBtn");
const scheduleResultEl = document.getElementById("scheduleResult");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// Thêm nhân viên
addPersonBtn.addEventListener("click", () => {
  const name = fullnameEl.value.trim();
  const dept = departmentEl.value.trim();
  const maxDays = parseInt(maxDaysEl.value);

  if (name && dept && !isNaN(maxDays) && maxDays > 0) {
    // Tạo đối tượng nhân viên, thêm thuộc tính số ngày đã làm
    const person = { id: Date.now(), name, department: dept, maxDays, daysWorked: 0 };
    people.push(person);
    renderPeopleList();
    // Reset input
    fullnameEl.value = "";
    departmentEl.value = "";
    maxDaysEl.value = "";
  } else {
    alert("Vui lòng nhập đầy đủ thông tin hợp lệ!");
  }
});

// Hiển thị danh sách nhân viên
function renderPeopleList() {
  peopleListEl.innerHTML = "";
  people.forEach(person => {
    const li = document.createElement("li");
    li.textContent = `${person.name} - ${person.department} - Số ngày tối đa: ${person.maxDays}`;
    
    // Nút xoá
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Xoá";
    deleteBtn.addEventListener("click", () => {
      people = people.filter(p => p.id !== person.id);
      renderPeopleList();
    });
    li.appendChild(deleteBtn);
    peopleListEl.appendChild(li);
  });
}

// Hàm phân công ca trực theo ngày từ thứ 2 đến thứ 6
// Với mỗi phòng ban, mỗi ngày có 1 người được giao ca theo logic ban đầu.
// Sau khi phân công xong, nếu vẫn còn nhân viên chưa có lượt trực (daysWorked == 0)
// thì những người này sẽ được "vòng lại" (thêm vào ca trực của ngày thứ 2) của phòng ban đó.
function assignSchedule() {
  // Nhóm nhân viên theo phòng ban (clone đối tượng để không làm thay đổi dữ liệu gốc)
  const departments = {};
  people.forEach(person => {
    if (!departments[person.department]) {
      departments[person.department] = [];
    }
    departments[person.department].push({ ...person });
  });

  const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
  const schedule = {};

  // Vòng phân công ban đầu: mỗi ngày, mỗi phòng ban có 1 ca trực
  weekdays.forEach(day => {
    schedule[day] = {};
    for (let dept in departments) {
      let chosen = null;
      const candidates = departments[dept];

      // Nếu không phải ngày thứ 2, kiểm tra xem người trực ngày hôm trước (nếu có) có thể tiếp tục không
      if (day !== "Thứ 2") {
        const prevDayIndex = weekdays.indexOf(day) - 1;
        const prevDay = weekdays[prevDayIndex];
        if (schedule[prevDay][dept] && schedule[prevDay][dept].length > 0) {
          // Lấy người trực ngày hôm trước của phòng ban
          const prevAssigned = schedule[prevDay][dept][0];
          // Nếu người đó còn đủ số ngày trực, tìm trong danh sách ứng viên
          chosen = candidates.find(c => c.id === prevAssigned.id && c.daysWorked < c.maxDays);
          if (chosen) {
            chosen.daysWorked++;
          }
        }
      }
      // Nếu không có người tiếp tục, duyệt từ đầu danh sách
      if (!chosen) {
        for (let candidate of candidates) {
          if (candidate.daysWorked < candidate.maxDays) {
            chosen = candidate;
            candidate.daysWorked++;
            break;
          }
        }
      }
      // Ghi nhận kết quả ca trực (lưu dưới dạng mảng)
      if (chosen) {
        schedule[day][dept] = [chosen];
      } else {
        schedule[day][dept] = [{ name: "Không đủ nhân sự", department: dept }];
      }
    }
  });

  // Sau khi phân công ban đầu, kiểm tra từng phòng ban xem có nhân viên nào chưa được phân công (daysWorked == 0)
  // Nếu có, thêm các nhân viên đó vào ca trực của ngày thứ 2 của cùng phòng ban.
  for (let dept in departments) {
    const extraCandidates = departments[dept].filter(c => c.daysWorked === 0);
    if (extraCandidates.length > 0) {
      // Nếu chưa có ca trực trong ngày thứ 2 của phòng ban này thì khởi tạo mảng
      if (!schedule["Thứ 2"][dept]) {
        schedule["Thứ 2"][dept] = [];
      }
      extraCandidates.forEach(c => {
        // Cập nhật số ngày làm vì được bổ sung ca trực
        c.daysWorked++;
        schedule["Thứ 2"][dept].push(c);
      });
    }
  }

  return schedule;
}

// Xử lý nút phân công
assignScheduleBtn.addEventListener("click", () => {
  // Reset số ngày đã làm của tất cả nhân viên trước khi phân công
  people.forEach(person => person.daysWorked = 0);
  const schedule = assignSchedule();
  renderSchedule(schedule);
});

// Hiển thị bảng ca trực, nhóm theo ngày (xử lý mảng các ca trực cho từng phòng ban)
function renderSchedule(schedule) {
  let html = "<h2>Kết quả phân công ca trực</h2>";

  // Duyệt qua từng ngày trong lịch trực
  for (let day in schedule) {
    html += `<h3>${day}</h3>`;
    html += "<table border='1' style='width:100%; text-align:center; border-collapse: collapse; margin-bottom: 20px;'>";
    html += "<tr><th>Nhân viên</th><th>Phòng ban</th></tr>";

    // Với mỗi phòng ban trong ngày đó
    for (let dept in schedule[day]) {
      // Vì có thể có nhiều nhân viên được giao ca trong cùng 1 phòng ban của 1 ngày
      schedule[day][dept].forEach(person => {
        html += `<tr>
          <td>${person.name}</td>
          <td>${dept}</td>
        </tr>`;
      });
    }
    html += "</table>";
  }
  scheduleResultEl.innerHTML = html;
}

// Xuất file Excel sử dụng SheetJS với cấu trúc: Ngày, Nhân viên, Phòng ban
exportExcelBtn.addEventListener("click", () => {
  const schedule = assignSchedule();
  const data = [];
  data.push(["Ngày", "Nhân viên", "Phòng ban"]);

  for (let day in schedule) {
    for (let dept in schedule[day]) {
      schedule[day][dept].forEach(person => {
        data.push([day, person.name, dept]);
      });
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ca trực");

  XLSX.writeFile(wb, "PhanCongCaTruc.xlsx");
});
