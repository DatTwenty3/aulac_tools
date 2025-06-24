// ==== 1. HẰNG SỐ ====
const KEY_MAPPING = {
    "Tên gói thầu": "PKG_NAME",
    "Tên dự án": "PRJ_NAME", 
    "Chủ đầu tư": "OWNER",
    "Nguồn vốn đầu tư": "FUND_SRC",
    "Địa điểm thực hiện dự án": "LOC",
    "Thời gian thực hiện gói thầu": "PKG_TIME",
    "Các văn bản pháp lý gói thầu phê duyệt chủ trương đầu tư": "LEGAL_INVEST",
    "Các văn bản pháp lý gói thầu phê duyệt dự án": "LEGAL_PROJ",
    "Các văn bản pháp lý gói thầu phê duyệt báo cáo nghiên cứu khả thi": "LEGAL_FS",
    "Các văn bản pháp lý gói thầu phê duyệt kế hoạch lựa chọn nhà thầu": "LEGAL_PLAN",
    "Các văn bản pháp lý gói thầu phê duyệt nhiệm vụ khảo sát": "LEGAL_SURVEY",
    "Các văn bản pháp lý gói thầu phê duyệt nhiệm vụ thiết kế": "LEGAL_DESIGN",
    "Công việc chính, khối lượng khảo sát địa hình": "TOPO_JOB",
    "Công việc chính, khối lượng khảo sát địa chất": "GEO_JOB",
    "Mã thông báo mời thầu": "TBMT_CODE",
    "Mã gói thầu": "PKG_CODE",
    "Thời gian thực hiện dự án": "PRJ_TIME",
    "Bên mời thầu": "INVITER",
    "Giá gói thầu": "PKG_PRICE",
    "Hình thức lựa chọn nhà thầu": "SELECT_FORM",
    "Phương thức lựa chọn nhà thầu": "SELECT_METH",
    "Thời gian tổ chức lựa chọn nhà thầu": "SELECT_TIME",
    "Thời gian bắt đầu tổ chức lựa chọn nhà thầu": "START_SELECT",
    "Loại hợp đồng": "CONTRACT_TYPE",
    "Thời điểm đóng thầu": "CLOSE_TIME",
    "Thời điểm mở thầu": "OPEN_TIME"
};

const TEMPLATE_PATHS = {
    "template_3_1_1": "data/template_3_1_1.docx",
    "template_3_1_2": "data/template_3_1_2.docx"
};

// ==== 2. BIẾN TRẠNG THÁI ====
const state = {
    jsonData: null,
    wordFile: null,
    selectedTemplate: null,
    processedWordContent: null,
    convertedData: null,
    currentJsonOption: 'paste',
    currentTemplateOption: 'predefined',
    showInputCheckModal: false
};

// ==== 3. HÀM XỬ LÝ DỮ LIỆU ====
function convertJsonKeys(data) {
    const converted = {};
    const mappingResults = [];
    for (const [vietnameseKey, value] of Object.entries(data)) {
        const indexKey = KEY_MAPPING[vietnameseKey];
        if (indexKey) {
            converted[indexKey] = value;
            mappingResults.push({
                vietnamese: vietnameseKey,
                index: indexKey,
                value: value,
                status: 'mapped'
            });
        } else {
            converted[vietnameseKey] = value;
            mappingResults.push({
                vietnamese: vietnameseKey,
                index: vietnameseKey,
                value: value,
                status: 'unmapped'
            });
        }
    }
    return { data: converted, mapping: mappingResults };
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==== 4. HÀM XỬ LÝ FILE ====
async function loadTemplateFile(templateKey) {
    const templatePath = TEMPLATE_PATHS[templateKey];
    try {
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error(`Không thể tải template: ${response.statusText}`);
        }
        return await response.arrayBuffer();
    } catch (error) {
        throw new Error(`Lỗi tải template từ ${templatePath}: ${error.message}`);
    }
}

async function processFiles() {
    if (!state.convertedData) {
        showStatus('error', 'Vui lòng nhập dữ liệu JSON!');
        return;
    }
    if (state.currentTemplateOption === 'predefined' && !state.selectedTemplate) {
        showStatus('error', 'Vui lòng chọn template!');
        return;
    }
    if (state.currentTemplateOption === 'upload' && !state.wordFile) {
        showStatus('error', 'Vui lòng chọn file Word!');
        return;
    }
    
    // Hiển thị popup kiểm tra thông tin đầu vào
    showInputCheckModal();
}

