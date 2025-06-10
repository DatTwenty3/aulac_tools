// Danh sách các chủ đề và file tương ứng
const topics = [
    {
        title: "Cầu - Hầm, Pháp luật chung",
        subtitle: "Thiết kế xây dựng công trình - Công trình Cầu - Hầm - Hạng II",
        file: "Hamcau_PLC.csv",
        icon: "🌉"
    },
    {
        title: "Cầu - Hầm, Pháp luật riêng", 
        subtitle: "Thiết kế xây dựng công trình - Công trình Cầu - Hầm - Hạng II",
        file: "Hamcau_PLR.csv",
        icon: "🌉"
    },
    {
        title: "Cầu - Hầm, Chuyên môn", 
        subtitle: "Thiết kế xây dựng công trình - Công trình Cầu - Hầm - Hạng II",
        file: "Hamcau_CM.csv",
        icon: "🌉"
    },
    {
        title: "Định giá, Pháp luật chung", 
        subtitle: "Định giá xây dựng - Hạng II",
        file: "Dinhgia_PLC.csv",
        icon: "💰"
    },
    {
        title: "Định giá, Pháp luật riêng", 
        subtitle: "Định giá xây dựng - Hạng II",
        file: "Dinhgia_PLR.csv",
        icon: "💰"
    },
    {
        title: "Định giá, Chuyên môn", 
        subtitle: "Định giá xây dựng - Hạng II",
        file: "Dinhgia_CM.csv",
        icon: "💰"
    },
    {
        title: "Khảo sát địa hình, Pháp luật chung", 
        subtitle: "Khảo sát địa hình - Hạng II",
        file: "Khaosatdiahinh_PLC.csv",
        icon: "🔍"
    },
    {
        title: "Khảo sát địa hình, Pháp luật riêng", 
        subtitle: "Khảo sát địa hình - Hạng II",
        file: "Khaosatdiahinh_PLR.csv",
        icon: "🔍"
    },
    {
        title: "Khảo sát địa hình, Chuyên môn", 
        subtitle: "Khảo sát địa hình - Hạng II",
        file: "Khaosatdiahinh_CM.csv",
        icon: "🔍"
    },
    {
        title: "Khảo sát địa chất, Pháp luật chung", 
        subtitle: "Khảo sát địa chất - Hạng III",
        file: "Khaosatdiachat_PLC.csv",
        icon: "💎"
    },
    {
        title: "Khảo sát địa chất, Pháp luật riêng", 
        subtitle: "Khảo sát địa chất - Hạng III",
        file: "Khaosatdiachat_PLR.csv",
        icon: "💎"
    },
    {
        title: "Khảo sát địa chất, Chuyên môn", 
        subtitle: "Khảo sát địa chất - Hạng III",
        file: "Khaosatdiachat_CM.csv",
        icon: "💎"
    }    
];

let questions = [];
let currentQuestion = null;
let selectedAnswer = null;
let currentTopic = null;
let stats = {
    total: 0,
    correct: 0,
    wrong: 0
};

let remainingQuestions = [];

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

// Khởi tạo dropdown và events
window.addEventListener('load', initializeDropdown);
submitBtn.addEventListener('click', submitAnswer);
nextBtn.addEventListener('click', nextQuestion);
startButton.addEventListener('click', startQuiz);

// Đóng dropdown khi click bên ngoài
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select')) {
        selectOptions.classList.remove('show');
        selectStyled.classList.remove('active');
    }
});

