// Bảng mapping từ tên tiếng Việt sang index key
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

// Template paths
const TEMPLATE_PATHS = {
    "template_3_1_1": "data/template_3_1_1.docx",
    "template_3_1_2": "data/template_3_1_2.docx"
};

let jsonData = null;
let wordFile = null;
let selectedTemplate = null;
let processedWordContent = null;
let convertedData = null;
let currentJsonOption = 'paste';
let currentTemplateOption = 'predefined';

// Xử lý chuyển đổi giữa các option JSON
function showJsonOption(option) {
    // Cập nhật button
    document.querySelectorAll('.json-input-options .option-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Cập nhật hiển thị
    document.querySelectorAll('.json-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    if (option === 'paste') {
        document.getElementById('jsonPasteOption').classList.add('active');
        currentJsonOption = 'paste';
    } else {
        document.getElementById('jsonFileOption').classList.add('active');
        currentJsonOption = 'file';
    }

    // Reset dữ liệu khi chuyển đổi
    jsonData = null;
    convertedData = null;
    checkReadyToProcess();
}

// Xử lý chuyển đổi giữa các option Template
function showTemplateOption(option) {
    // Cập nhật button
    document.querySelectorAll('.template-input-options .option-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Cập nhật hiển thị
    document.querySelectorAll('.template-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    if (option === 'predefined') {
        document.getElementById('templatePredefinedOption').classList.add('active');
        currentTemplateOption = 'predefined';
    } else {
        document.getElementById('templateUploadOption').classList.add('active');
        currentTemplateOption = 'upload';
    }

    // Reset dữ liệu khi chuyển đổi
    wordFile = null;
    selectedTemplate = null;
    document.getElementById('templateSelect').value = '';
    document.getElementById('templateInfo').classList.remove('show');
    document.getElementById('wordFileInfo').classList.remove('show');
    checkReadyToProcess();
}

// Xử lý textarea JSON
document.getElementById('jsonTextarea').addEventListener('input', function(e) {
    const content = e.target.value.trim();
    if (content && currentJsonOption === 'paste') {
        try {
            jsonData = JSON.parse(content);
            convertedData = convertJsonKeys(jsonData);
            checkReadyToProcess();
        } catch (error) {
            jsonData = null;
            convertedData = null;
            checkReadyToProcess();
        }
    } else {
        jsonData = null;
        convertedData = null;
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
                jsonData = JSON.parse(e.target.result);
                convertedData = convertJsonKeys(jsonData);
                showFileInfo('jsonFileInfo', file.name, file.size);
                checkReadyToProcess();
            } catch (error) {
                showStatus('error', 'File JSON không hợp lệ: ' + error.message);
                jsonData = null;
                convertedData = null;
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
        selectedTemplate = templateKey;
        const templateName = e.target.options[e.target.selectedIndex].text;
        showTemplateInfo(templateName);
        checkReadyToProcess();
    } else {
        selectedTemplate = null;
        document.getElementById('templateInfo').classList.remove('show');
        checkReadyToProcess();
    }
});

// Xử lý file Word upload
document.getElementById('wordFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        wordFile = file;
        showFileInfo('wordFileInfo', file.name, file.size);
        checkReadyToProcess();
    }
});

// Xử lý button
document.getElementById('processButton').addEventListener('click', processFiles);
document.getElementById('downloadButton').addEventListener('click', downloadFile);
document.getElementById('getPromptButton').addEventListener('click', getNotebookLMPrompt);

function showPromptStatus(type, message) {
    const promptStatus = document.getElementById('promptStatus');
    promptStatus.className = `status ${type}`;
    promptStatus.textContent = message;
    promptStatus.style.display = 'block';

    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
        promptStatus.style.display = 'none';
    }, 3000);
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
            // Nếu không tìm thấy mapping, giữ nguyên key gốc
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

function checkReadyToProcess() {
    const button = document.getElementById('processButton');
    const hasJsonData = jsonData && convertedData;
    const hasTemplate = (currentTemplateOption === 'predefined' && selectedTemplate) || 
                      (currentTemplateOption === 'upload' && wordFile);
    
    button.disabled = !(hasJsonData && hasTemplate);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

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
    if (!convertedData) {
        showStatus('error', 'Vui lòng nhập dữ liệu JSON!');
        return;
    }

    if (currentTemplateOption === 'predefined' && !selectedTemplate) {
        showStatus('error', 'Vui lòng chọn template!');
        return;
    }

    if (currentTemplateOption === 'upload' && !wordFile) {
        showStatus('error', 'Vui lòng chọn file Word!');
        return;
    }

    showLoading(true);
    document.getElementById('status').style.display = 'none';

    try {
        let arrayBuffer;

        // Lấy file Word tùy theo option được chọn
        if (currentTemplateOption === 'predefined') {
            arrayBuffer = await loadTemplateFile(selectedTemplate);
        } else {
            arrayBuffer = await wordFile.arrayBuffer();
        }
        
        // Sử dụng JSZip để xử lý file docx
        const zip = new JSZip();
        const docx = await zip.loadAsync(arrayBuffer);
        
        // Đọc document.xml - nơi chứa nội dung chính
        const documentXml = await docx.file('word/document.xml').async('string');
        
        // Thay thế các key trong XML
        let processedXml = documentXml;
        let replacementCount = 0;

        for (const [key, value] of Object.entries(convertedData.data)) {
            const patterns = [
                `{${key}}`,  // Ưu tiên pattern {KEY}
                `[${key}]`,  // Pattern [KEY]
                `{{${key}}}`, // Pattern {{KEY}}
                key          // Key trực tiếp
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

        // Cập nhật file XML trong zip
        docx.file('word/document.xml', processedXml);

        // Tạo file Word mới
        processedWordContent = await docx.generateAsync({type: 'blob'});

        showLoading(false);
        showStatus('success', '✅ Hoàn thành chuyển đổi, ĐÃ TẢI VỀ FILE WORD!');
        downloadFile();

    } catch (error) {
        showLoading(false);
        showStatus('error', 'Lỗi xử lý file: ' + error.message);
        console.error('Error:', error);
    }
}

function downloadFile() {
    if (!processedWordContent) {
        showStatus('error', 'Không có file để tải về!');
        return;
    }

    const url = URL.createObjectURL(processedWordContent);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_document.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 