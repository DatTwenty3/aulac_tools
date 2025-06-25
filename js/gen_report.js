// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    PDF_PAGE_SIZE: [595.28, 841.89],
    FONTS: {
        TITLE: PDFLib.StandardFonts.HelveticaBold,
        BODY: PDFLib.StandardFonts.Helvetica
    },
    FONT_SIZES: {
        TITLE: 32,
        SUBTITLE: 16,
        BODY: 12,
        SMALL: 10
    },
    COLORS: {
        PRIMARY: '#007bff',
        SUCCESS: '#28a745',
        ERROR: '#dc3545',
        WARNING: '#ffc107'
    },
    MESSAGES: {
        NO_PROJECTS: 'Vui lòng thêm ít nhất một công trình!',
        NO_CONTENT: 'Không có nội dung nào được chọn để tạo báo cáo!',
        SUCCESS: 'Báo cáo PDF đã được tạo và tải xuống thành công!',
        GENERATING: 'Đang tạo báo cáo...',
        GENERATE_BTN: '📄 Tạo Báo cáo PDF'
    }
};

// ========================================
// CONSTRUCTION ITEMS DATA
// ========================================
const CONSTRUCTION_ITEMS = [
    { key: 'cau', name: '🌉 Cầu', file: 'data/cau.pdf' },
    { key: 'duong', name: '🛣️ Đường', file: 'data/duong.pdf' },
    { key: 'conghop', name: '🕳️ Cống hộp ngang đường', file: 'data/cong_hop_ngang_duong.pdf' },
    { key: 'congtron', name: '🕳️ Cống tròn ngang đường', file: 'data/cong_tron_ngang_duong.pdf' },
    { key: 'dien_nuoc', name: '⚡💧 Điện nước', file: 'data/dien_nuoc.pdf' },
    { key: 'httn_doc', name: '💧 Hệ thống thoát nước dọc', file: 'data/httn_doc.pdf' }
];

// ========================================
// UTILITY FUNCTIONS
// ========================================
class Utils {
    /**
     * Loại bỏ dấu tiếng Việt và emoji/ký tự ngoài ASCII
     */
    static removeVietnameseTones(str) {
        if (!str) return '';
        
        const vietnameseMap = {
            'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
            'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
            'ì|í|ị|ỉ|ĩ': 'i',
            'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
            'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
            'ỳ|ý|ỵ|ỷ|ỹ': 'y',
            'đ': 'd',
            'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'A',
            'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'E',
            'Ì|Í|Ị|Ỉ|Ĩ': 'I',
            'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'O',
            'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'U',
            'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'Y',
            'Đ': 'D'
        };

        let result = str;
        
        // Thay thế các ký tự tiếng Việt
        Object.entries(vietnameseMap).forEach(([pattern, replacement]) => {
            result = result.replace(new RegExp(pattern, 'g'), replacement);
        });

        // Loại bỏ dấu kết hợp
        result = result.replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '');
        result = result.replace(/[\u02C6\u0306\u031B]/g, '');
        
        // Loại bỏ emoji và ký tự ngoài ASCII
        result = result.replace(/[^\x00-\x7F]/g, '');
        
        return result;
    }

    /**
     * Tạo tên file download với timestamp
     */
    static generateFileName() {
        const date = new Date().toISOString().split('T')[0];
        return `Bao_cao_cong_trinh_${date}.pdf`;
    }

    /**
     * Tải xuống file PDF
     */
    static downloadPDF(pdfBytes, fileName) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ========================================
// FILE MANAGER
// ========================================
class FileManager {
    constructor() {
        this.availableFiles = {};
    }

    /**
     * Kiểm tra và khởi tạo danh sách file có sẵn
     */
    async initializeFiles() {
        const promises = CONSTRUCTION_ITEMS.map(async (item) => {
            try {
                const response = await fetch(item.file);
                this.availableFiles[item.key] = {
                    name: item.name,
                    path: item.file,
                    exists: response.ok
                };
            } catch (error) {
                this.availableFiles[item.key] = {
                    name: item.name,
                    path: item.file,
                    exists: false
                };
            }
        });

        await Promise.all(promises);
    }

    /**
     * Kiểm tra file có tồn tại không
     */
    isFileAvailable(key) {
        return this.availableFiles[key]?.exists || false;
    }

    /**
     * Lấy thông tin file
     */
    getFileInfo(key) {
        return this.availableFiles[key] || null;
    }
}

// ========================================
// PROJECT MANAGER
// ========================================
class ProjectManager {
    constructor() {
        this.container = document.getElementById('projectsContainer');
    }

