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

/**
 * Hàm phân công ca trực:
 * - Vòng 1: Phân công ban đầu cho mỗi ngày (thứ 2 - thứ 6) theo phòng ban dựa trên nguyên tắc ưu tiên người đang trực ngày hôm trước nếu còn khả năng,
 *   hoặc chọn ứng viên đầu tiên chưa đủ số ngày trực.
 * - Vòng 2: Phân công thêm theo thứ tự ngược từ thứ 6 đến thứ 2, ưu tiên phân công vào ngày mà ứng viên chưa được phân công.
 * 
 * Trả về một đối tượng chứa:
 *    - schedule: Đối tượng lịch trình dạng { day: { dept: [list of assignments] } }
 *    - weekdays: Mảng các ngày làm việc.
 */
function assignSchedule() {
  // Nhóm nhân viên theo phòng ban, clone đối tượng để xử lý thuộc tính daysWorked mà không ảnh hưởng đến mảng people gốc
  const departments = {};
  people.forEach(person => {
    if (!departments[person.department]) {
      departments[person.department] = [];
    }
    departments[person.department].push({ ...person });
  });

  // Danh sách ngày làm việc từ thứ 2 đến thứ 6
  const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
  // schedule: { day: { department: [list of ca trực] } }
  const schedule = {};

  // --- Vòng 1: Phân công ban đầu ---
  weekdays.forEach(day => {
    schedule[day] = {};
    // Với mỗi phòng ban
    for (let dept in departments) {
      let chosen = null;
      const candidates = departments[dept];

      // Nếu không phải thứ 2: ưu tiên giữ ca từ ngày hôm trước nếu ứng viên đó còn khả năng trực
      if (day !== "Thứ 2") {
        const prevDayIndex = weekdays.indexOf(day) - 1;
        const prevDay = weekdays[prevDayIndex];
        if (schedule[prevDay][dept] && schedule[prevDay][dept].length > 0) {
          const prevAssigned = schedule[prevDay][dept][0]; // Ca chính của ngày hôm trước
          if (prevAssigned.daysWorked < prevAssigned.maxDays) {
            chosen = candidates.find(c => c.id === prevAssigned.id);
            if (chosen) {
              chosen.daysWorked++;
            }
          }
        }
      }
      // Nếu không có ứng viên tiếp tục từ hôm trước, chọn ứng viên đầu tiên có thể trực
      if (!chosen) {
        for (let candidate of candidates) {
          if (candidate.daysWorked < candidate.maxDays) {
            chosen = candidate;
            candidate.daysWorked++;
            break;
          }
        }
      }
      // Ghi nhận ca trực ban đầu cho phòng ban tại ngày đó
      if (chosen) {
        schedule[day][dept] = [chosen];
      } else {
        schedule[day][dept] = [{ name: "Không đủ nhân sự", department: dept }];
      }
    }
  });

  // --- Vòng 2: Phân công "ngược lại" từ thứ 6 đến thứ 2 ---
  weekdays.slice().reverse().forEach(day => {
    for (let dept in departments) {
      // Lấy danh sách các ca đã phân công trong ngày cho phòng ban đó
      const alreadyAssignedIds = schedule[day][dept].map(p => p.id);
      // Tìm ứng viên còn khả năng trực và chưa được phân công ở ngày này
      const candidate = departments[dept].find(c => c.daysWorked < c.maxDays && !alreadyAssignedIds.includes(c.id));
      if (candidate) {
        // Tìm ngày sớm nhất chưa được phân công từ thứ 6 trở về thứ 2
        for (let i = weekdays.length - 1; i >= 0; i--) {
          const targetDay = weekdays[i];
          const targetAssignedIds = schedule[targetDay][dept].map(p => p.id);
          if (!targetAssignedIds.includes(candidate.id) && candidate.daysWorked < candidate.maxDays) {
            candidate.daysWorked++;
            schedule[targetDay][dept].push(candidate);
            break; // Chỉ phân công vào một ngày, sau đó thoát vòng lặp
          }
        }
      }
    }
  });

  return { schedule, weekdays };
}

// Xử lý nút phân công
assignScheduleBtn.addEventListener("click", () => {
  // Reset số ngày đã làm của tất cả nhân viên để đảm bảo thuật toán chạy đúng từ đầu
  people.forEach(person => person.daysWorked = 0);
  const result = assignSchedule();
  renderSchedule(result);
});

// Hiển thị bảng ca trực, nhóm theo ngày và hiển thị theo thứ tự cột Nhân viên - Phòng ban
function renderSchedule(result) {
  const { schedule, weekdays } = result;
  let html = "<h2>Kết quả phân công ca trực</h2>";
  
  weekdays.forEach(day => {
    html += `<h3>${day}</h3>`;
    html += "<table border='1' style='width:100%; text-align:center; border-collapse: collapse; margin-bottom: 20px;'>";
    html += "<tr><th>Nhân viên</th><th>Phòng ban</th></tr>";
    // Với mỗi phòng ban trong ngày đó, hiển thị tất cả các ca (ca chính và ca phụ)
    for (let dept in schedule[day]) {
      schedule[day][dept].forEach(assignment => {
        html += `<tr>
                    <td>${assignment.name}</td>
                    <td>${dept}</td>
                 </tr>`;
      });
    }
    html += "</table>";
  });
  
  scheduleResultEl.innerHTML = html;
}

// Xuất file Excel sử dụng SheetJS với cấu trúc: cột "Ngày", "Nhân viên", "Phòng ban"
exportExcelBtn.addEventListener("click", () => {
  const result = assignSchedule();
  const { schedule, weekdays } = result;
  const data = [];
  data.push(["Ngày", "Nhân viên", "Phòng ban"]);

  weekdays.forEach(day => {
    for (let dept in schedule[day]) {
      schedule[day][dept].forEach(assignment => {
        data.push([day, assignment.name, dept]);
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ca trực");

  XLSX.writeFile(wb, "PhanCongCaTruc.xlsx");
});