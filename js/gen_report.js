let projectCounter = 0;
let availableFiles = {};

const constructionItems = [
    { key: 'cau', name: '🌉 Cầu', file: 'data/cau.pdf' },
    { key: 'duong', name: '🛣️ Đường', file: 'data/duong.pdf' },
    { key: 'cong', name: '🕳️ Cống', file: 'data/cong.pdf' },
    { key: 'tuong', name: '🧱 Tường', file: 'data/tuong.pdf' },
    { key: 'nha', name: '🏠 Nhà', file: 'data/nha.pdf' },
    { key: 'san', name: '🏟️ Sân', file: 'data/san.pdf' },
    { key: 'hang_rao', name: '🚧 Hàng rào', file: 'data/hang_rao.pdf' },
    { key: 'thap', name: '🗼 Tháp', file: 'data/thap.pdf' },
    { key: 'be_tong', name: '🏗️ Bê tông', file: 'data/be_tong.pdf' },
    { key: 'cap_dien', name: '⚡ Cáp điện', file: 'data/cap_dien.pdf' },
    { key: 'nuoc', name: '💧 Hệ thống nước', file: 'data/nuoc.pdf' },
    { key: 'cat_dat', name: '⛏️ Cát đất', file: 'data/cat_dat.pdf' }
];

// Initialize and check available files
async function initializeFiles() {
    for (let item of constructionItems) {
        try {
            const response = await fetch(item.file);
            if (response.ok) {
                availableFiles[item.key] = {
                    name: item.name,
                    path: item.file,
                    exists: true
                };
            } else {
                availableFiles[item.key] = {
                    name: item.name,
                    path: item.file,
                    exists: false
                };
            }
        } catch (error) {
            availableFiles[item.key] = {
                name: item.name,
                path: item.file,
                exists: false
            };
        }
    }
    updateFileList();
}

function updateFileList() {
    // Function kept for compatibility but no longer displays anything
}

function updateProjectNumbers() {
    const projects = document.querySelectorAll('.project-section');
    projects.forEach((project, idx) => {
        const title = project.querySelector('.project-title');
        if (title) title.textContent = `Công trình ${idx + 1}`;
        // Cập nhật id input tên công trình nếu cần
        const nameInput = project.querySelector('.project-name-input');
        if (nameInput) nameInput.id = `projectName-${idx + 1}`;
        // Cập nhật id và for của các checkbox/label
        const checkboxes = project.querySelectorAll('.item-checkbox input[type="checkbox"]');
        const labels = project.querySelectorAll('.item-checkbox label');
        checkboxes.forEach((cb, i) => {
            const itemKey = cb.value;
            cb.id = `${itemKey}-${idx + 1}`;
            if (labels[i]) labels[i].setAttribute('for', `${itemKey}-${idx + 1}`);
        });
        project.id = `project-${idx + 1}`;
    });
}

window.addProject = function addProject() {
    const projects = document.querySelectorAll('.project-section');
    const newIndex = projects.length + 1;
    const projectDiv = document.createElement('div');
    projectDiv.className = 'project-section';
    projectDiv.id = `project-${newIndex}`;
    projectDiv.innerHTML = `
        <div class="project-header">
            <div class="project-title">Công trình ${newIndex}</div>
            <button class="remove-btn" onclick="removeProjectByElement(this)">
                🗑️ Xóa
            </button>
        </div>
        <input type="text" class="project-name-input" placeholder="Nhập tên công trình..." id="projectName-${newIndex}">
        <div class="items-grid">
            ${constructionItems.map(item => `
                <div class="item-checkbox" onclick="toggleItem(this)">
                    <input type="checkbox" id="${item.key}-${newIndex}" name="items-${newIndex}" value="${item.key}">
                    <label for="${item.key}-${newIndex}">${item.name}</label>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('projectsContainer').appendChild(projectDiv);
    updateProjectNumbers();
}

window.removeProjectByElement = function removeProjectByElement(btn) {
    const project = btn.closest('.project-section');
    if (project) {
        project.remove();
        updateProjectNumbers();
    }
}

window.removeProject = function removeProject(id) {
    const project = document.getElementById(`project-${id}`);
    if (project) {
        project.remove();
        updateProjectNumbers();
    }
}

window.toggleItem = function toggleItem(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    element.classList.toggle('checked', checkbox.checked);
}

