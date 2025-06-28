import subjectsConfig from './subjects_config.js';

// Danh sách lĩnh vực chính và các chủ đề con
const mainTopics = subjectsConfig.map(subject => ({
    name: subject.title,
    subtitle: subject.subtitle,
    icon: subject.icon,
    subTopics: [
        { label: "Pháp luật chung", file: subject.files.law[0] },
        { label: "Pháp luật riêng", file: subject.files.law[1] },
        { label: "Chuyên môn", file: subject.files.specialized[0] }
    ]
}));

let questions = [];
let currentQuestion = null;
let selectedAnswer = null;
let selectedMainTopic = null;
let selectedSubTopics = [];
let stats = {
    total: 0,
    correct: 0,
    wrong: 0
};

let remainingQuestions = [];
let isAllQuestionsMode = false; // Biến theo dõi chế độ hiển thị
let allQuestionsAnswers = {}; // Lưu trữ đáp án đã chọn cho từng câu hỏi

const selectionSection = document.getElementById('selectionSection');
const loadingSection = document.getElementById('loadingSection');
const quizContainer = document.getElementById('quizContainer');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const result = document.getElementById('result');
const selectStyled = document.getElementById('selectStyled');
const selectOptions = document.getElementById('selectOptions');
const startButton = document.getElementById('startButton');
const backButton = document.getElementById('backButton');

// Các biến cho chế độ chuyển đổi
const modeSwitchBtn = document.getElementById('modeSwitchBtn');
const singleQuestionMode = document.getElementById('singleQuestionMode');
const allQuestionsMode = document.getElementById('allQuestionsMode');
const allQuestionsList = document.getElementById('allQuestionsList');
const allQuestionsSearchInput = document.getElementById('allQuestionsSearchInput');
const showAllAnswersBtn = document.getElementById('showAllAnswersBtn');
let isShowAllAnswers = false;

const onlineExamBtn = document.getElementById('onlineExamBtn');
const statsDiv = document.querySelector('.stats');

// Khởi tạo dropdown và events
window.addEventListener('load', initializeDropdown);
submitBtn.addEventListener('click', submitAnswer);
nextBtn.addEventListener('click', nextQuestion);
startButton.addEventListener('click', startQuiz);
backButton.addEventListener('click', backToSelection);
modeSwitchBtn.addEventListener('click', toggleDisplayMode);

// Đóng dropdown khi click bên ngoài
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select')) {
        selectOptions.classList.remove('show');
        selectStyled.classList.remove('active');
    }
});