async function executeProcessing() {
    showLoading(true);
    document.getElementById('status').style.display = 'none';
    try {
        let arrayBuffer;
        if (state.currentTemplateOption === 'predefined') {
            arrayBuffer = await loadTemplateFile(state.selectedTemplate);
        } else {
            arrayBuffer = await state.wordFile.arrayBuffer();
        }
        const zip = new JSZip();
        const docx = await zip.loadAsync(arrayBuffer);
        const documentXml = await docx.file('word/document.xml').async('string');
        let processedXml = documentXml;
        let replacementCount = 0;
        for (const [key, value] of Object.entries(state.convertedData.data)) {
            const patterns = [
                `{${key}}`,
                `[${key}]`,
                `{{${key}}}`,
                key
            ];
            for (const pattern of patterns) {
                if (processedXml.includes(pattern)) {
                    const regex = new RegExp(escapeRegExp(pattern), 'g');
                    const beforeCount = (processedXml.match(regex) || []).length;
                    processedXml = processedXml.replace(regex, String(value));
                    replacementCount += beforeCount;
                }
            }
        }
        docx.file('word/document.xml', processedXml);
        state.processedWordContent = await docx.generateAsync({type: 'blob'});
        showLoading(false);
        showStatus('success', '✅ Hoàn thành chuyển đổi!');
        downloadFile();
    } catch (error) {
        showLoading(false);
        showStatus('error', 'Lỗi xử lý file: ' + error.message);
        console.error('Error:', error);
    }
}