window.generateReport = async function generateReport() {
    const projects = document.querySelectorAll('.project-section');
    if (projects.length === 0) {
        showStatus('Vui lòng thêm ít nhất một công trình!', 'error');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading"></div> Đang tạo báo cáo...';

    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        let hasContent = false;

        for (let project of projects) {
            const projectId = project.id.split('-')[1];
            const projectName = document.getElementById(`projectName-${projectId}`).value.trim();
            const checkedItems = project.querySelectorAll('input[type="checkbox"]:checked');

            if (checkedItems.length === 0) continue;

            if (projectName) {
                await addProjectTitlePage(pdfDoc, projectName);
                hasContent = true;
            }

            // Add content from PDF files in data folder
            for (let item of checkedItems) {
                const itemKey = item.value;
                
                if (availableFiles[itemKey] && availableFiles[itemKey].exists) {
                    try {
                        const response = await fetch(availableFiles[itemKey].path);
                        if (response.ok) {
                            const existingPdfBytes = await response.arrayBuffer();
                            const existingPdf = await PDFLib.PDFDocument.load(existingPdfBytes);
                            const copiedPages = await pdfDoc.copyPages(existingPdf, existingPdf.getPageIndices());
                            copiedPages.forEach((page) => pdfDoc.addPage(page));
                            hasContent = true;
                        } else {
                            throw new Error(`Không thể tải file ${availableFiles[itemKey].path}`);
                        }
                    } catch (error) {
                        console.error(`Lỗi khi xử lý file ${itemKey}:`, error);
                        // Create a placeholder page if file cannot be loaded
                        const placeholderPage = pdfDoc.addPage([595.28, 841.89]);
                        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                        const itemLabel = item.nextElementSibling.textContent;
                        
                        placeholderPage.drawText(removeVietnameseTones(`HẠNG MỤC: ${itemLabel}`), {
                            x: 50,
                            y: 750,
                            size: 16,
                            font: font,
                        });
                        
                        placeholderPage.drawText(removeVietnameseTones(`Công trình: ${projectName}`), {
                            x: 50,
                            y: 720,
                            size: 12,
                        });
                        
                        placeholderPage.drawText(removeVietnameseTones(`Lỗi: Không thể tải file ${availableFiles[itemKey].path}`), {
                            x: 50,
                            y: 680,
                            size: 12,
                        });
                        
                        placeholderPage.drawText(removeVietnameseTones(`[File PDF mẫu không tồn tại hoặc không thể truy cập]`), {
                            x: 50,
                            y: 650,
                            size: 10,
                        });
                        
                        hasContent = true;
                    }
                } else {
                    // Create a placeholder page if file not available
                    const placeholderPage = pdfDoc.addPage([595.28, 841.89]);
                    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    const itemLabel = item.nextElementSibling.textContent;
                    
                    placeholderPage.drawText(removeVietnameseTones(`HẠNG MỤC: ${itemLabel}`), {
                        x: 50,
                        y: 750,
                        size: 16,
                        font: font,
                    });
                    
                    placeholderPage.drawText(removeVietnameseTones(`Công trình: ${projectName}`), {
                        x: 50,
                        y: 720,
                        size: 12,
                    });
                    
                    placeholderPage.drawText(removeVietnameseTones(`[File PDF mẫu: ${itemKey}.pdf chưa có sẵn]`), {
                        x: 50,
                        y: 680,
                        size: 12,
                    });
                    
                    placeholderPage.drawText(removeVietnameseTones(`Vui lòng đặt file ${itemKey}.pdf vào thư mục data/`), {
                        x: 50,
                        y: 650,
                        size: 10,
                    });
                    
                    hasContent = true;
                }
            }
        }

        if (!hasContent) {
            showStatus('Không có nội dung nào được chọn để tạo báo cáo!', 'error');
            return;
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_cao_cong_trinh_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('Báo cáo PDF đã được tạo và tải xuống thành công!', 'success');

    } catch (error) {
        console.error('Lỗi khi tạo PDF:', error);
        showStatus(`Lỗi khi tạo PDF: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '📄 Tạo Báo cáo PDF';
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 5000);
}

// Hàm loại bỏ dấu tiếng Việt và emoji/ký tự ngoài ASCII
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Remove combining diacritical marks
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    // Loại bỏ emoji và ký tự ngoài ASCII
    str = str.replace(/[^\x00-\x7F]/g, "");
    return str;
}

// Hàm tạo trang tiêu đề PDF chỉ với tên công trình căn giữa
async function addProjectTitlePage(pdfDoc, projectName) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const fontSize = 32;
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const text = removeVietnameseTones(projectName.toUpperCase());
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    const x = (pageWidth - textWidth) / 2;
    const y = (pageHeight - textHeight) / 2;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawText(text, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
    });
}

// Gọi updateProjectNumbers khi trang load xong project đầu tiên
addProject();
updateProjectNumbers();
initializeFiles(); 