function initializeDropdown() {
    // Tạo options cho dropdown lĩnh vực chính
    selectOptions.innerHTML = '';
    mainTopics.forEach((topic, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'select-option';
        optionDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="option-icon" style="font-size: 2em; display: flex; align-items: flex-start; font-style: normal;">${topic.icon}</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: #222; font-style: normal;">${topic.name}</span>
                    <span style="font-size: 0.98em; color: #888; font-style: normal;">${topic.subtitle}</span>
                </div>
            </div>
        `;
        optionDiv.addEventListener('click', () => selectMainTopic(topic, index));
        selectOptions.appendChild(optionDiv);
    });

    selectStyled.addEventListener('click', function() {
        selectOptions.classList.toggle('show');
        selectStyled.classList.toggle('active');
    });

    // Di chuyển vùng hiển thị checkbox subtopic lên trên nút bắt đầu
    let checkboxDiv = document.getElementById('subTopicCheckboxes');
    if (!checkboxDiv) {
        checkboxDiv = document.createElement('div');
        checkboxDiv.id = 'subTopicCheckboxes';
        checkboxDiv.style = 'margin-top: 18px; display: none;';
        // Chèn vào đúng vị trí trước startButton
        const dropdownContainer = document.querySelector('.dropdown-container');
        dropdownContainer.insertBefore(checkboxDiv, startButton);
    }
}

function selectMainTopic(topic, index) {
    selectedMainTopic = topic;
    selectedSubTopics = [];
    // Cập nhật hiển thị dropdown
    selectStyled.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span class="option-icon" style="font-size: 2em; display: flex; align-items: flex-start; font-style: normal;">${topic.icon}</span>
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600; color: #222; font-style: normal;">${topic.name}</span>
                <span style="font-size: 0.98em; color: #888; font-style: normal;">${topic.subtitle}</span>
            </div>
        </div>
    `;
    selectOptions.classList.remove('show');
    selectStyled.classList.remove('active');
    // Mô tả ngắn cho từng loại
    const subDesc = [
        'Các quy định chung về xây dựng',
        'Các quy định riêng cho từng lĩnh vực',
        'Kiến thức chuyên môn nghiệp vụ'
    ];
    // Hiển thị checkbox subtopic với icon, tooltip, ripple
    const icons = ['📚', '⚖️', '🛠️'];
    const checkboxDiv = document.getElementById('subTopicCheckboxes');
    checkboxDiv.innerHTML = '<div style="font-weight:600; margin-bottom:8px;">Chọn loại chủ đề:</div>' +
        '<div class="subtopic-row">' +
        topic.subTopics.map((sub, i) => `
            <label>
                <input type="checkbox" class="subtopic-checkbox" value="${sub.file}" data-label="${sub.label}">
                <span class="topic-icon">${icons[i] || '📚'}</span>
                <span>${sub.label}</span>
                <span class="tooltip">${subDesc[i] || ''}</span>
            </label>
        `).join('') + '</div>';
    checkboxDiv.style.display = 'block';
    // Lắng nghe sự kiện tick + hiệu ứng ripple
    checkboxDiv.querySelectorAll('.subtopic-checkbox').forEach(cb => {
        cb.addEventListener('change', function(e) {
            const file = this.value;
            if (this.checked) {
                if (!selectedSubTopics.includes(file)) selectedSubTopics.push(file);
            } else {
                selectedSubTopics = selectedSubTopics.filter(f => f !== file);
            }
            // Enable nút start nếu có ít nhất 1 loại được chọn
            if (selectedSubTopics.length > 0) {
                startButton.classList.add('enabled');
            } else {
                startButton.classList.remove('enabled');
            }
            // Hiệu ứng ripple
            const label = this.parentElement;
            let ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = (e.offsetX || 20) + 'px';
            ripple.style.top = (e.offsetY || 20) + 'px';
            label.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        });
    });
    // Disable nút start nếu chưa tick gì
    startButton.classList.remove('enabled');
}

function startQuiz() {
    if (!selectedMainTopic || selectedSubTopics.length === 0) return;
    selectionSection.style.display = 'none';
    loadingSection.style.display = 'block';
    document.getElementById('loadingText').textContent = `Đang tải dữ liệu...`;
    
    // Hiển thị thông tin chủ đề đã chọn
    const quizSubjectInfoContainer = document.getElementById('quizSubjectInfo');
    if (quizSubjectInfoContainer && selectedMainTopic) {
        quizSubjectInfoContainer.innerHTML = `
            <div class="icon">${selectedMainTopic.icon || '📚'}</div>
            <div class="details">
                <div class="title">${selectedMainTopic.name}</div>
                <div class="subtitle">${selectedMainTopic.subtitle}</div>
            </div>
        `;
        quizSubjectInfoContainer.style.display = 'flex';
    }

    loadMultipleCSVFiles(selectedSubTopics);
}

async function loadMultipleCSVFiles(fileList) {
    try {
        updateLoadingBar(20);
        let allQuestions = [];
        for (let i = 0; i < fileList.length; i++) {
            updateLoadingBar(20 + Math.floor(60 * i / fileList.length));
            const response = await fetch(`data/${fileList[i]}`);
            if (!response.ok) throw new Error(`Không thể tải file ${fileList[i]} (${response.status})`);
            const csvData = await response.text();
            await new Promise(resolve => {
                Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        if (results.errors.length > 0) {
                            throw new Error('Có lỗi khi đọc file CSV: ' + results.errors[0].message);
                        }
                        // Gắn thêm thuộc tính file để biết nguồn chủ đề
                        const valid = results.data.filter(row => row.question && row.question.trim() && row.answer && row.answer.trim()).map(row => ({...row, file: fileList[i]}));
                        allQuestions = allQuestions.concat(valid);
                        resolve();
                    }
                });
            });
        }
        updateLoadingBar(100);
        if (allQuestions.length === 0) throw new Error('Không tìm thấy câu hỏi hợp lệ trong các file đã chọn');
        questions = allQuestions;
        stats = { total: 0, correct: 0, wrong: 0 };
        isAllQuestionsMode = false;
        allQuestionsAnswers = {};
        document.getElementById('totalQuestions').textContent = questions.length;
        updateStats();
        remainingQuestions = [...questions];
        setTimeout(() => {
            loadingSection.style.display = 'none';
            quizContainer.style.display = 'block';
            // Reset về chế độ từng câu
            singleQuestionMode.style.display = 'block';
            allQuestionsMode.style.display = 'none';
            modeSwitchBtn.innerHTML = '<span class="mode-icon">🧙</span><span class="mode-text">Chuyển sang chế độ PHÁP SƯ</span>';
            loadRandomQuestion();
        }, 500);
    } catch (error) {
        loadingSection.innerHTML = `
            <div class="section-title">
                <span>❌</span>
                <span>Lỗi tải dữ liệu</span>
            </div>
            <p style="color: #dc3545; margin: 15px 0; font-size: 1.1em;">${error.message}</p>
            <p style="color: #666; font-size: 0.9em; line-height: 1.5;">
                Vui lòng kiểm tra:<br>
                • File có tồn tại trong thư mục data/<br>
                • File có đúng định dạng với 3 cột: stt, question, answer<br>
                • Đường dẫn file chính xác
            </p>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                <button onclick="backToSelection()" class="btn btn-secondary">
                    ← Quay lại chọn chủ đề
                </button>
                <button onclick="retryLoad()" class="btn btn-primary">
                    🔄 Thử lại
                </button>
            </div>
        `;
    }
}

