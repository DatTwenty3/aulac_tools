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

  if(name && dept && !isNaN(maxDays) && maxDays > 0){
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
// Với mỗi phòng ban, mỗi ngày sẽ có 1 người đảm bảo,
// và nếu một người đã trực ngày hôm trước mà vẫn còn số ngày có thể làm thì ưu tiên cho ngày hôm sau.
function assignSchedule() {
  // Nhóm nhân viên theo phòng ban
  const departments = {};
  people.forEach(person => {
    if(!departments[person.department]){
      departments[person.department] = [];
    }
    // Clone đối tượng để không làm thay đổi gốc khi tính toán
    departments[person.department].push({...person});
  });

  const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
  const schedule = {};

  // Với mỗi ngày
  weekdays.forEach(day => {
    schedule[day] = {};
    // Với mỗi phòng ban
    for (let dept in departments) {
      let chosen = null;
      const candidates = departments[dept];

      // Kiểm tra xem có ai làm ngày hôm trước và vẫn đủ số ngày cho hôm nay
      // Nếu không có, chọn người đầu tiên từ danh sách chưa được giao ca hôm trước.
      if(day !== "Thứ 2"){
        const prevDayIndex = weekdays.indexOf(day) - 1;
        const prevDay = weekdays[prevDayIndex];
        // Nếu người trực ngày hôm trước thuộc phòng ban này vẫn khả dụng, sử dụng lại
        if(schedule[prevDay][dept] && schedule[prevDay][dept].daysWorked < schedule[prevDay][dept].maxDays) {
          // Cập nhật số ngày làm
          chosen = candidates.find(c => c.id === schedule[prevDay][dept].id);
          if(chosen){
            chosen.daysWorked++;
          }
        }
      }
      // Nếu không có người tiếp tục, tìm ứng viên nào chưa được lên ca hôm nay
      if(!chosen){
        for(let candidate of candidates){
          // Nếu chưa đạt số ngày tối đa
          if(candidate.daysWorked < candidate.maxDays){
            chosen = candidate;
            candidate.daysWorked++;
            break;
          }
        }
      }
      // Ghi nhận kết quả ca trực của phòng ban
      if(chosen){
        schedule[day][dept] = chosen;
      } else {
        schedule[day][dept] = { name: "Không đủ nhân sự", department: dept };
      }
    }
  });
  return schedule;
}

// Xử lý nút phân công
assignScheduleBtn.addEventListener("click", () => {
  // Reset số ngày đã làm của tất cả nhân viên trước khi phân công
  people.forEach(person => person.daysWorked = 0);
  const schedule = assignSchedule();
  renderSchedule(schedule);
});

// Hiển thị bảng ca trực, nhóm theo ngày
function renderSchedule(schedule) {
  let html = "<h2>Kết quả phân công ca trực</h2>";
  
  // Duyệt qua từng ngày trong lịch trực
  for (let day in schedule) {
    html += `<h3>${day}</h3>`;
    html += "<table border='1' style='width:100%; text-align:center; border-collapse: collapse; margin-bottom: 20px;'>";
    html += "<tr><th>Nhân viên</th><th>Phòng ban</th></tr>";

    // Với mỗi phòng ban trong ngày đó
    for (let dept in schedule[day]) {
      let person = schedule[day][dept];
      html += `<tr>
        <td>${person.name}</td>
        <td>${dept}</td>
      </tr>`;
    }
    html += "</table>";
  }

  scheduleResultEl.innerHTML = html;
}

// Xuất file Excel sử dụng SheetJS
exportExcelBtn.addEventListener("click", () => {
  const schedule = assignSchedule();
  const data = [];
  data.push(["Ngày", "Nhân viên", "Phòng ban"]);

  for(let day in schedule){
    for(let dept in schedule[day]){
      data.push([day, schedule[day][dept].name, dept]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ca trực");

  XLSX.writeFile(wb, "PhanCongCaTruc.xlsx");
});