function downloadFile() {
    if (!state.processedWordContent) {
        showStatus('error', 'Không có file để tải về!');
        return;
    }
    const url = URL.createObjectURL(state.processedWordContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_document.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==== 5. HÀM XỬ LÝ UI ====
function showPromptStatus(type, message) {
    const promptStatus = document.getElementById('promptStatus');
    promptStatus.className = `status ${type}`;
    promptStatus.textContent = message;
    promptStatus.style.display = 'block';
    setTimeout(() => {
        promptStatus.style.display = 'none';
    }, 3000);
}

function showInputCheckModal() {
    if (!state.convertedData) return;
    
    // Hiển thị thông tin dự án
    const projectInfo = document.getElementById('projectInfo');
    const projectData = state.convertedData.data;
    let projectHtml = '';
    
    // Hiển thị toàn bộ thông tin từ JSON với tên tiếng Việt chưa ánh xạ
    state.convertedData.mapping.forEach(item => {
        if (item.value) {
            projectHtml += `<div><strong>${item.vietnamese}:</strong> ${item.value}</div>`;
        }
    });
    
    projectInfo.innerHTML = projectHtml || '<em>Không có thông tin dự án</em>';
    
    // Hiển thị thông tin ánh xạ
    const mappingInfo = document.getElementById('mappingInfo');
    let mappingHtml = '';
    let mappedCount = 0;
    let unmappedCount = 0;
    
    state.convertedData.mapping.forEach(item => {
        if (item.status === 'mapped') {
            mappedCount++;
            mappingHtml += `<div style="color: #4caf50;">✅ ${item.vietnamese}</div>`;
        } else {
            unmappedCount++;
            mappingHtml += `<div style="color: #f44336;">❌ ${item.vietnamese} (chưa ánh xạ)</div>`;
        }
    });
    
    mappingHtml = `<div style="margin-bottom: 10px;"><strong>Tổng cộng:</strong> ${mappedCount} đã ánh xạ, ${unmappedCount} chưa ánh xạ</div>` + mappingHtml;
    mappingInfo.innerHTML = mappingHtml;
    
    // Hiển thị modal
    document.getElementById('inputCheckModal').style.display = 'block';
    state.showInputCheckModal = true;
}

function hideInputCheckModal() {
    document.getElementById('inputCheckModal').style.display = 'none';
    state.showInputCheckModal = false;
}

function showFileInfo(elementId, fileName, fileSize) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <strong>📁 ${fileName}</strong><br>
        <small>Kích thước: ${(fileSize / 1024).toFixed(2)} KB</small>
    `;
    element.classList.add('show');
}

function showTemplateInfo(templateName) {
    const element = document.getElementById('templateInfo');
    element.innerHTML = `
        <strong>📋 Đã chọn: ${templateName}</strong>
    `;
    element.classList.add('show');
}

function showStatus(type, message) {
    const status = document.getElementById('status');
    status.className = `status ${type}`;
    status.textContent = message;
    status.style.display = 'block';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function checkReadyToProcess() {
    const button = document.getElementById('processButton');
    const hasJsonData = state.jsonData && state.convertedData;
    const hasTemplate = (state.currentTemplateOption === 'predefined' && state.selectedTemplate) || 
                      (state.currentTemplateOption === 'upload' && state.wordFile);
    button.disabled = !(hasJsonData && hasTemplate);
}

// ==== 6. KHỞI TẠO & GẮN SỰ KIỆN ====
function initEventListeners() {
    // Xử lý chuyển đổi giữa các option JSON
    document.querySelectorAll('.json-input-options .option-button').forEach(btn => {
        btn.addEventListener('click', function(event) {
            document.querySelectorAll('.json-input-options .option-button').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.querySelectorAll('.json-option').forEach(opt => opt.classList.remove('active'));
            if (event.target.dataset.option === 'paste') {
                document.getElementById('jsonPasteOption').classList.add('active');
                state.currentJsonOption = 'paste';
            } else {
                document.getElementById('jsonFileOption').classList.add('active');
                state.currentJsonOption = 'file';
            }
            state.jsonData = null;
            state.convertedData = null;
            checkReadyToProcess();
        });
    });
    // Xử lý chuyển đổi giữa các option Template
    document.querySelectorAll('.template-input-options .option-button').forEach(btn => {
        btn.addEventListener('click', function(event) {
            document.querySelectorAll('.template-input-options .option-button').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('active'));
            if (event.target.dataset.option === 'predefined') {
                document.getElementById('templatePredefinedOption').classList.add('active');
                state.currentTemplateOption = 'predefined';
            } else {
                document.getElementById('templateUploadOption').classList.add('active');
                state.currentTemplateOption = 'upload';
            }
            state.wordFile = null;
            state.selectedTemplate = null;
            document.getElementById('templateSelect').value = '';
            document.getElementById('templateInfo').classList.remove('show');
            document.getElementById('wordFileInfo').classList.remove('show');
            checkReadyToProcess();
        });
    });
    // Xử lý textarea JSON
    document.getElementById('jsonTextarea').addEventListener('input', function(e) {
        const content = e.target.value.trim();
        if (content && state.currentJsonOption === 'paste') {
            try {
                state.jsonData = JSON.parse(content);
                state.convertedData = convertJsonKeys(state.jsonData);
                checkReadyToProcess();
            } catch (error) {
                state.jsonData = null;
                state.convertedData = null;
                checkReadyToProcess();
            }
        } else {
            state.jsonData = null;
            state.convertedData = null;
            checkReadyToProcess();
        }
    });
    // Xử lý file JSON
    document.getElementById('jsonFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    state.jsonData = JSON.parse(e.target.result);
                    state.convertedData = convertJsonKeys(state.jsonData);
                    showFileInfo('jsonFileInfo', file.name, file.size);
                    checkReadyToProcess();
                } catch (error) {
                    showStatus('error', 'File JSON không hợp lệ: ' + error.message);
                    state.jsonData = null;
                    state.convertedData = null;
                    checkReadyToProcess();
                }
            };
            reader.readAsText(file);
        }
    });
    // Xử lý chọn template có sẵn
    document.getElementById('templateSelect').addEventListener('change', function(e) {
        const templateKey = e.target.value;
        if (templateKey) {
            state.selectedTemplate = templateKey;
            const templateName = e.target.options[e.target.selectedIndex].text;
            showTemplateInfo(templateName);
            checkReadyToProcess();
        } else {
            state.selectedTemplate = null;
            document.getElementById('templateInfo').classList.remove('show');
            checkReadyToProcess();
        }
    });
    // Xử lý file Word upload
    document.getElementById('wordFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            state.wordFile = file;
            showFileInfo('wordFileInfo', file.name, file.size);
            checkReadyToProcess();
        }
    });
    // Xử lý button
    document.getElementById('processButton').addEventListener('click', processFiles);
    document.getElementById('getPromptButton').addEventListener('click', getNotebookLMPrompt);
    
    // Xử lý modal
    document.getElementById('closeModal').addEventListener('click', hideInputCheckModal);
    document.getElementById('cancelProcess').addEventListener('click', hideInputCheckModal);
    document.getElementById('confirmProcess').addEventListener('click', function() {
        hideInputCheckModal();
        executeProcessing();
    });
    
    // Đóng modal khi click bên ngoài
    document.getElementById('inputCheckModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideInputCheckModal();
        }
    });
    
    // Đóng modal bằng phím ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && state.showInputCheckModal) {
            hideInputCheckModal();
        }
    });
}

function getNotebookLMPrompt() {
    fetch('data/prompt.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Không tìm thấy file prompt.txt');
            }
            return response.text();
        })
        .then(text => {
            navigator.clipboard.writeText(text).then(() => {
                showPromptStatus('success', '✅ Đã sao chép prompt vào clipboard!');
            }, () => {
                showPromptStatus('error', 'Lỗi: Không thể sao chép vào clipboard.');
            });
        })
        .catch(error => {
            showPromptStatus('error', `Lỗi: ${error.message}`);
            console.error('Error fetching prompt:', error);
        });
}

// Khởi tạo event khi load file
initEventListeners(); 