function backToSelection() {
    quizContainer.style.display = 'none';
    selectionSection.style.display = 'block';
    // Reset các giá trị
    currentQuestion = null;
    selectedAnswer = null;
    stats = { total: 0, correct: 0, wrong: 0 };
    isAllQuestionsMode = false;
    allQuestionsAnswers = {};
    updateStats();
    
    // Reset về chế độ từng câu
    singleQuestionMode.style.display = 'block';
    allQuestionsMode.style.display = 'none';
    modeSwitchBtn.innerHTML = '<span class="mode-icon">📝</span><span class="mode-text">Chế độ từng câu</span>';
}

function retryLoad() {
    if (selectedMainTopic) {
        backToSelection();
        setTimeout(() => startQuiz(), 100);
    }
}

function updateLoadingBar(percentage) {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.width = percentage + '%';
    }
}

function parseQuestionAndAnswers(raw) {
    // Chuẩn hóa xuống dòng thành \n để nhận diện đáp án nhiều dòng
    let text = raw.replace(/\r\n|\r/g, '\n');
    // Tìm vị trí bắt đầu đáp án a.
    let match = text.match(/([aA][\.|\)])\s?/);
    if (!match) return { question: text.trim(), answers: [] };
    let idx = text.indexOf(match[0]);
    let question = text.slice(0, idx).trim();
    let answers = text.slice(idx);
    // Regex 1: nhận diện đáp án ở đầu dòng hoặc sau dấu xuống dòng
    let answerArr = [];
    let usedLabels = {};
    let regex1 = /(^|\n)([a-dA-D][\.|\)])\s*((?:.|\n)*?)(?=(?:\n[a-dA-D][\.|\)])|$)/g;
    let m;
    while ((m = regex1.exec(answers)) !== null) {
        let label = m[2].toUpperCase();
        if (!usedLabels[label] && answerArr.length < 4) {
            answerArr.push(m[3].trim().replace(/\s+/g, ' '));
            usedLabels[label] = true;
        }
    }
    // Nếu không đủ 4 đáp án, thử lại với regex tách liền nhau trên một dòng
    if (answerArr.length < 4) {
        answerArr = [];
        usedLabels = {};
        let regex2 = /([a-dA-D][\.|\)])\s*([^a-dA-D]*)/g;
        let m2;
        while ((m2 = regex2.exec(answers)) !== null && answerArr.length < 4) {
            let label = m2[1].toUpperCase();
            if (!usedLabels[label]) {
                let value = m2[2].replace(/\s+/g, ' ').trim();
                // Loại bỏ nhãn đáp án tiếp theo nếu bị dính vào
                value = value.replace(/([a-dA-D][\.|\)]).*/, '').trim();
                answerArr.push(value);
                usedLabels[label] = true;
            }
        }
    }
    if (answerArr.length < 4) {
        return { question: text.trim(), answers: [] };
    }
    return { question, answers: answerArr };
}

