// Lấy các tham chiếu đến các phần tử DOM
const fileInput = document.getElementById('file-input');
const pdfList = document.getElementById('pdf-list');
const mergeBtn = document.getElementById('merge-btn');

// Mảng để lưu trữ các file PDF được upload
let pdfFiles = [];

// Xử lý sự kiện khi người dùng chọn file
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    // Chỉ xử lý các file PDF
    if (file.type === "application/pdf") {
      pdfFiles.push(file);
      addFileToList(file);
    }
  });
});

// Hàm thêm một card file vào danh sách hiển thị, có background là preview trang đầu tiên của file PDF
function addFileToList(file) {
  // Tạo card container
  const card = document.createElement('div');
  card.classList.add('pdf-card');
  card.setAttribute('data-filename', file.name);

  // Tạo overlay chứa icon và tên file
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');

  const icon = document.createElement('img');
  icon.classList.add('pdf-icon');
  icon.src = "https://img.icons8.com/color/48/000000/pdf.png";
  icon.alt = "PDF Icon";

  const name = document.createElement('div');
  name.classList.add('pdf-name');
  name.textContent = file.name;

  overlay.appendChild(icon);
  overlay.appendChild(name);
  card.appendChild(overlay);
  pdfList.appendChild(card);

  // Tạo URL tạm thời cho file PDF
  const fileURL = URL.createObjectURL(file);

  // Sử dụng PDF.js để render trang đầu tiên của PDF
  pdfjsLib.getDocument(fileURL).promise
    .then(pdf => pdf.getPage(1))
    .then(page => {
      // Thiết lập tỷ lệ để tạo preview (có thể điều chỉnh scale nếu cần)
      const scale = 1;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => canvas.toDataURL());
    })
    .then(dataUrl => {
      // Gán data URL của canvas làm background cho card
      card.style.backgroundImage = `url(${dataUrl})`;
      card.style.backgroundSize = "cover";
      card.style.backgroundPosition = "center";
    })
    .catch(err => {
      console.error("Lỗi tải preview PDF:", err);
    });
}

// Sử dụng SortableJS để kích hoạt chức năng kéo thả sắp xếp
Sortable.create(pdfList, {
  animation: 150,
  onEnd: () => {
    // Sau khi kéo thả, cập nhật lại thứ tự trong mảng pdfFiles theo thứ tự hiển thị
    const newOrder = [];
    const items = pdfList.querySelectorAll('.pdf-card');
    items.forEach(item => {
      const file = pdfFiles.find(f => f.name === item.getAttribute('data-filename'));
      if (file) {
        newOrder.push(file);
      }
    });
    pdfFiles = newOrder;
  }
});

// Hàm ghép các file PDF
mergeBtn.addEventListener('click', async () => {
  if (pdfFiles.length === 0) {
    alert("Vui lòng upload ít nhất 1 file PDF");
    return;
  }

  try {
    // Tạo tài liệu PDF mới dùng pdf-lib
    const mergedPdf = await PDFLib.PDFDocument.create();

    // Duyệt qua từng file theo thứ tự đã sắp xếp
    for (let file of pdfFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // Lưu file PDF mới thành blob và kích hoạt download
    const mergedPdfFile = await mergedPdf.save();
    download(new Blob([mergedPdfFile], { type: 'application/pdf' }), 'AULAC_merged.pdf'); // 🔥 Đổi tên file tải về
  } catch (error) {
    console.error("Lỗi trong quá trình ghép PDF:", error);
  }
});

// Hàm tạo và kích hoạt download cho file blob
function download(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
