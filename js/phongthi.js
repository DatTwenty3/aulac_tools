// phongthi.js - Xử lý logic thi trực tuyến
document.addEventListener('DOMContentLoaded', function() {
    const selectStyled = document.getElementById('selectStyled');
    const selectOptions = document.getElementById('selectOptions');
    const startButton = document.getElementById('startButton');
    const selectPlaceholder = selectStyled.querySelector('.select-placeholder');
    const selectionSection = document.getElementById('selectionSection');
    const examSection = document.getElementById('examSection');
    const resultSection = document.getElementById('resultSection');
    const questionsContainer = document.getElementById('questionsContainer');
    const timerValue = document.getElementById('timerValue');
    const submitButton = document.getElementById('submitButton');

    // Danh sách các môn thi
    const subjects = [
        { 
            id: 'hamcau',
            title: 'Cầu - Hầm',
            subtitle: 'Thi chứng chỉ hành nghề Cầu - Hầm',
            files: {
                law: ['data/Hamcau_PLC.csv', 'data/Hamcau_PLR.csv'],
                specialized: ['data/Hamcau_CM.csv']
            }
        },
        { 
            id: 'diahinh',
            title: 'Địa hình, địa chất công trình',
            subtitle: 'Thi chứng chỉ hành nghề Địa hình, địa chất công trình',
            files: {
                law: ['data/Diahinh_PLC.csv', 'data/Diahinh_PLR.csv'],
                specialized: ['data/Diahinh_CM.csv']
            }
        },
        { 
            id: 'dinhgia',
            title: 'Định giá xây dựng',
            subtitle: 'Thi chứng chỉ hành nghề Định giá xây dựng',
            files: {
                law: ['data/Dinhgia_PLC.csv', 'data/Dinhgia_PLR.csv'],
                specialized: ['data/Dinhgia_CM.csv']
            }
        }
    ];

    // Tạo danh sách chọn môn thi
    subjects.forEach(subject => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.innerHTML = `
            <div class="option-icon">📚</div>
            <div class="option-content">
                <div class="option-title">${subject.title}</div>
                <div class="option-subtitle">${subject.subtitle}</div>
            </div>
        `;
        option.addEventListener('click', () => {
            selectPlaceholder.textContent = subject.title;
            selectStyled.classList.remove('active');
            selectOptions.classList.remove('show');
            startButton.classList.add('enabled');
            startButton.dataset.subjectId = subject.id;
        });
        selectOptions.appendChild(option);
    });

    // Xử lý sự kiện khi click vào select-styled
    selectStyled.addEventListener('click', function() {
        selectStyled.classList.toggle('active');
        selectOptions.classList.toggle('show');
    });

    // Biến lưu trữ câu hỏi và đáp án
    let questions = [];
    let selectedAnswers = {};
    let timeLeft = 30 * 60; // 30 phút
    let timerInterval;
    let totalTime = 30 * 60; // 30 phút, lưu lại để tính thời gian làm bài

    // Hàm đọc file CSV
    async function readCSVFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                download: true,
                header: true,
                complete: function(results) {
                    resolve(results.data);
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    }

    // Hàm chọn ngẫu nhiên câu hỏi
    function getRandomQuestions(questions, count) {
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Hàm định dạng lại câu hỏi và đáp án từ 1 chuỗi (copy từ tracnghiem.js)
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

    // Hàm tạo câu hỏi
    function createQuestionElement(question, index) {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerHTML = `
            <div class="question-header">
                <div class="question-number">Câu ${index + 1}</div>
                <div class="question-type">${question.type === 'law' ? 'Pháp luật' : 'Chuyên môn'}</div>
            </div>
            <div class="question-text">${formatQuestionText(question.question)}</div>
            <div class="options-grid">
                <div class="option-item" data-option="A">
                    <div class="option-label">A</div>
                    <div class="option-desc">Lựa chọn A</div>
                </div>
                <div class="option-item" data-option="B">
                    <div class="option-label">B</div>
                    <div class="option-desc">Lựa chọn B</div>
                </div>
                <div class="option-item" data-option="C">
                    <div class="option-label">C</div>
                    <div class="option-desc">Lựa chọn C</div>
                </div>
                <div class="option-item" data-option="D">
                    <div class="option-label">D</div>
                    <div class="option-desc">Lựa chọn D</div>
                </div>
            </div>
        `;

        // Xử lý sự kiện chọn đáp án
        const optionItems = questionCard.querySelectorAll('.option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', () => {
                optionItems.forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');
                selectedAnswers[index] = item.dataset.option;
            });
        });

        return questionCard;
    }

    // Hàm cập nhật đồng hồ
    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
        timeLeft--;
    }

    // Hàm nộp bài
    function submitExam() {
        clearInterval(timerInterval);
        
        // Tính điểm
        let lawScore = 0;
        let specializedScore = 0;
        
        questions.forEach((question, index) => {
            const selectedAnswer = selectedAnswers[index];
            if (selectedAnswer === question.answer) {
                if (question.type === 'law') {
                    lawScore++;
                } else {
                    specializedScore++;
                }
            }
        });

        const totalScore = lawScore + specializedScore;

        // Hiển thị kết quả
        document.getElementById('totalScore').textContent = `${totalScore}/30`;
        document.getElementById('lawScore').textContent = `${lawScore}/10`;
        document.getElementById('specializedScore').textContent = `${specializedScore}/20`;

        // Hiển thị đáp án đúng/sai
        questions.forEach((question, index) => {
            const questionCard = questionsContainer.children[index];
            const optionItems = questionCard.querySelectorAll('.option-item');
            
            optionItems.forEach(item => {
                const option = item.dataset.option;
                if (option === question.answer) {
                    item.classList.add('correct');
                } else if (option === selectedAnswers[index] && option !== question.answer) {
                    item.classList.add('incorrect');
                }
            });
        });

        // Hiển thị phần kết quả
        examSection.style.display = 'none';
        resultSection.style.display = 'block';

        // Thêm nút xem lại bài làm nếu chưa có
        if (!document.getElementById('reviewButton')) {
            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'btn-phongthi';
            reviewBtn.id = 'reviewButton';
            reviewBtn.textContent = 'Xem lại bài làm';
            reviewBtn.onclick = function() {
                showReview();
            };
            document.querySelector('.result-actions').appendChild(reviewBtn);
        }

        // Tính thời gian làm bài
        const timeUsedSec = totalTime - timeLeft - 1;
        const min = Math.floor(timeUsedSec / 60);
        const sec = timeUsedSec % 60;
        document.getElementById('timeUsed').textContent = `${min} phút ${sec.toString().padStart(2, '0')} giây`;
    }

    // Hàm hiển thị lại bài làm
    function showReview() {
        resultSection.style.display = 'none';
        examSection.style.display = 'block';
        // Render lại các câu hỏi với trạng thái đáp án đã chọn
        questions.forEach((question, index) => {
            const questionCard = questionsContainer.children[index];
            const optionItems = questionCard.querySelectorAll('.option-item');
            optionItems.forEach(item => {
                item.classList.remove('selected', 'correct', 'incorrect', 'correct-full', 'incorrect-full');
                const option = (item.dataset.option || '').trim().toUpperCase();
                const answer = (question.answer || '').trim().toUpperCase();
                const selected = (selectedAnswers[index] || '').trim().toUpperCase();
                // Luôn tô xanh lá đáp án đúng
                if (option === answer) {
                    item.classList.add('correct-full');
                }
                // Nếu chọn sai thì tô đỏ đáp án đã chọn
                if (selected !== answer && option === selected) {
                    item.classList.add('incorrect-full');
                }
            });
        });
        // Ẩn nút nộp bài khi xem lại
        submitButton.style.display = 'none';
        // Thêm nút quay về tổng kết nếu chưa có
        if (!document.getElementById('backToResultBtn')) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.marginTop = '32px';
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-phongthi';
            backBtn.id = 'backToResultBtn';
            backBtn.textContent = 'Quay về trang tổng kết';
            backBtn.onclick = function() {
                examSection.style.display = 'none';
                resultSection.style.display = 'block';
                submitButton.style.display = '';
                // Xóa nút khi quay lại
                if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            };
            wrapper.appendChild(backBtn);
            examSection.appendChild(wrapper);
        }
        // Cuộn lên đầu
        window.scrollTo({top: 0, behavior: 'smooth'});
    }

    // Xử lý sự kiện khi click vào nút bắt đầu thi
    startButton.addEventListener('click', async function() {
        if (!startButton.classList.contains('enabled')) return;

        const subjectId = startButton.dataset.subjectId;
        const subject = subjects.find(s => s.id === subjectId);

        try {
            // Đọc câu hỏi pháp luật
            let lawQuestions = [];
            for (const file of subject.files.law) {
                const data = await readCSVFile(file);
                lawQuestions = lawQuestions.concat(data);
            }
            lawQuestions = getRandomQuestions(lawQuestions, 10);

            // Đọc câu hỏi chuyên môn
            const specializedData = await readCSVFile(subject.files.specialized[0]);
            const specializedQuestions = getRandomQuestions(specializedData, 20);

            // Gộp câu hỏi
            questions = [
                ...lawQuestions.map(q => ({ ...q, type: 'law' })),
                ...specializedQuestions.map(q => ({ ...q, type: 'specialized' }))
            ];

            // Tạo giao diện câu hỏi
            questionsContainer.innerHTML = '';
            questions.forEach((question, index) => {
                const questionElement = createQuestionElement(question, index);
                questionsContainer.appendChild(questionElement);
            });

            // Hiển thị phần thi
            selectionSection.style.display = 'none';
            examSection.style.display = 'block';

            // Bắt đầu đếm ngược
            timeLeft = 30 * 60;
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);

        } catch (error) {
            console.error('Lỗi khi tải câu hỏi:', error);
            alert('Có lỗi xảy ra khi tải câu hỏi. Vui lòng thử lại sau.');
        }
    });

    // Xử lý sự kiện khi click vào nút nộp bài
    submitButton.addEventListener('click', submitExam);
}); 