function loadRandomQuestion() {
    // Nếu hết câu hỏi thì chúc mừng
    if (remainingQuestions.length === 0) {
        quizContainer.innerHTML = `
            <div class="result correct" style="font-size:1.5em; padding: 40px;">
                🎉 Chúc mừng bạn đã hoàn thành toàn bộ câu hỏi!<br>Vui lòng tải lại trang (F5) để bắt đầu lại.<br><br>
                <div style='font-size:1em; text-align:left; max-width:400px; margin:24px auto 0 auto; background:rgba(25,118,210,0.06); border-radius:12px; padding:18px 24px;'>
                    <div style='text-align:center; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;'>Kết quả tổng kết:</div>
                    • Tổng số câu: <b>${stats.total}</b><br>
                    • Số câu đúng: <b style='color:#28a745;'>${stats.correct}</b><br>
                    • Số câu sai: <b style='color:#dc3545;'>${stats.wrong}</b><br>
                    • Độ chính xác: <b>${accuracy}%</b>
                </div>
            </div>
        `;
        return;
    }

    // Ẩn nút submit và next
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'none';

    // Chọn câu hỏi ngẫu nhiên từ remainingQuestions
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions[randomIndex];
    // Xóa câu hỏi này khỏi mảng để không lặp lại
    remainingQuestions.splice(randomIndex, 1);
    
    // Reset trạng thái answered cho câu hỏi mới
    currentQuestion.answered = false;
    
    // Hiển thị số thứ tự từ cột stt
    const questionNumber = currentQuestion.stt || '?';
    // Xác định loại chủ đề
    let subLabel = '';
    for (const topic of mainTopics) {
        for (const sub of topic.subTopics) {
            if (sub.file === currentQuestion.file) subLabel = sub.label;
        }
    }
    document.getElementById('questionNumber').textContent = `Câu hỏi #${questionNumber} – ${subLabel}`;
    
    // Phân tích câu hỏi và đáp án
    const parsed = parseQuestionAndAnswers(currentQuestion.question);
    questionText.innerHTML = parsed.question.replace(/\s+/g, ' ').trim();
    
    // Tạo 4 lựa chọn A, B, C, D với nội dung thực tế
    const options = ['A', 'B', 'C', 'D'];
    optionsContainer.innerHTML = '';
    
    options.forEach((option, idx) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.innerHTML = `
            <div class="option-label">${option}</div>
            <div>${parsed.answers[idx] ? parsed.answers[idx] : ''}</div>
        `;
        optionDiv.addEventListener('click', () => selectOption(option, optionDiv));
        optionsContainer.appendChild(optionDiv);
    });
    
    // Reset trạng thái
    selectedAnswer = null;
    result.style.display = 'block';
    
    // Xóa các class highlight
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'auto';
    });
}

function selectOption(option, optionElement) {
    // Xóa selection cũ
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Chọn option mới
    optionElement.classList.add('selected');
    selectedAnswer = option;
    
    // Hiển thị kết quả ngay lập tức
    showResult();
}

function showResult() {
    const correctAnswer = currentQuestion.answer.trim().toUpperCase();
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Cập nhật thống kê chỉ nếu câu hỏi chưa được trả lời
    if (!currentQuestion.answered) {
        stats.total++;
        if (isCorrect) {
            stats.correct++;
        } else {
            stats.wrong++;
        }
        currentQuestion.answered = true;
        updateStats();
    }
    
    // Hiển thị kết quả
    document.querySelectorAll('.option').forEach(opt => {
        const optionLabel = opt.querySelector('.option-label').textContent;
        if (optionLabel === correctAnswer) {
            opt.classList.add('correct');
        } else if (optionLabel === selectedAnswer && !isCorrect) {
            opt.classList.add('incorrect');
        }
        opt.style.pointerEvents = 'none';
    });
    
    // Hiển thị thông báo kết quả
    result.style.display = 'block';
    result.innerHTML = '';
    
    // Kiểm tra nếu hết câu hỏi thì hiển thị chúc mừng và tổng kết
    if (remainingQuestions.length === 0) {
        setTimeout(() => {
            const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            quizContainer.innerHTML = `
                <div class="result correct" style="font-size:1.5em; padding: 40px;">
                    🎉 Chúc mừng bạn đã hoàn thành toàn bộ câu hỏi!<br>Vui lòng tải lại trang (F5) để bắt đầu lại.<br><br>
                    <div style='font-size:1em; max-width:400px; margin:24px auto 0 auto; background:rgba(25,118,210,0.06); border-radius:12px; padding:18px 24px;'>
                        <div style='text-align:center; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;'>Kết quả tổng kết:</div>
                        • Tổng số câu: <b>${stats.total}</b><br>
                        • Số câu đúng: <b style='color:#28a745;'>${stats.correct}</b><br>
                        • Số câu sai: <b style='color:#dc3545;'>${stats.wrong}</b><br>
                        • Độ chính xác: <b>${accuracy}%</b>
                    </div>
                </div>
            `;
        }, 1200);
        nextBtn.style.display = 'none';
    } else {
        // Hiển thị nút next
        nextBtn.style.display = 'inline-block';
    }
}