function initializeDropdown() {
    // Tạo options cho dropdown
    selectOptions.innerHTML = '';
    topics.forEach((topic, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'select-option';
        optionDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span class="option-icon" style="font-size: 2em; display: flex; align-items: flex-start; font-style: normal;">${topic.icon}</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: #222; font-style: normal;">${topic.title}</span>
                    <span style="font-size: 0.98em; color: #888; font-style: normal;">${topic.subtitle}</span>
                </div>
            </div>
        `;
        optionDiv.addEventListener('click', () => selectTopic(topic, index));
        selectOptions.appendChild(optionDiv);
    });

    // Event cho dropdown toggle
    selectStyled.addEventListener('click', function() {
        selectOptions.classList.toggle('show');
        selectStyled.classList.toggle('active');
    });
}

function selectTopic(topic, index) {
    currentTopic = topic;
    
    // Cập nhật hiển thị dropdown
    selectStyled.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span class="option-icon" style="font-size: 2em; display: flex; align-items: flex-start; font-style: normal;">${topic.icon}</span>
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600; color: #222; font-style: normal;">${topic.title}</span>
                <span style="font-size: 0.98em; color: #888; font-style: normal;">${topic.subtitle}</span>
            </div>
        </div>
    `;
    
    // Đóng dropdown
    selectOptions.classList.remove('show');
    selectStyled.classList.remove('active');
    
    // Enable nút start
    startButton.classList.add('enabled');
}

function startQuiz() {
    if (!currentTopic) return;
    
    selectionSection.style.display = 'none';
    loadingSection.style.display = 'block';
    document.getElementById('loadingText').textContent = `Đang tải dữ liệu...`;
    loadCSVFile(currentTopic.file);
}

async function loadCSVFile(filename) {
    try {
        // Hiệu ứng loading
        updateLoadingBar(20);
        
        const response = await fetch(`data/${filename}`);
        if (!response.ok) {
            throw new Error(`Không thể tải file ${filename} (${response.status})`);
        }
        
        updateLoadingBar(50);
        
        const csvData = await response.text();
        updateLoadingBar(70);
        
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                updateLoadingBar(90);
                
                if (results.errors.length > 0) {
                    throw new Error('Có lỗi khi đọc file CSV: ' + results.errors[0].message);
                }
                
                questions = results.data.filter(row => 
                    row.question && row.question.trim() && 
                    row.answer && row.answer.trim()
                );
                
                if (questions.length === 0) {
                    throw new Error('Không tìm thấy câu hỏi hợp lệ trong file CSV');
                }

                updateLoadingBar(100);
                
                // Reset thống kê
                stats = { total: 0, correct: 0, wrong: 0 };
                
                // Cập nhật thống kê
                document.getElementById('totalQuestions').textContent = questions.length;
                updateStats();
                
                // Khởi tạo mảng câu hỏi chưa làm
                remainingQuestions = [...questions];
                
                // Hiển thị quiz sau một chút delay
                setTimeout(() => {
                    loadingSection.style.display = 'none';
                    quizContainer.style.display = 'block';
                    loadRandomQuestion();
                }, 500);
            }
        });
    } catch (error) {
        // Hiển thị lỗi
        loadingSection.innerHTML = `
            <div class="section-title">
                <span>❌</span>
                <span>Lỗi tải dữ liệu</span>
            </div>
            <p style="color: #dc3545; margin: 15px 0; font-size: 1.1em;">${error.message}</p>
            <p style="color: #666; font-size: 0.9em; line-height: 1.5;">
                Vui lòng kiểm tra:<br>
                • File ${filename} có tồn tại trong thư mục data/<br>
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
    loadingSection.style.display = 'none';
    quizContainer.style.display = 'none';
    selectionSection.style.display = 'block';
    
    // Reset loading section
    loadingSection.innerHTML = `
        <div class="section-title">
            <span>⏳</span>
            <span>Đang tải dữ liệu...</span>
        </div>
        <p class="loading-text" id="loadingText">Đang đọc dữ liệu...</p>
        <div class="loading-bar-container">
            <div class="loading-bar" id="loadingBar"></div>
        </div>
    `;
}

function retryLoad() {
    if (currentTopic) {
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

function formatQuestionText(raw) {
    // Chuẩn hóa xuống dòng thành 1 dòng
    let text = raw.replace(/\r\n|\r|\n/g, ' ');

    // Tìm vị trí bắt đầu đáp án a.
    let match = text.match(/([aA][\.|\)]\s)/);
    if (!match) return text.trim();

    let idx = text.indexOf(match[0]);
    let question = text.slice(0, idx).trim();
    let answers = text.slice(idx);

    // Tách đáp án, chỉ lấy đúng 4 đáp án a, b, c, d (không lặp, không trùng)
    let answerArr = [];
    let usedLabels = {};
    let regex = /([a-dA-D][\.|\)])\s(.*?)(?= [a-dA-D][\.|\)]|$)/g;
    let m;
    while ((m = regex.exec(answers)) !== null) {
        let label = m[1].toLowerCase();
        if (!usedLabels[label] && answerArr.length < 4) {
            answerArr.push(`<b>${m[1].toLowerCase()}</b> ${m[2].trim()}`);
            usedLabels[label] = true;
        }
    }

    // Nếu không đủ 4 đáp án, fallback về tách cũ
    if (answerArr.length < 4) {
        return text.replace(/([a-d]\.)/gi, '<br><b>$1</b>').replace(/^<br>/, '').trim();
    }

    return `<div style="margin-bottom:10px;">${question}</div>` + answerArr.map(a => `<div style="margin-bottom:4px;">${a}</div>`).join('');
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

    // Luôn reset lại nút xác nhận đáp án
    submitBtn.style.display = 'inline-block';
    submitBtn.disabled = true;
    nextBtn.style.display = 'none';

    // Chọn câu hỏi ngẫu nhiên từ remainingQuestions
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion = remainingQuestions[randomIndex];
    // Xóa câu hỏi này khỏi mảng để không lặp lại
    remainingQuestions.splice(randomIndex, 1);
    
    // Hiển thị số thứ tự từ cột stt
    const questionNumber = currentQuestion.stt || '?';
    document.getElementById('questionNumber').textContent = `Câu hỏi #${questionNumber}`;
    
    // Hiển thị câu hỏi với định dạng đẹp
    questionText.innerHTML = formatQuestionText(currentQuestion.question);
    
    // Tạo 4 lựa chọn A, B, C, D
    const options = ['A', 'B', 'C', 'D'];
    optionsContainer.innerHTML = '';
    
    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.innerHTML = `
            <div class="option-label">${option}</div>
            <div>Lựa chọn ${option}</div>
        `;
        optionDiv.addEventListener('click', () => selectOption(option, optionDiv));
        optionsContainer.appendChild(optionDiv);
    });
    
    // Reset trạng thái
    selectedAnswer = null;
    result.style.display = 'none';
    
    // Xóa các class highlight
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
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
    submitBtn.disabled = false;
}

function submitAnswer() {
    if (!selectedAnswer) return;
    
    const correctAnswer = currentQuestion.answer.trim().toUpperCase();
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Cập nhật thống kê
    stats.total++;
    if (isCorrect) {
        stats.correct++;
    } else {
        stats.wrong++;
    }
    updateStats();
    
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
    if (isCorrect) {
        result.className = 'result correct';
        result.innerHTML = '🎉 Chính xác! Đáp án đúng là: ' + correctAnswer;
    } else {
        result.className = 'result incorrect';
        result.innerHTML = '❌ Sai rồi! Đáp án đúng là: ' + correctAnswer;
    }
    
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
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        // Hiển thị nút next
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'inline-block';
    }
}

function nextQuestion() {
    if (remainingQuestions.length === 0) return; // Đã hết câu hỏi, không làm gì nữa
    loadRandomQuestion();
    submitBtn.style.display = 'inline-block';
    document.querySelectorAll('.option').forEach(opt => {
        opt.style.pointerEvents = 'auto';
    });
}

function updateStats() {
    document.getElementById('correctAnswers').textContent = stats.correct;
    document.getElementById('wrongAnswers').textContent = stats.wrong;
    
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
} 