    /**
     * Thêm project mới
     */
    addProject() {
        const projects = this.getAllProjects();
        const newIndex = projects.length + 1;
        
        const projectHTML = this.createProjectHTML(newIndex);
        const projectDiv = document.createElement('div');
        projectDiv.innerHTML = projectHTML;
        projectDiv.firstElementChild.className = 'project-section';
        projectDiv.firstElementChild.id = `project-${newIndex}`;
        
        this.container.appendChild(projectDiv.firstElementChild);
        this.updateProjectNumbers();
    }

    /**
     * Tạo HTML cho project
     */
    createProjectHTML(index) {
        const itemsHTML = CONSTRUCTION_ITEMS.map(item => `
            <div class="item-checkbox" onclick="projectManager.toggleItem(this)">
                <input type="checkbox" id="${item.key}-${index}" name="items-${index}" value="${item.key}">
                <label for="${item.key}-${index}">${item.name}</label>
            </div>
        `).join('');

        return `
            <div class="project-header">
                <div class="project-title">Công trình ${index}</div>
                <button class="remove-btn" onclick="projectManager.removeProjectByElement(this)">
                    🗑️ Xóa
                </button>
            </div>
            <input type="text" class="project-name-input" placeholder="Nhập tên công trình..." id="projectName-${index}">
            <div class="items-grid">
                ${itemsHTML}
            </div>
        `;
    }

    /**
     * Xóa project theo element
     */
    removeProjectByElement(btn) {
        const project = btn.closest('.project-section');
        if (project) {
            project.remove();
            this.updateProjectNumbers();
        }
    }

    /**
     * Xóa project theo ID
     */
    removeProject(id) {
        const project = document.getElementById(`project-${id}`);
        if (project) {
            project.remove();
            this.updateProjectNumbers();
        }
    }

    /**
     * Toggle checkbox item
     */
    toggleItem(element) {
        const checkbox = element.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        element.classList.toggle('checked', checkbox.checked);
    }