function submitAnswer() {
    // Hàm này không còn cần thiết, nhưng giữ lại để tránh lỗi
    if (!selectedAnswer) return;
    showResult();
}

function nextQuestion() {
    if (remainingQuestions.length === 0) return; // Đã hết câu hỏi, không làm gì nữa
    loadRandomQuestion();
}

function updateStats() {
    document.getElementById('correctAnswers').textContent = stats.correct;
    document.getElementById('wrongAnswers').textContent = stats.wrong;
    
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

function toggleDisplayMode() {
    isAllQuestionsMode = !isAllQuestionsMode;

    // Reset bộ đếm khi chuyển chế độ
    stats = { total: 0, correct: 0, wrong: 0 };
    updateStats();

    // Reset đáp án đã chọn và trạng thái đúng/sai
    allQuestionsAnswers = {};
    if (questions && questions.length > 0) {
        questions.forEach(q => q.answered = false);
    }

    // Ẩn/hiện nút vào phòng thi và khu vực thống kê
    if (isAllQuestionsMode) {
        if (onlineExamBtn) onlineExamBtn.style.display = 'none';
        if (statsDiv) statsDiv.style.display = 'none';
        // Chuyển sang chế độ phép thuật
        singleQuestionMode.style.display = 'none';
        allQuestionsMode.style.display = 'block';
        modeSwitchBtn.innerHTML = '<span class="mode-icon">📝</span><span class="mode-text">Chuyển sang chế độ ÔN TẬP</span>';
        renderAllQuestions();
    } else {
        if (onlineExamBtn) onlineExamBtn.style.display = '';
        if (statsDiv) statsDiv.style.display = '';
        // Chuyển về chế độ từng câu
        allQuestionsMode.style.display = 'none';
        singleQuestionMode.style.display = 'block';
        modeSwitchBtn.innerHTML = '<span class="mode-icon">🧙</span><span class="mode-text">Chuyển sang chế độ pháp sư</span>';
        // Reset lại trạng thái ôn tập
        remainingQuestions = [...questions];
        currentQuestion = null;
        loadRandomQuestion();
    }
}

function renderAllQuestions(filterText = '') {
    if (!questions || questions.length === 0) return;
    
    allQuestionsList.innerHTML = '';
    
    // Lọc câu hỏi theo nội dung nếu có filterText
    let filteredQuestions = questions;
    if (filterText && filterText.trim() !== '') {
        const keyword = filterText.trim().toLowerCase();
        filteredQuestions = questions.filter(q => {
            const parsed = parseQuestionAndAnswers(q.question);
            return parsed.question.toLowerCase().includes(keyword);
        });
    }
    
    filteredQuestions.forEach((question, index) => {
        const parsed = parseQuestionAndAnswers(question.question);
        const questionNumber = question.stt || (index + 1);
        
        // Xác định loại chủ đề
        let subLabel = '';
        for (const topic of mainTopics) {
            for (const sub of topic.subTopics) {
                if (sub.file === question.file) subLabel = sub.label;
            }
        }
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-item-header">
                <span class="question-item-number">Câu hỏi #${questionNumber}</span>
                <span class="question-item-subject">${subLabel}</span>
            </div>
            <div class="question-item-text">${parsed.question.replace(/\s+/g, ' ').trim()}</div>
            <div class="question-item-options">
                ${['A', 'B', 'C', 'D'].map((option, idx) => `
                    <div class="question-item-option" data-question="${index}" data-option="${option}">
                        <span class="question-item-option-label">${option}</span>
                        <span>${parsed.answers[idx] ? parsed.answers[idx] : ''}</span>
                    </div>
                `).join('')}
            </div>
            <div class="question-item-result" id="result-${index}"></div>
        `;
        
        allQuestionsList.appendChild(questionDiv);
        
        // Thêm event listeners cho các option
        const options = questionDiv.querySelectorAll('.question-item-option');
        options.forEach(option => {
            option.addEventListener('click', () => selectAllQuestionsOption(option, question, index));
        });
        
        // Hiển thị đáp án đã chọn trước đó nếu có
        if (allQuestionsAnswers[question.stt]) {
            const selectedOption = questionDiv.querySelector(`[data-option="${allQuestionsAnswers[question.stt]}"]`);
            if (selectedOption) {
                showAllQuestionsResult(selectedOption, question, index);
            }
        }
        // Nếu bật chế độ hiển thị đáp án đúng, luôn highlight đáp án đúng và disable chọn đáp án
        if (isShowAllAnswers) {
            const correctAnswer = question.answer.trim().toUpperCase();
            const correctOption = questionDiv.querySelector(`[data-option="${correctAnswer}"]`);
            if (correctOption) {
                correctOption.classList.add('correct');
            }
            // Disable chọn đáp án cho tất cả option
            questionDiv.querySelectorAll('.question-item-option').forEach(opt => {
                opt.style.pointerEvents = 'none';
            });
        } else {
            // Cho phép chọn lại đáp án khi tắt chế độ hiển thị đáp án đúng
            questionDiv.querySelectorAll('.question-item-option').forEach(opt => {
                opt.style.pointerEvents = '';
                opt.style.opacity = '';
            });
        }
    });
}

function selectAllQuestionsOption(optionElement, question, questionIndex) {
    const selectedOption = optionElement.getAttribute('data-option');
    const questionDiv = optionElement.closest('.question-item');
    
    // Xóa selection cũ trong câu hỏi này
    questionDiv.querySelectorAll('.question-item-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Chọn option mới
    optionElement.classList.add('selected');
    
    // Lưu đáp án đã chọn theo stt (duy nhất cho mỗi câu)
    allQuestionsAnswers[question.stt] = selectedOption;
    
    // Hiển thị kết quả ngay lập tức
    showAllQuestionsResult(optionElement, question, questionIndex);
}

function showAllQuestionsResult(optionElement, question, questionIndex) {
    const correctAnswer = question.answer.trim().toUpperCase();
    const selectedAnswer = optionElement.getAttribute('data-option');
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Chỉ cập nhật bộ đếm nếu chưa từng trả lời câu này
    if (!question.answered) {
        stats.total++;
        if (isCorrect) {
            stats.correct++;
        } else {
            stats.wrong++;
        }
        question.answered = true;
        updateStats();
    }
    
    // Hiển thị kết quả cho tất cả options trong câu hỏi này
    const questionDiv = optionElement.closest('.question-item');
    questionDiv.querySelectorAll('.question-item-option').forEach(opt => {
        const optionLabel = opt.getAttribute('data-option');
        opt.style.pointerEvents = 'none';
        
        if (optionLabel === correctAnswer) {
            opt.classList.add('correct');
        } else if (optionLabel === selectedAnswer && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // Không hiển thị thông báo kết quả
    const resultDiv = questionDiv.querySelector('.question-item-result');
    resultDiv.style.display = 'none';
}

if (allQuestionsSearchInput) {
    allQuestionsSearchInput.addEventListener('input', function() {
        renderAllQuestions(this.value);
    });
}
if (showAllAnswersBtn) {
    showAllAnswersBtn.addEventListener('click', function() {
        isShowAllAnswers = !isShowAllAnswers;
        showAllAnswersBtn.classList.toggle('active', isShowAllAnswers);
        showAllAnswersBtn.textContent = isShowAllAnswers ? 'Ẩn đáp án đúng' : 'Hiển thị đáp án đúng';
        renderAllQuestions(allQuestionsSearchInput ? allQuestionsSearchInput.value : '');
    });
} 