    /**
     * Cập nhật số thứ tự project
     */
    updateProjectNumbers() {
        const projects = this.getAllProjects();
        projects.forEach((project, idx) => {
            const title = project.querySelector('.project-title');
            if (title) title.textContent = `Công trình ${idx + 1}`;
            
            const nameInput = project.querySelector('.project-name-input');
            if (nameInput) nameInput.id = `projectName-${idx + 1}`;
            
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

    /**
     * Lấy tất cả projects
     */
    getAllProjects() {
        return document.querySelectorAll('.project-section');
    }

    /**
     * Lấy dữ liệu projects để tạo báo cáo
     */
    getProjectsData() {
        const projects = this.getAllProjects();
        return Array.from(projects).map(project => {
            const projectId = project.id.split('-')[1];
            const projectName = document.getElementById(`projectName-${projectId}`).value.trim();
            const checkedItems = project.querySelectorAll('input[type="checkbox"]:checked');
            
            return {
                id: projectId,
                name: projectName,
                items: Array.from(checkedItems).map(item => item.value)
            };
        }).filter(project => project.items.length > 0);
    }
}

// ========================================
// PDF GENERATOR
// ========================================
class PDFGenerator {
    constructor(fileManager) {
        this.fileManager = fileManager;
    }

    /**
     * Tạo báo cáo PDF
     */
    async generateReport() {
        const projectsData = projectManager.getProjectsData();
        
        if (projectsData.length === 0) {
            UI.showStatus(CONFIG.MESSAGES.NO_PROJECTS, 'error');
            return;
        }

        UI.setGeneratingState(true);

        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            let hasContent = false;

            for (const project of projectsData) {
                if (project.name) {
                    await this.addProjectTitlePage(pdfDoc, project.name);
                    hasContent = true;
                }

                for (const itemKey of project.items) {
                    const success = await this.addItemContent(pdfDoc, itemKey, project.name);
                    if (success) hasContent = true;
                }
            }

            if (!hasContent) {
                UI.showStatus(CONFIG.MESSAGES.NO_CONTENT, 'error');
                return;
            }

            const pdfBytes = await pdfDoc.save();
            Utils.downloadPDF(pdfBytes, Utils.generateFileName());
            UI.showStatus(CONFIG.MESSAGES.SUCCESS, 'success');

        } catch (error) {
            console.error('Lỗi khi tạo PDF:', error);
            UI.showStatus(`Lỗi khi tạo PDF: ${error.message}`, 'error');
        } finally {
            UI.setGeneratingState(false);
        }
    }

    /**
     * Thêm nội dung từ file PDF
     */
    async addItemContent(pdfDoc, itemKey, projectName) {
        const fileInfo = this.fileManager.getFileInfo(itemKey);
        
        if (fileInfo && fileInfo.exists) {
            return await this.addExistingPDFContent(pdfDoc, fileInfo);
        } else {
            return await this.addPlaceholderContent(pdfDoc, itemKey, projectName, fileInfo);
        }
    }

    /**
     * Thêm nội dung từ file PDF có sẵn
     */
    async addExistingPDFContent(pdfDoc, fileInfo) {
        try {
            const response = await fetch(fileInfo.path);
            if (response.ok) {
                const existingPdfBytes = await response.arrayBuffer();
                const existingPdf = await PDFLib.PDFDocument.load(existingPdfBytes);
                const copiedPages = await pdfDoc.copyPages(existingPdf, existingPdf.getPageIndices());
                copiedPages.forEach((page) => pdfDoc.addPage(page));
                return true;
            }
        } catch (error) {
            console.error(`Lỗi khi xử lý file ${fileInfo.path}:`, error);
        }
        return false;
    }

    /**
     * Thêm trang placeholder khi không có file
     */
    async addPlaceholderContent(pdfDoc, itemKey, projectName, fileInfo) {
        const page = pdfDoc.addPage(CONFIG.PDF_PAGE_SIZE);
        const font = await pdfDoc.embedFont(CONFIG.FONTS.BODY);
        
        const itemName = fileInfo ? fileInfo.name : itemKey;
        const cleanItemName = Utils.removeVietnameseTones(itemName);
        const cleanProjectName = Utils.removeVietnameseTones(projectName);
        
        page.drawText(`HANG MUC: ${cleanItemName}`, {
            x: 50,
            y: 750,
            size: CONFIG.FONT_SIZES.SUBTITLE,
            font: font,
        });
        
        page.drawText(`Cong trinh: ${cleanProjectName}`, {
            x: 50,
            y: 720,
            size: CONFIG.FONT_SIZES.BODY,
        });
        
        if (fileInfo) {
            page.drawText(`Loi: Khong the tai file ${fileInfo.path}`, {
                x: 50,
                y: 680,
                size: CONFIG.FONT_SIZES.BODY,
            });
            
            page.drawText(`[File PDF mau khong ton tai hoac khong the truy cap]`, {
                x: 50,
                y: 650,
                size: CONFIG.FONT_SIZES.SMALL,
            });
        } else {
            page.drawText(`[File PDF mau: ${itemKey}.pdf chua co san]`, {
                x: 50,
                y: 680,
                size: CONFIG.FONT_SIZES.BODY,
            });
            
            page.drawText(`Vui long dat file ${itemKey}.pdf vao thu muc data/`, {
                x: 50,
                y: 650,
                size: CONFIG.FONT_SIZES.SMALL,
            });
        }
        
        return true;
    }

    /**
     * Tạo trang tiêu đề cho project
     */
    async addProjectTitlePage(pdfDoc, projectName) {
        const [pageWidth, pageHeight] = CONFIG.PDF_PAGE_SIZE;
        const fontSize = CONFIG.FONT_SIZES.TITLE;
        const font = await pdfDoc.embedFont(CONFIG.FONTS.TITLE);
        
        const text = Utils.removeVietnameseTones(projectName.toUpperCase());
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        
        const x = (pageWidth - textWidth) / 2;
        const y = (pageHeight - textHeight) / 2;
        
        const page = pdfDoc.addPage(CONFIG.PDF_PAGE_SIZE);
        page.drawText(text, {
            x: x,
            y: y,
            size: fontSize,
            font: font,
        });
    }
}

// ========================================
// UI MANAGER
// ========================================
class UI {
    /**
     * Hiển thị thông báo trạng thái
     */
    static showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }

    /**
     * Thiết lập trạng thái đang tạo báo cáo
     */
    static setGeneratingState(isGenerating) {
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = isGenerating;
        generateBtn.innerHTML = isGenerating 
            ? `<div class="loading"></div> ${CONFIG.MESSAGES.GENERATING}`
            : CONFIG.MESSAGES.GENERATE_BTN;
    }
}

// ========================================
// GLOBAL INSTANCES
// ========================================
const fileManager = new FileManager();
const projectManager = new ProjectManager();
const pdfGenerator = new PDFGenerator(fileManager);

// ========================================
// GLOBAL FUNCTIONS (for HTML onclick)
// ========================================
window.addProject = () => projectManager.addProject();
window.removeProjectByElement = (btn) => projectManager.removeProjectByElement(btn);
window.removeProject = (id) => projectManager.removeProject(id);
window.toggleItem = (element) => projectManager.toggleItem(element);
window.generateReport = () => pdfGenerator.generateReport();

// ========================================
// INITIALIZATION
// ========================================
async function initialize() {
    await fileManager.initializeFiles();
    projectManager.addProject(); // Tạo project đầu tiên
    projectManager.updateProjectNumbers();
}

// Khởi tạo khi trang load xong
document.addEventListener('DOMContentLoaded', initialize); 